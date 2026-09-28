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

function dayPath(lang: string, topic: string, day: string): string {
	const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
	return `${prefix}/trends/${topic}/${day}`;
}

// The languages that have one topic's digest for one day.
function editionsOf(langs: Record<string, string[]>, day: string): string[] {
	return Object.entries(langs)
		.filter(([lang, days]) => SLUG_RE.test(lang) && days.includes(day))
		.map(([lang]) => lang);
}

type Href = (lang: string, topic: string, day: string) => string;

// Each language edition of a day names the others, so search engines treat
// them as one page in several languages. A day in one language names none.
function alternateLinks(
	editions: readonly string[],
	topic: string,
	day: string,
	href: Href
): string {
	if (editions.length < 2) {
		return "";
	}
	const langs = editions.includes(DEFAULT_LANG)
		? [...editions, "x-default"]
		: editions;
	return langs
		.map((lang) => {
			const target = lang === "x-default" ? DEFAULT_LANG : lang;
			return `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${href(target, topic, day)}"/>`;
		})
		.join("");
}

function topicUrls(
	topic: string,
	langs: Record<string, string[]>,
	href: Href
): string[] {
	const urls: string[] = [];
	for (const [lang, days] of Object.entries(langs)) {
		if (!SLUG_RE.test(lang)) {
			continue;
		}
		for (const day of days.filter((value) => DAY_RE.test(value))) {
			const alternates = alternateLinks(
				editionsOf(langs, day),
				topic,
				day,
				href
			);
			urls.push(
				`  <url>\n    <loc>${href(lang, topic, day)}</loc>\n    <lastmod>${day}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.4</priority>${alternates}\n  </url>`
			);
		}
	}
	return urls;
}

export function buildArchiveSitemapXml(
	siteUrl: string,
	index: ArchiveIndexData
): string {
	const href: Href = (lang, topic, day) =>
		xmlEscape(`${siteUrl}${dayPath(lang, topic, day)}`);
	const urls = Object.entries(index.topics)
		.filter(([topic]) => SLUG_RE.test(topic))
		.flatMap(([topic, langs]) => topicUrls(topic, langs, href));
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

// The language editions of one archived day that a page should name as
// alternates: every language that has the day, provided the page's own
// language is among them. Fewer than two editions means none.
export function archiveDayEditions(
	index: ArchiveIndexData,
	topic: string,
	day: string,
	ownLang: string
): string[] {
	const editions = editionsOf(index.topics[topic] ?? {}, day);
	return editions.length > 1 && editions.includes(ownLang) ? editions : [];
}
