import { describe, expect, it } from "bun:test";

import { buildCanonicalEmbeddingText } from "../services/event-embedding";
import {
	EVENT_SIMILARITY_THRESHOLD,
	isSameEventSignal,
	keywordOverlapCount,
	keywordOverlapRatio,
	keywordsForText,
} from "../services/event-merge-rules";

function signal(a: string, b: string, similarity: number) {
	const aKeywords = keywordsForText(a);
	const bKeywords = keywordsForText(b);
	return {
		keywordMatches: keywordOverlapCount(aKeywords, bKeywords),
		keywordRatio: keywordOverlapRatio(aKeywords, bKeywords),
		similarity,
	};
}

describe("event embedding text", () => {
	const text = buildCanonicalEmbeddingText({
		title: "Thieves steal trailers marked Nvidia and find sand inside",
		description: "Two trailers left outside a warehouse were taken.",
		publishedAt: new Date("2026-09-27T14:14:00Z"),
		sourceName: "Tom's Hardware",
	});

	it("puts source and date first so the report text ends the input", () => {
		expect(text).toBe(
			[
				"Source: Tom's Hardware",
				"Published: 2026-09-27",
				"Thieves steal trailers marked Nvidia and find sand inside",
				"Two trailers left outside a warehouse were taken.",
			].join("\n\n")
		);
	});

	it("keeps the title and description once each", () => {
		expect(text.split("Thieves steal trailers")).toHaveLength(2);
		expect(text.split("Two trailers left outside")).toHaveLength(2);
	});

	it("skips an unknown date and an empty description", () => {
		expect(
			buildCanonicalEmbeddingText({
				title: "A headline",
				description: "  ",
				publishedAt: null,
				sourceName: "Wired",
			})
		).toBe("Source: Wired\n\nA headline");
	});
});

describe("event keywords", () => {
	it("ignores function words", () => {
		const keywords = keywordsForText(
			"You can save your money when you have these apps"
		);
		expect([...keywords]).toEqual(["save", "money", "apps"]);
	});

	it("still splits Chinese text into bigrams", () => {
		const keywords = keywordsForText("英伟达拖车");
		for (const bigram of ["英伟", "伟达", "达拖", "拖车"]) {
			expect(keywords.has(bigram)).toBe(true);
		}
	});
});

describe("event merge rule", () => {
	// Similarities below were measured with Qwen/Qwen3-VL-Embedding-8B on
	// buildCanonicalEmbeddingText() for production items on 2026-09-28.
	it("merges two publishers reporting the same story", () => {
		expect(
			isSameEventSignal(
				signal(
					"Kids turned the comment section of an NPR podcast into a group chat\n\nMiddle schoolers took over the Spotify comment section under an NPR episode.",
					"The hottest new hangout for middle schoolers is the NPR comment section\n\nNPR staff thought the comments under their Spotify podcasts were bots.",
					0.517
				)
			)
		).toBe(true);
		expect(
			isSameEventSignal(
				signal(
					"Thieves steal Nvidia-labeled trailers and get sand\n\nThe trailers held sand.",
					"Thieves stole Nvidia trailers and found tons of sand\n\nThe trailers were parked outside.",
					0.619
				)
			)
		).toBe(true);
	});

	it("keeps apart unrelated reports that only share function words", () => {
		const unrelated = signal(
			"How to use the running mode of a music app on iOS and Android\n\nGet more from your runs.",
			"You do not need to pay for distraction-blocking software\n\nThese free iOS and Android apps help you put your phone down.",
			0.519
		);
		expect(unrelated.keywordMatches).toBeLessThan(3);
		expect(isSameEventSignal(unrelated)).toBe(false);
	});

	it("needs shared keywords even at a high similarity", () => {
		expect(
			isSameEventSignal({ keywordMatches: 0, keywordRatio: 0, similarity: 0.6 })
		).toBe(false);
		expect(
			isSameEventSignal({
				keywordMatches: 1,
				keywordRatio: 0.05,
				similarity: 0.66,
			})
		).toBe(true);
	});

	it("does not merge below the similarity threshold on keywords alone", () => {
		expect(
			isSameEventSignal({
				keywordMatches: 7,
				keywordRatio: 0.3,
				similarity: EVENT_SIMILARITY_THRESHOLD - 0.05,
			})
		).toBe(false);
		expect(
			isSameEventSignal({
				keywordMatches: 9,
				keywordRatio: 0.5,
				similarity: EVENT_SIMILARITY_THRESHOLD - 0.03,
			})
		).toBe(true);
	});
});
