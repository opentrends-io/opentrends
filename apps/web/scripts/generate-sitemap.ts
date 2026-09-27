#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourcePresets } from "../../server/src/trends/config/sources";
import { topicPresets } from "../../server/src/trends/config/topics";

const PRODUCTION_SITE_URL = "https://opentrends.io";
const LOCAL_SITE_URL_RE =
	/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

const TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

const STATIC_PATHS = ["/sources", "/agents"] as const;

const ALL_LOCALES = [
	"en",
	"zh",
	"zh-Hant",
	"ru",
	"fr-FR",
	"es-ES",
	"de-DE",
	"pt-BR",
] as const;
type Locale = (typeof ALL_LOCALES)[number];

const DEFAULT_LOCALE: Locale = "en";
const LOCALE_SET = new Set<string>(ALL_LOCALES);
const LOCALE_SPLIT_REGEX = /[\s,]+/;

function parseSupportedLocales(raw: string | undefined): readonly Locale[] {
	if (!raw?.trim()) {
		return ALL_LOCALES;
	}

	const configured = raw
		.split(LOCALE_SPLIT_REGEX)
		.filter((value): value is Locale => LOCALE_SET.has(value));
	const locales = new Set<Locale>([DEFAULT_LOCALE, ...configured]);

	return locales.size > 1 ? [...locales] : ALL_LOCALES;
}

const LOCALES = parseSupportedLocales(process.env.VITE_SUPPORTED_LOCALES);

function localizedPath(path: string, locale: Locale): string {
	if (locale === DEFAULT_LOCALE) {
		return path;
	}
	if (path === "/") {
		return `/${locale}`;
	}
	return `/${locale}${path}`;
}

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../public/sitemap.xml");

const configuredSiteUrl = (process.env.VITE_SITE_URL ?? "")
	.trim()
	.replace(/\/+$/, "");
// The sitemap is deployed with the build, so a missing or local origin must
// not end up in it: fall back to the public site and say so.
const rawSiteUrl =
	!configuredSiteUrl || LOCAL_SITE_URL_RE.test(configuredSiteUrl)
		? PRODUCTION_SITE_URL
		: configuredSiteUrl;
if (rawSiteUrl !== configuredSiteUrl) {
	console.warn(
		`[generate-sitemap] VITE_SITE_URL is ${configuredSiteUrl || "unset"}; writing ${PRODUCTION_SITE_URL} instead.`
	);
}

// Every source that a topic carries has its own page.
const topicSourceIds = new Set<string>();
for (const topic of Object.values(topicPresets)) {
	for (const section of topic.sections) {
		for (const sourceId of section.sourceIds) {
			topicSourceIds.add(sourceId);
		}
	}
}
const SOURCE_IDS = Object.keys(sourcePresets)
	.filter((id) => topicSourceIds.has(id))
	.sort();

const basePaths = [
	...STATIC_PATHS.map((path) => ({
		path,
		changefreq: "hourly",
		priority: 0.9,
	})),
	...TOPIC_IDS.map((id) => ({
		path: `/trends/${id}`,
		changefreq: "hourly",
		priority: 0.8,
	})),
	...SOURCE_IDS.map((id) => ({
		path: `/sources/${id}`,
		changefreq: "hourly",
		priority: 0.5,
	})),
];

const urls = basePaths.flatMap(({ path, changefreq, priority }) =>
	LOCALES.map((locale) => ({
		path: localizedPath(path, locale),
		changefreq,
		priority,
		alternates: LOCALES.map((alt) => ({
			hreflang: alt,
			href: `${rawSiteUrl}${localizedPath(path, alt)}`,
		})),
	}))
);

const body = urls
	.map(({ path, changefreq, priority, alternates }) => {
		const altTags = alternates
			.map(
				({ hreflang, href }) =>
					`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`
			)
			.join("\n");
		return `  <url>\n    <loc>${rawSiteUrl}${path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n${altTags}\n  </url>`;
	})
	.join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, xml, "utf8");
console.log(`[generate-sitemap] wrote ${outPath}`);
