import { describe, expect, test } from "bun:test";
import {
	effectiveTranslationState,
	type TranslationStatus,
} from "@opentrends/api/translation-contract";

import {
	pageNeedsTranslationWarmup,
	resetTranslationPolling,
	translationRefetchInterval,
} from "./translation-status";
import type { TrendsPageData } from "./types";

function page(title: string, originalTitle?: string): TrendsPageData {
	return {
		description: "AI",
		id: "ai",
		sections: [
			{
				id: "news",
				title: "News",
				sources: [
					{
						items: [
							{
								fetchedAt: 0,
								id: "1",
								...(originalTitle
									? { original: { title: originalTitle } }
									: {}),
								sourceId: "source",
								title,
								url: "https://example.com",
							},
						],
						sourceId: "source",
						status: "ok",
						title: "Source",
					},
				],
			},
		],
		title: "AI",
		updatedAt: 0,
	};
}

describe("translation warmup status", () => {
	test.each([
		"unknown",
		"running",
		"queued",
		"retry_wait",
	] as const)("rechecks an inconclusive %s snapshot without claiming the worker is running", (state) => {
		const now = 1_000_000;
		const translation: TranslationStatus = {
			state,
			language: "zh",
			textHash: "fixture",
			checkedAt: now - 100_000,
			leaseUntil: now - 1,
			serviceValidUntil: now - 1,
		};
		const query = { state: { errorUpdateCount: 0, dataUpdateCount: 1 } };
		const items = [{ translation }];
		expect(effectiveTranslationState(translation, now)).not.toBe("running");
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(10_000);
		// A successful read must stop the same recovery session immediately.
		expect(
			translationRefetchInterval(
				query,
				[{ translation: { ...translation, state: "ready" } }],
				"zh",
				now + 10_000
			)
		).toBe(false);
	});

	test("unknown recovery obeys time, error and read limits, and terminal states stay stopped", () => {
		const now = 1_000_000;
		const translation: TranslationStatus = {
			state: "unknown",
			language: "zh",
			textHash: "fixture",
			checkedAt: now,
		};
		const items = [{ translation }];
		const query = { state: { errorUpdateCount: 0, dataUpdateCount: 1 } };
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(10_000);
		expect(translationRefetchInterval(query, items, "en", now)).toBe(false);
		for (const state of ["ready", "not_needed", "failed", "blocked"] as const) {
			expect(
				translationRefetchInterval(
					query,
					[{ translation: { ...translation, state } }],
					"zh",
					now
				)
			).toBe(false);
		}
		expect(translationRefetchInterval(query, items, "zh", now + 300_000)).toBe(
			false
		);
		query.state.errorUpdateCount = 3;
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(false);
		query.state.errorUpdateCount = 0;
		query.state.dataUpdateCount = 30;
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(false);
	});

	test("manual refresh starts a bounded session relative to existing query counters", () => {
		const now = 1_000_000;
		const query = { state: { errorUpdateCount: 4, dataUpdateCount: 40 } };
		const items = [
			{
				translation: {
					state: "queued" as const,
					language: "zh" as const,
					textHash: "a",
					checkedAt: now,
					nextPollAt: now + 10_000,
					serviceValidUntil: now + 180_000,
				},
			},
		];
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(10_000);
		query.state.errorUpdateCount += 3;
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(false);
		resetTranslationPolling(query);
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(10_000);
		query.state.dataUpdateCount += 30;
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(false);
		resetTranslationPolling(query);
		expect(translationRefetchInterval(query, items, "zh", now)).toBe(10_000);
		expect(translationRefetchInterval(query, items, "zh", now + 300_001)).toBe(
			false
		);
	});
	test("polls only while a supported locale still shows untranslated text", () => {
		expect(pageNeedsTranslationWarmup(page("OpenAI ships a model"), "zh")).toBe(
			false
		);
		expect(
			pageNeedsTranslationWarmup(
				page("OpenAI 发布了一个模型", "OpenAI ships a model"),
				"zh"
			)
		).toBe(false);
		expect(
			pageNeedsTranslationWarmup(page("OpenAI ships a model"), "fr-FR")
		).toBe(false);
	});
});
