import { describe, expect, test } from "bun:test";

import {
	eventOutlets,
	eventSpanHours,
	type LandingEvent,
	liveDigest,
	pickLandingEvent,
	wallSources,
} from "./landing-model";

const SOURCES = [
	{
		sourceId: "the-verge",
		name: "The Verge",
		homeUrl: "https://www.theverge.com/",
		topics: ["featured", "hardware"],
		role: "press",
	},
	{
		sourceId: "the-verge-ai",
		name: "The Verge · AI",
		homeUrl: "https://www.theverge.com/ai",
		topics: ["ai"],
		role: "press",
	},
	{ sourceId: "no-home", name: "No home", topics: ["ai"] },
	{
		sourceId: "hn",
		name: "Hacker News",
		homeUrl: "https://news.ycombinator.com",
		topics: ["programming", "mine"],
		role: "community",
	},
	{
		sourceId: "openai-news",
		name: "OpenAI News",
		homeUrl: "https://openai.com/news",
		topics: ["ai"],
		role: "official",
	},
];

describe("wallSources", () => {
	test("keeps one tile per site, merging its topics, own channels first", () => {
		const wall = wallSources(SOURCES);
		expect(wall.map((tile) => tile.id)).toEqual([
			"openai-news",
			"the-verge",
			"hn",
		]);
		expect(wall[1]?.topics).toEqual(["hardware", "ai"]);
		expect(wall[2]?.topics).toEqual(["programming"]);
	});

	test("stops at the limit", () => {
		expect(wallSources(SOURCES, 1)).toHaveLength(1);
	});
});

function event(sources: LandingEvent["sources"]): LandingEvent {
	return {
		eventId: "e1",
		firstSeenAt: "2026-10-29T01:00:00.000Z",
		lastSeenAt: "2026-10-29T02:30:00.000Z",
		sources,
		title: "A story",
		topicId: "ai",
	};
}

describe("pickLandingEvent", () => {
	test("wants three different sites, not three sections of one", () => {
		const oneSite = event([
			{ sourceId: "a", homeUrl: "https://www.theverge.com/", title: "1" },
			{ sourceId: "b", homeUrl: "https://theverge.com/ai", title: "2" },
			{
				sourceId: "c",
				homeUrl: "https://www.theverge.com/gadgets",
				title: "3",
			},
		]);
		const threeSites = event([
			{ sourceId: "a", homeUrl: "https://www.theverge.com/", title: "1" },
			{ sourceId: "b", homeUrl: "https://techcrunch.com/", title: "2" },
			{ sourceId: "c", homeUrl: "https://arstechnica.com/", title: "3" },
		]);
		expect(pickLandingEvent([oneSite, threeSites])).toBe(threeSites);
		expect(pickLandingEvent([oneSite])).toBeNull();
		expect(pickLandingEvent(undefined)).toBeNull();
	});

	test("outlets count a site once and the span rounds up to whole hours", () => {
		const picked = event([
			{ sourceId: "a", homeUrl: "https://www.theverge.com/", title: "1" },
			{ sourceId: "b", homeUrl: "https://theverge.com/ai", title: "2" },
			{ sourceId: "c", homeUrl: "https://techcrunch.com/", title: "3" },
		]);
		expect(eventOutlets(picked).map((outlet) => outlet.sourceId)).toEqual([
			"a",
			"c",
		]);
		expect(eventSpanHours(picked)).toBe(2);
	});
});

describe("liveDigest", () => {
	test("is only a brief the model wrote, with lines", () => {
		const entries = [{ n: 1, takeaway: "x" }];
		expect(liveDigest({ entries })).not.toBeNull();
		expect(liveDigest({ entries, degraded: true })).toBeNull();
		expect(liveDigest({ entries: [] })).toBeNull();
		expect(liveDigest(null)).toBeNull();
	});
});
