import { describe, expect, test } from "bun:test";

import type { ArchivedDigestEntry } from "@/components/trends/types";

import {
	digestPreview,
	LANDING_DIGEST_LINES,
	lineTopic,
	sourcesByTopic,
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

const SOURCES = [
	{
		sourceId: "the-verge",
		name: "The Verge",
		homeUrl: "https://www.theverge.com/",
		topics: ["featured", "hardware"],
	},
	{
		sourceId: "the-verge-ai",
		name: "The Verge · AI",
		homeUrl: "https://www.theverge.com/ai",
		topics: ["ai"],
	},
	{ sourceId: "no-home", name: "No home", topics: ["ai"] },
	{
		sourceId: "hn",
		name: "Hacker News",
		homeUrl: "https://news.ycombinator.com",
		topics: ["programming", "mine"],
	},
];

describe("wallSources", () => {
	test("keeps one tile per site, merging its topics", () => {
		const wall = wallSources(SOURCES);
		expect(wall.map((tile) => tile.id)).toEqual(["the-verge", "hn"]);
		expect(wall[0]?.topics).toEqual(["hardware", "ai"]);
		expect(wall[1]?.topics).toEqual(["programming"]);
	});

	test("stops at the limit", () => {
		expect(wallSources(SOURCES, 1)).toHaveLength(1);
	});
});

describe("sourcesByTopic", () => {
	test("groups by content topic with the full count", () => {
		const groups = sourcesByTopic(SOURCES, 1);
		expect(groups.map((group) => group.topic)).toEqual([
			"ai",
			"hardware",
			"programming",
		]);
		const ai = groups[0];
		expect(ai?.count).toBe(2);
		expect(ai?.sources.map((source) => source.id)).toEqual(["the-verge-ai"]);
	});

	test("is empty without sources", () => {
		expect(sourcesByTopic(undefined)).toEqual([]);
	});
});

describe("digestPreview", () => {
	test("keeps the first lines of a finished digest", () => {
		const entries = Array.from({ length: 10 }, (_, index) => entry(index + 1));
		const preview = digestPreview({
			entries,
			lang: "en",
			markdown: "",
			topic: "featured",
			window: "today",
		});
		expect(preview?.lines).toHaveLength(LANDING_DIGEST_LINES);
		expect(preview?.generatedAt).toBeNull();
		expect(preview?.degraded).toBe(false);
	});

	test("carries the digest's age and degraded flag", () => {
		const preview = digestPreview({
			degraded: true,
			entries: [entry(1)],
			generatedAt: 1_700_000_000_000,
			lang: "en",
			markdown: "",
			topic: "featured",
			window: "today",
		});
		expect(preview?.generatedAt).toBe(1_700_000_000_000);
		expect(preview?.degraded).toBe(true);
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
				])
			)
		).toBe("hardware");
	});

	test("has no tag when no citation names a topic", () => {
		expect(lineTopic(entry(1, [{ url: "https://a.example" }]))).toBeNull();
	});
});
