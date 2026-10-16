import { describe, expect, test } from "bun:test";

import type { ArchivedDigestEntry } from "@/components/trends/types";

import {
	countSources,
	digestPreview,
	LANDING_DIGEST_LINES,
	lineTopic,
	wallSources,
} from "./landing-model";

function entry(
	n: number,
	citations: { topic?: string; url: string }[] = []
): ArchivedDigestEntry {
	return {
		citations: citations.map((citation, index) => ({
			n: index + 1,
			...citation,
		})),
		n,
		takeaway: `Line ${n}`,
	};
}

describe("countSources", () => {
	test("counts every source and each landing topic", () => {
		expect(
			countSources([
				{ topics: ["featured", "ai"] },
				{ topics: ["ai"] },
				{ topics: ["mine", "unknown"] },
				{},
			])
		).toEqual({ sourceCount: 4, topicSourceCounts: { ai: 2, featured: 1 } });
	});

	test("has no numbers without sources", () => {
		expect(countSources(undefined)).toEqual({
			sourceCount: null,
			topicSourceCounts: {},
		});
		expect(countSources([])).toEqual({
			sourceCount: null,
			topicSourceCounts: {},
		});
	});
});

describe("wallSources", () => {
	test("keeps one tile per site and skips sources without a home", () => {
		expect(
			wallSources([
				{ name: "The Verge", homeUrl: "https://www.theverge.com/" },
				{
					name: "The Verge · AI",
					homeUrl: "https://www.theverge.com/ai-artificial-intelligence",
				},
				{ name: "No home" },
				{ name: "Bad URL", homeUrl: "not a url" },
				{ name: "Hacker News", homeUrl: "https://news.ycombinator.com" },
			])
		).toEqual([
			{ name: "The Verge", homeUrl: "https://www.theverge.com/" },
			{ name: "Hacker News", homeUrl: "https://news.ycombinator.com" },
		]);
	});

	test("stops at the limit", () => {
		const sources = Array.from({ length: 5 }, (_, index) => ({
			name: `Source ${index}`,
			homeUrl: `https://s${index}.example.com`,
		}));
		expect(wallSources(sources, 3)).toHaveLength(3);
	});
});

describe("digestPreview", () => {
	test("keeps at most the brief's lines", () => {
		const entries = Array.from({ length: 12 }, (_, index) => entry(index + 1));
		const preview = digestPreview({
			entries,
			lang: "en",
			markdown: "",
			topic: "featured",
			window: "today",
		});
		expect(preview).toHaveLength(LANDING_DIGEST_LINES);
	});

	test("is empty for a missing or empty digest", () => {
		expect(digestPreview(null)).toBeNull();
		expect(
			digestPreview({
				entries: [],
				lang: "en",
				markdown: "",
				topic: "featured",
				window: "today",
			})
		).toBeNull();
	});
});

describe("lineTopic", () => {
	test("takes the first cited topic other than featured", () => {
		expect(
			lineTopic(
				entry(1, [
					{ topic: "featured", url: "https://a.example" },
					{ topic: "hardware", url: "https://b.example" },
					{ topic: "ai", url: "https://c.example" },
				])
			)
		).toBe("hardware");
	});

	test("has no tag when no citation names a topic", () => {
		expect(lineTopic(entry(1, [{ url: "https://a.example" }]))).toBeNull();
		expect(
			lineTopic(entry(1, [{ topic: "mine", url: "https://a.example" }]))
		).toBeNull();
	});
});
