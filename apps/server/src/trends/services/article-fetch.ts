import { EVENT_CONTENT_REDIRECT_LIMIT } from "./event-work-budget";

export const CONTENT_FETCH_TIMEOUT_MS = 12_000;
// Big news pages (Tom's Hardware, Wired) ship about 2 MB of HTML, most of it
// inline scripts. Anything past this is cut off rather than buffered whole.
export const MAX_ARTICLE_HTML_BYTES = 3 * 1024 * 1024;

const USER_AGENT =
	"OpenTrendsBot/1.0 (+https://opentrends.x-cmd.com; event aggregation)";
const HTML_CONTENT_TYPE = /^\s*(?:text\/html|application\/xhtml\+xml)\b/i;
const HTTP_PROTOCOL = /^https?:$/;

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface ArticlePage {
	html: string;
	truncated: boolean;
	url: string;
}

export interface FetchArticleOptions {
	fetchImpl?: FetchLike;
	maxBytes?: number;
	timeoutMs?: number;
}

/** A fetch failure with a short message that is safe to store on the row. */
export class ArticleFetchError extends Error {
	readonly restricted: boolean;

	constructor(message: string, options: { restricted?: boolean } = {}) {
		super(message);
		this.name = "ArticleFetchError";
		this.restricted = options.restricted ?? false;
	}
}

type PageResponse = { page: ArticlePage } | { redirectTo: string | null };

async function discardBody(response: Response): Promise<void> {
	try {
		await response.body?.cancel();
	} catch {
		// The body is being thrown away; a failed cancel changes nothing.
	}
}

async function readBoundedText(
	response: Response,
	maxBytes: number
): Promise<{ text: string; truncated: boolean }> {
	const reader = response.body?.getReader();
	if (!reader) {
		return { text: "", truncated: false };
	}
	const decoder = new TextDecoder();
	const parts: string[] = [];
	let received = 0;
	while (received < maxBytes) {
		const { done, value } = await reader.read();
		if (done) {
			parts.push(decoder.decode());
			return { text: parts.join(""), truncated: false };
		}
		const chunk = value.subarray(0, maxBytes - received);
		received += chunk.byteLength;
		parts.push(decoder.decode(chunk, { stream: true }));
	}
	await reader.cancel().catch(() => undefined);
	parts.push(decoder.decode());
	return { text: parts.join(""), truncated: true };
}

function toHttpUrl(url: string, base?: string): string {
	const parsed = new URL(url, base);
	if (!HTTP_PROTOCOL.test(parsed.protocol)) {
		throw new ArticleFetchError(`unsupported scheme ${parsed.protocol}`);
	}
	return parsed.toString();
}

function isAbort(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.name === "TimeoutError" || error.name === "AbortError")
	);
}

async function requestPage(
	url: string,
	fetchImpl: FetchLike,
	maxBytes: number,
	timeoutMs: number
): Promise<PageResponse> {
	const response = await fetchImpl(url, {
		headers: {
			Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
			"User-Agent": USER_AGENT,
		},
		redirect: "manual",
		// Covers the body read too, not just the response headers.
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (response.status === 401 || response.status === 403) {
		await discardBody(response);
		throw new ArticleFetchError("restricted", { restricted: true });
	}
	if (response.status >= 300 && response.status < 400) {
		await discardBody(response);
		return { redirectTo: response.headers.get("Location") };
	}
	if (!response.ok) {
		await discardBody(response);
		throw new ArticleFetchError(`HTTP ${response.status}`);
	}
	const contentType = response.headers.get("Content-Type");
	if (contentType && !HTML_CONTENT_TYPE.test(contentType)) {
		await discardBody(response);
		const mediaType = contentType.split(";")[0]?.trim();
		throw new ArticleFetchError(`unsupported content type ${mediaType}`);
	}
	const { text, truncated } = await readBoundedText(response, maxBytes);
	return { page: { html: text, truncated, url } };
}

/**
 * Fetches an article page, following at most EVENT_CONTENT_REDIRECT_LIMIT
 * redirects by hand so the subrequest budget in event-work-budget.ts holds.
 * 401/403 answers are "restricted" (paywalls, bot walls); every other failure
 * throws an ArticleFetchError with a short reason.
 */
export async function fetchArticleHtml(
	url: string,
	options: FetchArticleOptions = {}
): Promise<ArticlePage> {
	const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
	const maxBytes = options.maxBytes ?? MAX_ARTICLE_HTML_BYTES;
	const timeoutMs = options.timeoutMs ?? CONTENT_FETCH_TIMEOUT_MS;
	let currentUrl = toHttpUrl(url);
	for (let redirects = 0; ; redirects += 1) {
		let result: PageResponse;
		try {
			result = await requestPage(currentUrl, fetchImpl, maxBytes, timeoutMs);
		} catch (error) {
			if (isAbort(error)) {
				throw new ArticleFetchError("timeout");
			}
			throw error;
		}
		if ("page" in result) {
			return result.page;
		}
		if (!result.redirectTo || redirects >= EVENT_CONTENT_REDIRECT_LIMIT) {
			throw new ArticleFetchError("redirect_limit");
		}
		currentUrl = toHttpUrl(result.redirectTo, currentUrl);
	}
}
