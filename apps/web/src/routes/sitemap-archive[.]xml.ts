/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming escapes the dot in sitemap-archive.xml. */

import { createFileRoute } from "@tanstack/react-router";

import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { buildArchiveSitemapXml, isArchiveIndex } from "@/lib/archive-sitemap";
import { SITE_URL } from "@/lib/seo";

// The digest archive as a sitemap. The day list comes from the API's
// archive index (itself cached in memory and KV). If the API cannot answer,
// the last sitemap this edge served is sent again; with no copy at all the
// answer is a 503 so a crawler retries, never an empty list that would read
// as "every archive page is gone".

// Kept in the edge cache under the page's own origin; the Cache API does
// nothing on workers.dev, so there this layer is simply skipped.
const LAST_GOOD_PATH = "/sitemap-archive.xml?last-good=1";
const LAST_GOOD_SECONDS = 30 * 24 * 60 * 60;

function edgeCache(): Cache | undefined {
	return (globalThis as { caches?: { default?: Cache } }).caches?.default;
}

function sitemapHeaders(source: string): Headers {
	return new Headers({
		"cache-control": "public, max-age=1800, s-maxage=3600",
		"content-type": "application/xml; charset=utf-8",
		"x-sitemap-source": source,
	});
}

async function rememberLastGood(origin: string, xml: string): Promise<void> {
	const cache = edgeCache();
	if (!cache) {
		return;
	}
	await cache
		.put(
			new Request(new URL(LAST_GOOD_PATH, origin)),
			new Response(xml, {
				headers: {
					"cache-control": `public, max-age=${LAST_GOOD_SECONDS}`,
					"content-type": "application/xml; charset=utf-8",
				},
			})
		)
		.catch(() => undefined);
}

async function readLastGood(origin: string): Promise<string | null> {
	const cache = edgeCache();
	if (!cache) {
		return null;
	}
	const hit = await cache
		.match(new Request(new URL(LAST_GOOD_PATH, origin)))
		.catch(() => undefined);
	return hit ? hit.text() : null;
}

async function archiveSitemap(request: Request): Promise<Response> {
	const origin = new URL(request.url).origin;
	const result = await readApiJsonForSsr<unknown>("/api/archive/index");
	if (result.status === 200 && isArchiveIndex(result.data)) {
		const xml = buildArchiveSitemapXml(SITE_URL, result.data);
		await rememberLastGood(origin, xml);
		return new Response(xml, { headers: sitemapHeaders("index") });
	}
	const lastGood = await readLastGood(origin);
	if (lastGood) {
		return new Response(lastGood, { headers: sitemapHeaders("last-good") });
	}
	return new Response("Archive sitemap temporarily unavailable.\n", {
		headers: {
			"cache-control": "no-store",
			"content-type": "text/plain; charset=utf-8",
			"retry-after": "3600",
		},
		status: 503,
	});
}

export const Route = createFileRoute("/sitemap-archive.xml")({
	server: {
		handlers: {
			GET: ({ request }) => archiveSitemap(request),
			HEAD: () =>
				new Response(null, { headers: sitemapHeaders("head"), status: 200 }),
		},
	},
});
