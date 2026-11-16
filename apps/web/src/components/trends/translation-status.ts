import {
	type TranslationStatus,
	translationPollAt,
} from "@opentrends/api/translation-contract";
import type { Locale } from "@/lib/i18n";

import type { NewsItem, TrendsPageData } from "./types";

const CJK_RE = /[\u3400-\u9fff]/;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;

function translationReadAt(
	status: TranslationStatus | undefined,
	now = Date.now()
): number | undefined {
	// A failed/expired observation does not prove that the translated text is
	// unavailable. Recheck the read-only endpoint within the query's finite
	// budget, without changing the status or claiming that a worker is active.
	if (
		status?.state === "unknown" ||
		(status &&
			["queued", "running", "retry_wait"].includes(status.state) &&
			status.serviceValidUntil !== undefined &&
			status.serviceValidUntil <= now)
	) {
		return now + 10_000;
	}
	return translationPollAt(status, now);
}

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
		translationReadAt(item.translation) !== undefined
	);
}

const pollSessions = new WeakMap<
	object,
	{ started: number; errors: number; updates: number }
>();
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
	const session = pollSessions.get(query) ?? {
		started: now,
		errors: query.state.errorUpdateCount,
		// Include the response already displayed when this session begins.
		updates: Math.max(0, query.state.dataUpdateCount - 1),
	};
	pollSessions.set(query, session);
	const { started } = session;
	if (
		now - started >= 300_000 ||
		query.state.errorUpdateCount - session.errors >= 3 ||
		query.state.dataUpdateCount - session.updates >= 30
	) {
		return false;
	}
	const times = items
		.filter((item) => !item.original && item.translation?.language === locale)
		.map((item) => translationReadAt(item.translation, now))
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
