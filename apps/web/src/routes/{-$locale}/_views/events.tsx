import { createFileRoute } from "@tanstack/react-router";

import { EventFeedPage } from "@/components/trends/event-feed-page";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { eventPagesQueryOptions } from "@/components/trends/trends-query";
import type { EventPageSummary } from "@/components/trends/types";
import { resolveLocale, translate } from "@/lib/i18n";
import { buildSeo } from "@/lib/seo";

interface EventsSearch {
	topic?: string;
}

function validateEventsSearch(search: Record<string, unknown>): EventsSearch {
	return {
		topic: typeof search.topic === "string" ? search.topic : undefined,
	};
}

export const Route = createFileRoute("/{-$locale}/_views/events")({
	component: EventsComponent,
	validateSearch: validateEventsSearch,
	// The published event pages are read on the server so the hub's links to
	// them are in the first HTML.
	loader: async ({ context }) => {
		if (import.meta.env.SSR) {
			const result = await readApiJsonForSsr<{ pages?: EventPageSummary[] }>(
				"/api/event-pages"
			);
			const pages = result.data?.pages;
			if (pages) {
				context.queryClient.setQueryData(
					eventPagesQueryOptions.queryKey,
					pages
				);
			}
			return { eventPages: pages?.length ?? 0 };
		}
		const pages = await context.queryClient
			.ensureQueryData(eventPagesQueryOptions)
			.catch(() => []);
		return { eventPages: pages.length };
	},
	head: ({ loaderData, params }) => {
		const locale = resolveLocale(params.locale);
		return buildSeo({
			title: translate(locale, "events.seoTitle"),
			description: translate(locale, "events.seoDescription"),
			path: "/events",
			locale,
			// The hub is indexed once it links to published event pages; the live
			// event stream itself is rendered in the browser, so without any
			// pages a crawler would find an empty shell.
			noindex: !loaderData?.eventPages,
		});
	},
});

function EventsComponent() {
	const search = Route.useSearch();
	return <EventFeedPage selectedTopic={search.topic} />;
}
