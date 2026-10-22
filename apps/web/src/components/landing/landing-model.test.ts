import { describe, expect, test } from "bun:test";

import { sourcesByTopic, wallSources } from "./landing-model";

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
