import { describe, expect, test } from "bun:test";
import { sourceRole } from "../config/source-roles";
import { sourcePresets } from "../config/sources";

describe("sourceRole", () => {
	test("names the organisation's own channels and individual authors", () => {
		expect(sourceRole("openai-news", "rss")).toBe("official");
		expect(sourceRole("deepmind-blog", "rss")).toBe("official");
		expect(sourceRole("simon-willison", "rss")).toBe("author");
		expect(sourceRole("karpathy-blog", "slow")).toBe("author");
	});

	test("falls back to the refresh class for everything else", () => {
		expect(sourceRole("the-verge", "rss")).toBe("press");
		expect(sourceRole("hackernews", "community")).toBe("community");
		expect(sourceRole("zhihu-hot", "hot")).toBe("hot");
		expect(sourceRole("arxiv-cs-ai", "slow")).toBe("journal");
		expect(sourceRole("github-trending", "daily")).toBe("press");
	});

	test("overrides the refresh class where it misleads", () => {
		expect(sourceRole("lobsters", "rss")).toBe("community");
		expect(sourceRole("nature", "rss")).toBe("journal");
	});

	test("every source named in a list still exists", () => {
		const known = new Set(Object.keys(sourcePresets));
		const listed = [
			"openai-news",
			"anthropic-news",
			"deepmind-blog",
			"simon-willison",
			"lobsters",
			"nature",
		];
		for (const id of listed) {
			expect(known.has(id)).toBe(true);
		}
	});
});
