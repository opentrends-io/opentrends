// The digest archive sitemap: one URL per topic, language and archived day,
// built from the index the API keeps (/api/archive/index).

export interface ArchiveIndexData {
	generatedAt: number;
	/** topic → language → days, newest first. */
	topics: Record<string, Record<string, string[]>>;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/i;
const DEFAULT_LANG = "en";

function isStringList(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

export function isArchiveIndex(value: unknown): value is ArchiveIndexData {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as { generatedAt?: unknown; topics?: unknown };
	if (
		typeof candidate.generatedAt !== "number" ||
		!candidate.topics ||
		typeof candidate.topics !== "object"
	) {
		return false;
	}
	return Object.values(candidate.topics as Record<string, unknown>).every(
		(langs) =>
			Boolean(langs) &&
			typeof langs === "object" &&
			Object.values(langs as Record<string, unknown>).every(isStringList)
	);
}

function xmlEscape(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function buildArchiveSitemapXml(
	siteUrl: string,
	index: ArchiveIndexData
): string {
	const urls: string[] = [];
	for (const [topic, langs] of Object.entries(index.topics)) {
		if (!SLUG_RE.test(topic)) {
			continue;
		}
		for (const [lang, days] of Object.entries(langs)) {
			if (!SLUG_RE.test(lang)) {
				continue;
			}
			const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
			for (const day of days) {
				if (!DAY_RE.test(day)) {
					continue;
				}
				const loc = xmlEscape(`${siteUrl}${prefix}/trends/${topic}/${day}`);
				urls.push(
					`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${day}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.4</priority>\n  </url>`
				);
			}
		}
	}
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
