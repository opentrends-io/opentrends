import type { EventPageSummary } from "@/components/trends/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EDITIONS = [
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

// Both language editions of every published event page, each naming the
// other, with the date the page last changed.
export function buildEventPagesSitemapXml(
	siteUrl: string,
	pages: readonly EventPageSummary[]
): string {
	const urls = pages
		.filter((page) => SLUG_RE.test(page.slug))
		.flatMap((page) => {
			const href = (prefix: string) =>
				xmlEscape(`${siteUrl}${prefix}/events/${page.slug}`);
			const alternates = [
				...EDITIONS.map(
					({ lang, prefix }) =>
						`\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${href(prefix)}"/>`
				),
				`\n    <xhtml:link rel="alternate" hreflang="x-default" href="${href("")}"/>`,
			].join("");
			return EDITIONS.map(
				({ prefix }) =>
					`  <url>\n    <loc>${href(prefix)}</loc>\n    <lastmod>${page.updatedAt.slice(0, 10)}</lastmod>${alternates}\n  </url>`
			);
		});
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}
