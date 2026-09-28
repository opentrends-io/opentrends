import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import {
	sourcesConfigQueryOptions,
	sourcesStatusQueryOptions,
} from "@/components/trends/load-sources";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { SourcesPage } from "@/components/trends/sources-page";
import type { SourcesStatusResponse } from "@/components/trends/sources-types";
import { resolveLocale } from "@/lib/i18n";
import { buildSeo } from "@/lib/seo";

// Live status reads the latest snapshot of every source and can take a few
// seconds cold; the configuration is enough for the page, so it is not
// waited on for long.
const LIVE_STATUS_SSR_TIMEOUT_MS = 1500;

function isSourcesResponse(value: unknown): value is SourcesStatusResponse {
	return (
		Boolean(value) &&
		typeof value === "object" &&
		Array.isArray((value as { sources?: unknown }).sources)
	);
}

export const Route = createFileRoute("/{-$locale}/sources")({
	component: SourcesRoute,
	// The server render ships the whole list so crawlers see every source and
	// its link. Live status is read alongside the static configuration; if it
	// is not back in time, the configuration is rendered and the browser
	// fills in the status.
	loader: async ({ context }) => {
		if (!import.meta.env.SSR) {
			return;
		}
		const [live, config] = await Promise.all([
			readApiJsonForSsr<unknown>("/api/sources", LIVE_STATUS_SSR_TIMEOUT_MS),
			readApiJsonForSsr<unknown>("/api/sources?mode=config"),
		]);
		if (isSourcesResponse(live.data)) {
			context.queryClient.setQueryData(
				sourcesStatusQueryOptions.queryKey,
				live.data
			);
			return;
		}
		if (isSourcesResponse(config.data)) {
			context.queryClient.setQueryData(
				sourcesConfigQueryOptions.queryKey,
				config.data
			);
		}
	},
	head: ({ params }) => {
		const locale = resolveLocale(params.locale);
		return buildSeo({
			title: "Sources & feed health",
			description:
				"Live status for every source OpenTrends aggregates — feed freshness, last update time and any fetch errors across native adapters, RSSHub routes and RSS feeds.",
			path: "/sources",
			locale,
		});
	},
});

function SourcesRoute() {
	const live = useQuery({
		...sourcesStatusQueryOptions,
		enabled: typeof window !== "undefined",
	});
	const config = useQuery(sourcesConfigQueryOptions);
	const data = live.data ?? config.data;

	if (!data) {
		if (live.error) {
			throw live.error;
		}
		return <Loader />;
	}

	return <SourcesPage data={data} statusPending={!live.data} />;
}
