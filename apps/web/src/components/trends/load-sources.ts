import { env } from "@opentrends/env/web";
import { queryOptions } from "@tanstack/react-query";

import type { SourcesStatusResponse } from "./sources-types";

const SOURCES_FETCH_TIMEOUT_MS = 20_000;

export async function loadSourcesStatus(): Promise<SourcesStatusResponse> {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		SOURCES_FETCH_TIMEOUT_MS
	);
	let response: Response;
	try {
		response = await fetch(`${env.VITE_SERVER_URL}/api/sources`, {
			cache: "default",
			credentials: "omit",
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
	if (!response.ok) {
		throw new Error(`Failed to load sources status (${response.status})`);
	}
	return (await response.json()) as SourcesStatusResponse;
}

const SOURCES_STALE_MS = 60_000;

// Live status of every source: freshness, item counts, errors.
export const sourcesStatusQueryOptions = queryOptions<
	SourcesStatusResponse,
	Error
>({
	queryKey: ["sources-status"],
	queryFn: () => loadSourcesStatus(),
	staleTime: SOURCES_STALE_MS,
});

// The sources as configured, without live status. Only ever filled by the
// server render when the live status took too long, so the page still
// ships every source's name, note and topics.
export const sourcesConfigQueryOptions = queryOptions<
	SourcesStatusResponse,
	Error
>({
	queryKey: ["sources-config"],
	queryFn: () => Promise.reject(new Error("Filled by the server render only.")),
	enabled: false,
	staleTime: Number.POSITIVE_INFINITY,
});
