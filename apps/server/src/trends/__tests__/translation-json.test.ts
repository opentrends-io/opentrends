import { describe, expect, it } from "bun:test";
import { shouldSplitTranslationFailure } from "../services/translate-news-items";
import {
	parseTranslatedBatch,
	requestTranslatedBatch,
	TranslationOutputError,
} from "../services/translation-json";

const IDS = ["0", "1"];

describe("parsing a translated batch", () => {
	it("reads JSON inside a code fence with prose around it", () => {
		const text = [
			"Here are the translations:",
			"```json",
			JSON.stringify({
				items: [
					{ description: "描述", id: "0", title: "标题一" },
					{ description: null, id: "1", title: "标题二" },
				],
			}),
			"```",
		].join("\n");
		const parsed = parseTranslatedBatch(text, IDS);
		expect(parsed).toEqual({
			items: [
				{ description: "描述", id: "0", title: "标题一" },
				{ description: null, id: "1", title: "标题二" },
			],
		});
	});

	it("accepts numeric ids and a missing description", () => {
		const parsed = parseTranslatedBatch(
			JSON.stringify({
				items: [
					{ id: 0, title: "A" },
					{ description: "d", id: 1, title: "B" },
				],
			}),
			IDS
		);
		expect(parsed).toEqual({
			items: [
				{ description: null, id: "0", title: "A" },
				{ description: "d", id: "1", title: "B" },
			],
		});
	});

	it("accepts a bare array of items", () => {
		const parsed = parseTranslatedBatch(
			JSON.stringify([
				{ description: null, id: "0", title: "A" },
				{ description: null, id: "1", title: "B" },
			]),
			IDS
		);
		expect("items" in parsed && parsed.items).toHaveLength(2);
	});

	it("names ids that are missing, repeated or unknown", () => {
		const missing = parseTranslatedBatch(
			JSON.stringify({ items: [{ description: null, id: "0", title: "A" }] }),
			IDS
		);
		expect("error" in missing && missing.error).toContain("missing ids: 1");

		const repeated = parseTranslatedBatch(
			JSON.stringify({
				items: [
					{ description: null, id: "0", title: "A" },
					{ description: null, id: "0", title: "A2" },
					{ description: null, id: "1", title: "B" },
				],
			}),
			IDS
		);
		expect("error" in repeated && repeated.error).toContain("repeated ids: 0");

		const unknown = parseTranslatedBatch(
			JSON.stringify({
				items: [
					{ description: null, id: "0", title: "A" },
					{ description: null, id: "1", title: "B" },
					{ description: null, id: "7", title: "C" },
				],
			}),
			IDS
		);
		expect("error" in unknown && unknown.error).toContain("unknown ids: 7");
	});

	it("rejects empty titles and text without JSON", () => {
		const empty = parseTranslatedBatch(
			JSON.stringify({
				items: [
					{ description: null, id: "0", title: "  " },
					{ description: null, id: "1", title: "B" },
				],
			}),
			IDS
		);
		expect("error" in empty).toBe(true);
		expect("error" in parseTranslatedBatch("Sorry, I cannot help.", IDS)).toBe(
			true
		);
		expect("error" in parseTranslatedBatch("{ not json }", IDS)).toBe(true);
	});
});

describe("requesting a translated batch", () => {
	const good = JSON.stringify({
		items: [
			{ description: null, id: "0", title: "A" },
			{ description: null, id: "1", title: "B" },
		],
	});

	it("asks once more with the problem named, then succeeds", async () => {
		const prompts: string[] = [];
		const answers = ["not json at all", good];
		const items = await requestTranslatedBatch(
			(prompt) => {
				prompts.push(prompt);
				return Promise.resolve(answers.shift() ?? "");
			},
			"PROMPT",
			IDS
		);
		expect(items.map((item) => item.title)).toEqual(["A", "B"]);
		expect(prompts).toHaveLength(2);
		expect(prompts[1]).toContain("PROMPT");
		expect(prompts[1]).toContain("could not be used");
	});

	it("gives up after the retry with an error the batch splitter handles", async () => {
		const failing = requestTranslatedBatch(
			() => Promise.resolve("still not json"),
			"PROMPT",
			IDS
		);
		await expect(failing).rejects.toBeInstanceOf(TranslationOutputError);
		const error = await failing.catch((caught: unknown) => caught);
		expect(shouldSplitTranslationFailure(error)).toBe(true);
	});
});
