/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming escapes the dot in sitemap-archive.xml. */

import { createFileRoute } from "@tanstack/react-router";

import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { SITE_URL } from "@/lib/seo";

// The digest archive as a sitemap: one URL per topic per archived day, in
// the languages the digest is generated in. The static sitemap cannot list
// these because a new one appears every day.

const TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

// Digests are produced on demand in the reader's language; these two are
// generated every day by the scheduler and so always have an archive.
const ARCHIVE_LANGS = [
	{ lang: "en", prefix: "" },
	{ lang: "zh", prefix: "/zh" },
] as const;

function xmlEscape(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

// A plain fetch of the public API: this handler runs outside the SSR
// render, where the service-binding helper is not available.
// Read over the service binding: a worker cannot fetch another workers.dev
// host in its own account (error 1042).
async function readDays(topic: string, lang: string): Promise<string[]> {
	const result = await readApiJsonForSsr<{ days?: string[] }>(
		`/api/trends/${topic}/digest-days?lang=${lang}`
	);
	return result.data?.days ?? [];
}

async function buildArchiveSitemap(): Promise<string> {
	const lists = await Promise.all(
		TOPIC_IDS.flatMap((topic) =>
			ARCHIVE_LANGS.map(async ({ lang, prefix }) => {
				const days = await readDays(topic, lang);
				return days.map((day) => ({
					day,
					path: `${prefix}/trends/${topic}/${day}`,
				}));
			})
		)
	);
	const entries = lists
		.flat()
		.map(
			({ day, path }) =>
				`  <url>\n    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>\n    <lastmod>${day}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.4</priority>\n  </url>`
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function headers(): Headers {
	return new Headers({
		"cache-control": "public, max-age=1800, s-maxage=3600",
		"content-type": "application/xml; charset=utf-8",
	});
}

export const Route = createFileRoute("/sitemap-archive.xml")({
	server: {
		handlers: {
			GET: async () =>
				new Response(await buildArchiveSitemap(), {
					headers: headers(),
					status: 200,
				}),
			HEAD: () => new Response(null, { headers: headers(), status: 200 }),
		},
	},
});
