import { describe, expect, it } from "bun:test";

import {
	archiveDayEditions,
	buildArchiveSitemapXml,
	isArchiveIndex,
} from "./archive-sitemap";

describe("archive sitemap", () => {
	it("writes one URL per topic, language and day, English unprefixed", () => {
		const xml = buildArchiveSitemapXml("https://opentrends.io", {
			generatedAt: 1,
			topics: {
				ai: { en: ["2026-09-28"], zh: ["2026-09-28", "2026-09-27"] },
			},
		});
		const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		expect(locs).toEqual([
			"https://opentrends.io/trends/ai/2026-09-28",
			"https://opentrends.io/zh/trends/ai/2026-09-28",
			"https://opentrends.io/zh/trends/ai/2026-09-27",
		]);
		expect(xml).toContain("<lastmod>2026-09-27</lastmod>");
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
	});

	it("links a day's language editions to each other", () => {
		const xml = buildArchiveSitemapXml("https://opentrends.io", {
			generatedAt: 1,
			topics: {
				ai: { en: ["2026-09-28", "2026-09-27"], zh: ["2026-09-28"] },
			},
		});
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
		const blocks = xml.split("<url>").slice(1);
		const both = blocks.filter((block) =>
			block.includes("<loc>https://opentrends.io/zh/trends/ai/2026-09-28</loc>")
		)[0];
		expect(both).toContain(
			'<xhtml:link rel="alternate" hreflang="en" href="https://opentrends.io/trends/ai/2026-09-28"/>'
		);
		expect(both).toContain(
			'<xhtml:link rel="alternate" hreflang="zh" href="https://opentrends.io/zh/trends/ai/2026-09-28"/>'
		);
		expect(both).toContain(
			'<xhtml:link rel="alternate" hreflang="x-default" href="https://opentrends.io/trends/ai/2026-09-28"/>'
		);
		// A day only one language has claims no alternates.
		const single = blocks.filter((block) =>
			block.includes("<loc>https://opentrends.io/trends/ai/2026-09-27</loc>")
		)[0];
		expect(single).not.toContain("xhtml:link");
	});

	it("skips anything that is not a day", () => {
		const xml = buildArchiveSitemapXml("https://opentrends.io", {
			generatedAt: 1,
			topics: { ai: { en: ["<script>", "2026-09-28"] } },
		});
		expect(xml).not.toContain("script");
		expect(xml.match(/<url>/g)).toHaveLength(1);
	});

	it("names a day's editions only when the page's own is one of them", () => {
		const index = {
			generatedAt: 1,
			topics: { ai: { en: ["2026-09-28"], zh: ["2026-09-28", "2026-09-27"] } },
		};
		expect(archiveDayEditions(index, "ai", "2026-09-28", "zh")).toEqual([
			"en",
			"zh",
		]);
		expect(archiveDayEditions(index, "ai", "2026-09-27", "zh")).toEqual([]);
		expect(archiveDayEditions(index, "ai", "2026-09-28", "ru")).toEqual([]);
		expect(archiveDayEditions(index, "cn", "2026-09-28", "en")).toEqual([]);
	});

	it("accepts only a well-formed index", () => {
		expect(isArchiveIndex({ generatedAt: 1, topics: {} })).toBe(true);
		expect(
			isArchiveIndex({ generatedAt: 1, topics: { ai: { en: [1] } } })
		).toBe(false);
		expect(isArchiveIndex({ topics: {} })).toBe(false);
		expect(isArchiveIndex(null)).toBe(false);
	});
});
