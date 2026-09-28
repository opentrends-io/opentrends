/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming escapes the dot in sitemap-events.xml. */

import { createFileRoute } from "@tanstack/react-router";

import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import type { EventPageSummary } from "@/components/trends/types";
import { buildEventPagesSitemapXml } from "@/lib/event-pages-sitemap";
import { SITE_URL } from "@/lib/seo";

// The published event pages, in their own sitemap so their indexing can be
// watched as one batch. A failed read answers 503, never an empty list.

function headers(): Headers {
	return new Headers({
		"cache-control": "public, max-age=600, s-maxage=1800",
		"content-type": "application/xml; charset=utf-8",
	});
}

async function eventPagesSitemap(): Promise<Response> {
	const result = await readApiJsonForSsr<{ pages?: EventPageSummary[] }>(
		"/api/event-pages"
	);
	if (!(result.status === 200 && Array.isArray(result.data?.pages))) {
		return new Response("Event page sitemap temporarily unavailable.\n", {
			headers: {
				"cache-control": "no-store",
				"content-type": "text/plain; charset=utf-8",
				"retry-after": "3600",
			},
			status: 503,
		});
	}
	return new Response(
		buildEventPagesSitemapXml(SITE_URL, result.data?.pages ?? []),
		{ headers: headers() }
	);
}

export const Route = createFileRoute("/sitemap-events.xml")({
	server: {
		handlers: {
			GET: () => eventPagesSitemap(),
			HEAD: () => new Response(null, { headers: headers(), status: 200 }),
		},
	},
});
