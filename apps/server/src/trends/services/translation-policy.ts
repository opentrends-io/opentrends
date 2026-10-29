import { env } from "@opentrends/env/server";
import type { TranslationLimits } from "./translation-job-store";

export const TRANSLATION_MAX_OUTPUT_TOKENS = 4096;
export const TRANSLATION_MAX_PROMPT_BYTES = 16_000;
// Conservative reservation, including chat framing. Do not infer zero from
// missing usage. Rates must be explicitly configured for this exact model.
const INPUT_RESERVATION_TOKENS = 32_768;
export function translationPolicy(): TranslationLimits | null {
	if (
		env.TRANSLATION_JOBS_ENABLED !== "true" ||
		!env.LLM_API_KEY ||
		!env.LLM_TRANSLATION_MODEL ||
		env.TRANSLATION_PRICE_MODEL !== env.LLM_TRANSLATION_MODEL ||
		!env.TRANSLATION_INPUT_CNY_PER_MILLION ||
		!env.TRANSLATION_OUTPUT_CNY_PER_MILLION
	) {
		return null;
	}
	return {
		dailyMicros: Math.floor(env.TRANSLATION_DAILY_BUDGET_CNY * 1_000_000),
		reserveMicros: Math.ceil(
			INPUT_RESERVATION_TOKENS * env.TRANSLATION_INPUT_CNY_PER_MILLION +
				TRANSLATION_MAX_OUTPUT_TOKENS * env.TRANSLATION_OUTPUT_CNY_PER_MILLION
		),
		// Two language lanes, each running a few model calls side by side:
		// the model answers in 15-25 seconds, so parallel calls, not bigger
		// batches, are what turn a burst of new items around in minutes.
		concurrency: 6,
		perMinute: 36,
		dailyCalls: env.TRANSLATION_DAILY_CALL_LIMIT,
		model: env.LLM_TRANSLATION_MODEL,
	};
}

export function translationReportedCost(
	input: number | undefined,
	output: number | undefined
) {
	if (
		!(Number.isSafeInteger(input) && Number.isSafeInteger(output)) ||
		input === undefined ||
		output === undefined ||
		input < 0 ||
		output < 0
	) {
		return;
	}
	if (
		!(
			env.TRANSLATION_INPUT_CNY_PER_MILLION &&
			env.TRANSLATION_OUTPUT_CNY_PER_MILLION
		)
	) {
		return;
	}
	return {
		input,
		output,
		costMicros: Math.ceil(
			input * env.TRANSLATION_INPUT_CNY_PER_MILLION +
				output * env.TRANSLATION_OUTPUT_CNY_PER_MILLION
		),
	};
}
