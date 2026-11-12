import { describe, expect, test } from "bun:test";

import {
	enforceDigestCitations,
	parseDigestEntries,
} from "../services/digest-json";

describe("parseDigestEntries", () => {
	test("turns the Markdown list into entries with resolved citations", () => {
		const entries = parseDigestEntries(
			"1. **GPT-6 ships** — everyone is testing it [1][3]\n2. Plain line [2]\n\nnot a list",
			[
				{ n: 1, topic: "ai", url: "https://a" },
				{ n: 2, url: "https://b" },
				{ n: 3, topic: "programming", url: "https://c" },
			]
		);
		expect(entries).toEqual([
			{
				citations: [
					{ n: 1, topic: "ai", url: "https://a" },
					{ n: 3, topic: "programming", url: "https://c" },
				],
				n: 1,
				reason: "everyone is testing it",
				takeaway: "GPT-6 ships",
			},
			{
				citations: [{ n: 2, url: "https://b" }],
				n: 2,
				reason: undefined,
				takeaway: "Plain line",
			},
		]);
	});
});

describe("filterCitedItems", () => {
	test("keeps items mentioning a keyword and renumbers them", async () => {
		const { filterCitedItems } = await import("../services/get-trends-summary");
		const item = (title: string, description?: string) =>
			({
				description,
				fetchedAt: 0,
				id: title,
				sourceId: "s",
				title,
				url: title,
			}) as never;
		const cited = [
			{ item: item("GPT-6 launches"), n: 1, source: "a" },
			{ item: item("Weather today"), n: 2, source: "a" },
			{
				item: item("Nothing here", "except gpt-6 in the summary"),
				n: 3,
				source: "b",
			},
		];
		expect(
			filterCitedItems(cited, ["gpt-6"]).map((e) => [e.n, e.item.title])
		).toEqual([
			[1, "GPT-6 launches"],
			[2, "Nothing here"],
		]);
		expect(filterCitedItems(cited, [])).toHaveLength(3);
	});

	test("matches compact product keywords across common separators", async () => {
		const { filterCitedItems } = await import("../services/get-trends-summary");
		const item = (title: string) =>
			({
				fetchedAt: 0,
				id: title,
				sourceId: "s",
				title,
				url: title,
			}) as never;
		const cited = [
			{ item: item("GPT-6 launches"), n: 1, source: "a" },
			{ item: item("GPT 6 pricing"), n: 2, source: "b" },
			{ item: item("Claude Opus 5.5"), n: 3, source: "c" },
		];
		expect(
			filterCitedItems(cited, ["GPT6"]).map((entry) => entry.item.title)
		).toEqual(["GPT-6 launches", "GPT 6 pricing"]);
	});
});

describe("enforceDigestCitations", () => {
	const citations = [1, 2, 3, 4, 5].map((n) => ({ n, url: `https://${n}` }));

	test("keeps a digest whose every line cites a listed item", () => {
		const text = "1. **A** — a [1]\n2. **B** — b [2][3]\n3. **C** — c [4]";
		expect(enforceDigestCitations(text, citations)).toEqual({
			dropped: 0,
			text,
		});
	});

	test("drops a line that ends in an aside instead of a citation, and renumbers", () => {
		// The 2026-11-12 featured digest: line 9 ended "[尚未提供完整数据]".
		const text = [
			"1. **A** — a [1]",
			"2. **跨洲自驾** — 穿越亚洲 [尚未提供完整数据]",
			"3. **C** — c [3]",
			"4. **D** — d [4]",
		].join("\n");
		expect(enforceDigestCitations(text, citations)).toEqual({
			dropped: 1,
			text: "1. **A** — a [1]\n2. **C** — c [3]\n3. **D** — d [4]",
		});
	});

	test("removes numbers that were not in the list, and drops a line left with none", () => {
		const text =
			"1. **A** — a [1][99]\n2. **B** — b [42]\n3. **C** — c [3]\n4. **D** — d [5]";
		expect(enforceDigestCitations(text, citations)).toEqual({
			dropped: 1,
			text: "1. **A** — a [1]\n2. **C** — c [3]\n3. **D** — d [5]",
		});
	});

	test("rejects a digest with too many untraceable lines", () => {
		const text = [
			"1. **A** — a [1]",
			"2. **B** — b",
			"3. **C** — c [note]",
			"4. **D** — d [77]",
			"5. **E** — e [2]",
			"6. **F** — f [3]",
		].join("\n");
		expect(enforceDigestCitations(text, citations)).toBeNull();
	});

	test("rejects a reply with no list at all when there was something to cite", () => {
		expect(
			enforceDigestCitations("Sorry, I cannot summarise these.", citations)
		).toBeNull();
	});

	test("passes text through when there were no items to cite", () => {
		expect(enforceDigestCitations("Nothing new today.", [])).toEqual({
			dropped: 0,
			text: "Nothing new today.",
		});
	});
});
