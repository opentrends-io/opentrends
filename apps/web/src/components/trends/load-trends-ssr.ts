import { env as workerEnv } from "cloudflare:workers";
import { createServerOnlyFn } from "@tanstack/react-start";
import type { Locale } from "@/lib/i18n";
import { readTrendsSnapshot } from "./ssr-snapshot";

interface WebWorkerBindings {
	API: {
		fetch(request: Request): Promise<Response>;
	};
	VITE_SERVER_URL: string;
}

// Keep SSR traffic on Cloudflare's internal service binding. The browser still
// uses VITE_SERVER_URL through the regular client query path.
export const loadTrendsForSsr = createServerOnlyFn(
	(topic: string, locale: Locale) => {
		const bindings = workerEnv as unknown as WebWorkerBindings;
		return readTrendsSnapshot(
			(request) => bindings.API.fetch(request),
			bindings.VITE_SERVER_URL,
			topic,
			locale
		);
	}
);

const SSR_API_TIMEOUT_MS = 3000;

export interface SsrRead<T> {
	data: T | null;
	/** Why the read failed, when it did not reach the API at all. */
	error?: string;
	status: number;
}

// Any JSON endpoint of the API, read over the service binding with the same
// budget as the topic snapshot. Null on any failure or non-2xx, so the
// client loader takes over; a 404 is reported as such for not-found pages.
// (Kept non-generic: the server-only transform strips the body only from a
// plain function expression.)
const readApiJson = createServerOnlyFn(
	async (path: string, timeoutMs: number): Promise<SsrRead<unknown>> => {
		const bindings = workerEnv as unknown as WebWorkerBindings;
		const url = new URL(path, bindings.VITE_SERVER_URL);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await bindings.API.fetch(
				new Request(url, { credentials: "omit", signal: controller.signal })
			);
			if (!response.ok) {
				await response.body?.cancel();
				return { status: response.status, data: null };
			}
			return { status: response.status, data: await response.json() };
		} catch (error) {
			return {
				status: 0,
				data: null,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			clearTimeout(timer);
		}
	}
);

export function readApiJsonForSsr<T>(
	path: string,
	timeoutMs = SSR_API_TIMEOUT_MS
): Promise<SsrRead<T>> {
	return readApiJson(path, timeoutMs) as Promise<SsrRead<T>>;
}
