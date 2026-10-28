import { expect, test } from "bun:test";
import {
	effectiveTranslationState,
	type TranslationStatus,
	translationText,
} from "./translation-contract";

test("unknown absence is not evidence of running; expired lease is not a spinner", () => {
	expect(effectiveTranslationState(undefined, 100)).toBe("unknown");
	const active: TranslationStatus = {
		state: "running",
		textHash: "a",
		language: "zh",
		checkedAt: 100,
		leaseUntil: 200,
		nextPollAt: 110,
	};
	expect(effectiveTranslationState(active, 150)).toBe("running");
	expect(effectiveTranslationState(active, 201)).toBe("unknown");
	expect(effectiveTranslationState({ ...active, state: "failed" }, 150)).toBe(
		"failed"
	);
});

test("one canonical payload excludes rank, time and absent descriptions", () => {
	expect(translationText({ title: "Genie 4" })).toBe(
		'{"description":null,"title":"Genie 4"}'
	);
	expect(translationText({ title: "same", description: "a" })).not.toBe(
		translationText({ title: "same", description: "b" })
	);
});
