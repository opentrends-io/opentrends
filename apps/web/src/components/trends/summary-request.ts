const RETRY_DELAYS_MS = [1000, 3000, 8000] as const;
// Followed-source digests can still be generated live (the server allows 60s
// to the first chunk). Do not mistake normal generation for a failed request.
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRY_AFTER_MS = 60_000;

class SummaryHttpError extends Error {
	readonly status: number;
	readonly retryAfter: number;

	constructor(status: number, retryAfter: number) {
		super(`Failed to load summary (${status})`);
		this.status = status;
		this.retryAfter = retryAfter;
	}

	get retryable(): boolean {
		return (
			this.status === 202 ||
			this.status === 408 ||
			this.status === 429 ||
			this.status >= 500
		);
	}
}

interface SummaryRequestOptions {
	consume: (response: Response) => Promise<void>;
	onRetry: () => void;
	signal: AbortSignal;
}

interface SummaryRequestDependencies {
	fetch?: (url: string, init: RequestInit) => Promise<Response>;
	sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
	timeoutMs?: number;
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
	signal.throwIfAborted();
	return new Promise((resolve, reject) => {
		const abort = () => {
			clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", abort);
			resolve();
		}, ms);
		signal.addEventListener("abort", abort, { once: true });
	});
}

function retryAfterMs(response: Response): number {
	const raw = response.headers.get("Retry-After");
	if (!raw) {
		return response.status === 202 ? 30_000 : 0;
	}
	const seconds = Number(raw);
	const delay = Number.isFinite(seconds)
		? seconds * 1000
		: Date.parse(raw) - Date.now();
	return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

// One request lifecycle owns its retry budget. Pending polls, transport failures
// and transient HTTP errors cannot start separate, unbounded retry chains.
export async function requestSummary(
	url: string,
	options: SummaryRequestOptions,
	dependencies: SummaryRequestDependencies = {}
): Promise<"done" | "empty"> {
	const fetchResponse = dependencies.fetch ?? fetch;
	const sleep = dependencies.sleep ?? pause;
	for (let attempt = 0; ; attempt++) {
		options.signal.throwIfAborted();
		const controller = new AbortController();
		const abort = () => controller.abort(options.signal.reason);
		options.signal.addEventListener("abort", abort, { once: true });
		const timer = setTimeout(
			() =>
				controller.abort(
					new DOMException("Summary request timed out", "TimeoutError")
				),
			dependencies.timeoutMs ?? REQUEST_TIMEOUT_MS
		);
		let failure: unknown;
		try {
			const response = await fetchResponse(url, {
				cache: "no-store",
				credentials: "omit",
				signal: controller.signal,
			});
			if (response.status === 204) {
				return "empty";
			}
			if (!response.ok || response.status === 202) {
				await response.body?.cancel();
				throw new SummaryHttpError(response.status, retryAfterMs(response));
			}
			await options.consume(response);
			controller.signal.throwIfAborted();
			return "done";
		} catch (error) {
			options.signal.throwIfAborted();
			failure = error;
		} finally {
			clearTimeout(timer);
			options.signal.removeEventListener("abort", abort);
		}
		const delay = RETRY_DELAYS_MS[attempt];
		const httpError = failure instanceof SummaryHttpError ? failure : null;
		// A long Retry-After is a stop condition, never permission to retry early.
		if (
			delay === undefined ||
			(httpError &&
				(!httpError.retryable || httpError.retryAfter > MAX_RETRY_AFTER_MS))
		) {
			throw failure;
		}
		options.onRetry();
		options.signal.throwIfAborted();
		await sleep(Math.max(delay, httpError?.retryAfter ?? 0), options.signal);
	}
}
