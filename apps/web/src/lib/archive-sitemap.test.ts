import { describe, expect, it } from "bun:test";

import { buildArchiveSitemapXml, isArchiveIndex } from "./archive-sitemap";

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

	it("skips anything that is not a day", () => {
		const xml = buildArchiveSitemapXml("https://opentrends.io", {
			generatedAt: 1,
			topics: { ai: { en: ["<script>", "2026-09-28"] } },
		});
		expect(xml).not.toContain("script");
		expect(xml.match(/<url>/g)).toHaveLength(1);
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
