import { describe, expect, test } from "bun:test";

import {
	ArticleFetchError,
	type FetchLike,
	fetchArticleHtml,
} from "../services/article-fetch";
import { EVENT_CONTENT_REDIRECT_LIMIT } from "../services/event-work-budget";

const PAGE_URL = "https://news.example.com/story";
const HTML = "<html><body><p>Hello</p></body></html>";

interface Call {
	init: RequestInit;
	url: string;
}

function fakeFetch(
	respond: (url: string, callIndex: number) => Response | Promise<Response>
): { calls: Call[]; fetchImpl: FetchLike } {
	const calls: Call[] = [];
	return {
		calls,
		fetchImpl: async (url, init) => {
			calls.push({ url, init });
			return await respond(url, calls.length - 1);
		},
	};
}

function htmlResponse(body: BodyInit, status = 200): Response {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function redirect(location: string, status = 301): Response {
	return new Response(null, { status, headers: { Location: location } });
}

async function fetchError(
	promise: Promise<unknown>
): Promise<ArticleFetchError> {
	try {
		await promise;
	} catch (error) {
		if (error instanceof ArticleFetchError) {
			return error;
		}
		throw error;
	}
	throw new Error("expected fetchArticleHtml to fail");
}

describe("fetchArticleHtml", () => {
	test("returns the page and asks for HTML without following redirects itself", async () => {
		const { calls, fetchImpl } = fakeFetch(() => htmlResponse(HTML));

		const page = await fetchArticleHtml(PAGE_URL, { fetchImpl });

		expect(page).toEqual({ html: HTML, truncated: false, url: PAGE_URL });
		expect(calls).toHaveLength(1);
		expect(calls[0]?.init.redirect).toBe("manual");
		expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
		const headers = new Headers(calls[0]?.init.headers);
		expect(headers.get("User-Agent")).toContain("OpenTrendsBot");
		expect(headers.get("Accept")).toContain("text/html");
	});

	test("follows relative redirects and reports the final URL", async () => {
		const { calls, fetchImpl } = fakeFetch((_url, index) =>
			index === 0 ? redirect("/amp/story", 302) : htmlResponse(HTML)
		);

		const page = await fetchArticleHtml(PAGE_URL, { fetchImpl });

		expect(page.url).toBe("https://news.example.com/amp/story");
		expect(calls.map((call) => call.url)).toEqual([
			PAGE_URL,
			"https://news.example.com/amp/story",
		]);
	});

	test("stops after the redirect budget", async () => {
		const { calls, fetchImpl } = fakeFetch((_url, index) =>
			redirect(`/hop-${index}`)
		);

		const error = await fetchError(fetchArticleHtml(PAGE_URL, { fetchImpl }));

		expect(error.message).toBe("redirect_limit");
		expect(error.restricted).toBe(false);
		expect(calls).toHaveLength(EVENT_CONTENT_REDIRECT_LIMIT + 1);
	});

	test("treats a redirect without a Location as a redirect failure", async () => {
		const { fetchImpl } = fakeFetch(() => new Response(null, { status: 302 }));

		const error = await fetchError(fetchArticleHtml(PAGE_URL, { fetchImpl }));

		expect(error.message).toBe("redirect_limit");
	});

	test.each([401, 403])("marks HTTP %i as restricted", async (status) => {
		const { fetchImpl } = fakeFetch(() => htmlResponse("Forbidden", status));

		const error = await fetchError(fetchArticleHtml(PAGE_URL, { fetchImpl }));

		expect(error.restricted).toBe(true);
		expect(error.message).toBe("restricted");
	});

	test("reports other HTTP errors with their status", async () => {
		const { fetchImpl } = fakeFetch(() => htmlResponse("Too many", 429));

		const error = await fetchError(fetchArticleHtml(PAGE_URL, { fetchImpl }));

		expect(error.restricted).toBe(false);
		expect(error.message).toBe("HTTP 429");
	});

	test("refuses non-HTML bodies", async () => {
		const { fetchImpl } = fakeFetch(
			() =>
				new Response("%PDF-1.7", {
					headers: { "Content-Type": "application/pdf" },
				})
		);

		const error = await fetchError(fetchArticleHtml(PAGE_URL, { fetchImpl }));

		expect(error.message).toBe("unsupported content type application/pdf");
	});

	test("accepts a response without a Content-Type", async () => {
		const { fetchImpl } = fakeFetch(() => new Response(HTML));

		const page = await fetchArticleHtml(PAGE_URL, { fetchImpl });

		expect(page.html).toBe(HTML);
	});

	test("cuts oversized pages at the byte limit", async () => {
		const chunk = new TextEncoder().encode("x".repeat(1000));
		let pulls = 0;
		const endless = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulls += 1;
				controller.enqueue(chunk);
			},
		});
		const { fetchImpl } = fakeFetch(() => htmlResponse(endless));

		const page = await fetchArticleHtml(PAGE_URL, {
			fetchImpl,
			maxBytes: 2500,
		});

		expect(page.truncated).toBe(true);
		expect(page.html).toHaveLength(2500);
		expect(pulls).toBeLessThan(10);
	});

	test("gives up on a slow server", async () => {
		const fetchImpl: FetchLike = (_url, init) =>
			new Promise((_resolve, reject) => {
				init.signal?.addEventListener("abort", () =>
					reject(init.signal?.reason)
				);
			});

		const error = await fetchError(
			fetchArticleHtml(PAGE_URL, { fetchImpl, timeoutMs: 20 })
		);

		expect(error.message).toBe("timeout");
	});

	test("rejects non-HTTP URLs without fetching", async () => {
		const { calls, fetchImpl } = fakeFetch(() => htmlResponse(HTML));

		const error = await fetchError(
			fetchArticleHtml("ftp://files.example.com/story", { fetchImpl })
		);

		expect(error.message).toBe("unsupported scheme ftp:");
		expect(calls).toHaveLength(0);
	});
});
