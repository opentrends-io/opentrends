import {
	type TranslationStatus,
	translationPollAt,
} from "@opentrends/api/translation-contract";
import type { Locale } from "@/lib/i18n";

import type { NewsItem, TrendsPageData } from "./types";

const CJK_RE = /[\u3400-\u9fff]/;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;

export function textNeedsTranslation(
	value: string | undefined,
	locale: Locale
): boolean {
	if (!value?.trim()) {
		return false;
	}
	if (locale === "zh") {
		return !CJK_RE.test(value);
	}
	return CJK_RE.test(value) || CYRILLIC_RE.test(value);
}

function itemNeedsTranslation(item: NewsItem, locale: Locale): boolean {
	if (item.original) {
		return false;
	}
	return (
		item.translation?.language === locale &&
		translationPollAt(item.translation) !== undefined
	);
}

const pollSessions = new WeakMap<object, number>();
export function resetTranslationPolling(query: object): void {
	pollSessions.delete(query);
}
export function translationRefetchInterval(
	query: object & {
		state: { errorUpdateCount: number; dataUpdateCount: number };
	},
	items: readonly { translation?: TranslationStatus; original?: unknown }[],
	locale: Locale,
	now = Date.now()
): number | false {
	const started = pollSessions.get(query) ?? now;
	pollSessions.set(query, started);
	if (
		now - started >= 300_000 ||
		query.state.errorUpdateCount >= 3 ||
		query.state.dataUpdateCount >= 30
	) {
		return false;
	}
	const times = items
		.filter((item) => !item.original && item.translation?.language === locale)
		.map((item) => translationPollAt(item.translation, now))
		.filter((value): value is number => value !== undefined);
	if (!times.length) {
		return false;
	}
	const delay = Math.max(10_000, Math.min(...times) - now);
	return now + delay > started + 300_000 ? false : delay;
}

export function pageNeedsTranslationWarmup(
	page: TrendsPageData,
	locale: Locale
): boolean {
	if (locale !== "zh" && locale !== "en") {
		return false;
	}
	return page.sections.some((section) =>
		section.sources.some((source) =>
			source.items.some((item) => itemNeedsTranslation(item, locale))
		)
	);
}
