import { describe, expect, test } from "bun:test";

import type { ArchivedDigestEntry } from "@/components/trends/types";

import {
	citationHosts,
	countSources,
	digestPreview,
	LANDING_DIGEST_LINES,
} from "./landing-model";

function entry(n: number, urls: string[] = []): ArchivedDigestEntry {
	return {
		citations: urls.map((url, index) => ({ n: index + 1, url })),
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
		expect(preview?.map((line) => line.n)).toEqual(
			Array.from({ length: LANDING_DIGEST_LINES }, (_, index) => index + 1)
		);
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

describe("citationHosts", () => {
	test("lists distinct hosts without www, at most three", () => {
		expect(
			citationHosts(
				entry(1, [
					"https://www.theverge.com/a",
					"https://theverge.com/b",
					"not a url",
					"https://wallstreetcn.com/c",
					"https://openai.com/d",
					"https://arxiv.org/e",
				])
			)
		).toEqual(["theverge.com", "wallstreetcn.com", "openai.com"]);
	});
});
