import { describe, expect, it } from "bun:test";

import { buildEventPagesSitemapXml } from "./event-pages-sitemap";

const PAGE = {
	description: { en: "d", zh: "d" },
	keyword: "suno lawsuit",
	publishedAt: "2026-09-27T10:00:00.000Z",
	slug: "sony-umg-sue-suno-v6",
	title: { en: "t", zh: "t" },
	topicIds: ["ai"],
	updatedAt: "2026-09-28T09:00:00.000Z",
};

describe("event pages sitemap", () => {
	it("lists both editions of each page, linked to each other", () => {
		const xml = buildEventPagesSitemapXml("https://opentrends.io", [PAGE]);
		const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		expect(locs).toEqual([
			"https://opentrends.io/events/sony-umg-sue-suno-v6",
			"https://opentrends.io/zh/events/sony-umg-sue-suno-v6",
		]);
		expect(xml).toContain("<lastmod>2026-09-28</lastmod>");
		expect(xml.match(/<xhtml:link /g)).toHaveLength(6);
		expect(xml).toContain(
			'hreflang="x-default" href="https://opentrends.io/events/sony-umg-sue-suno-v6"'
		);
	});

	it("is a valid empty sitemap with no pages", () => {
		expect(buildEventPagesSitemapXml("https://opentrends.io", [])).toContain(
			"<urlset"
		);
	});

	it("skips a slug that is not a clean path", () => {
		const xml = buildEventPagesSitemapXml("https://opentrends.io", [
			{ ...PAGE, slug: "../x" },
		]);
		expect(xml).not.toContain("<url>");
	});
});
