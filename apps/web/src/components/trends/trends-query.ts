import { queryOptions } from "@tanstack/react-query";

import type { Locale } from "@/lib/i18n";

import {
	loadArchivedDigest,
	loadDigestDays,
	loadSourceDetail,
	loadTrendEventDetail,
	loadTrendEvents,
	loadTrendSource,
	loadTrends,
} from "./load-trends";
import { pageNeedsTranslationWarmup } from "./translation-status";
import { TRENDS_FULL_ITEMS_PER_SOURCE } from "./trends-limits";
import type {
	ArchivedDigestData,
	DigestJsonData,
	EventDetailData,
	EventFeedData,
	SourceCardData,
	SourceDetailData,
	TrendsPageData,
} from "./types";

export const TRENDS_PAGE_GC_MS = 30 * 60_000;
export const TRENDS_PAGE_STALE_MS = 10 * 60_000;

export function trendsPageQueryOptions(
	topic: string,
	locale: Locale,
	sourceIds?: readonly string[],
	itemsPerSource: number = TRENDS_FULL_ITEMS_PER_SOURCE
) {
	return queryOptions<TrendsPageData, Error>({
		queryKey: [
			"trends-page",
			topic,
			locale,
			itemsPerSource,
			...(sourceIds ? [sourceIds.join(",")] : []),
		],
		queryFn: () => loadTrends(topic, locale, itemsPerSource, sourceIds),
		gcTime: TRENDS_PAGE_GC_MS,
		refetchInterval: (query) =>
			query.state.data && pageNeedsTranslationWarmup(query.state.data, locale)
				? 10_000
				: false,
		refetchOnWindowFocus: false,
		staleTime: TRENDS_PAGE_STALE_MS,
	});
}

export function trendSourceQueryOptions(
	topic: string,
	sourceId: string,
	locale: Locale
) {
	return queryOptions<SourceCardData, Error>({
		queryKey: [
			"trend-source",
			topic,
			sourceId,
			locale,
			"background",
			TRENDS_FULL_ITEMS_PER_SOURCE,
		],
		queryFn: () =>
			loadTrendSource(topic, sourceId, locale, TRENDS_FULL_ITEMS_PER_SOURCE),
		gcTime: TRENDS_PAGE_GC_MS,
		refetchOnWindowFocus: false,
		staleTime: TRENDS_PAGE_STALE_MS,
	});
}

export function trendEventsQueryOptions(topic?: string, locale: Locale = "en") {
	return queryOptions<EventFeedData, Error>({
		queryKey: ["trend-events", topic ?? "all", locale],
		queryFn: () => loadTrendEvents(topic, 0, 30, locale),
		gcTime: TRENDS_PAGE_GC_MS,
		refetchOnWindowFocus: false,
		staleTime: TRENDS_PAGE_STALE_MS,
	});
}

export function trendEventDetailQueryOptions(
	eventId: string,
	topic?: string,
	locale: Locale = "en"
) {
	return queryOptions<EventDetailData, Error>({
		queryKey: ["trend-event-detail", eventId, topic ?? "all", locale],
		queryFn: () => loadTrendEventDetail(eventId, topic, locale),
		gcTime: TRENDS_PAGE_GC_MS,
		refetchOnWindowFocus: false,
		staleTime: TRENDS_PAGE_STALE_MS,
	});
}

const ARCHIVE_STALE_MS = 10 * 60_000;

export function digestDaysQueryOptions(topic: string, locale: Locale) {
	return queryOptions<string[], Error>({
		queryKey: ["digest-days", topic, locale],
		queryFn: () => loadDigestDays(topic, locale),
		staleTime: ARCHIVE_STALE_MS,
	});
}

export function archivedDigestQueryOptions(
	topic: string,
	day: string,
	locale: Locale
) {
	return queryOptions<ArchivedDigestData, Error>({
		queryKey: ["archived-digest", topic, day, locale],
		queryFn: () => loadArchivedDigest(topic, day, locale),
		retry: false,
		staleTime: ARCHIVE_STALE_MS,
	});
}

export function sourceDetailQueryOptions(sourceId: string, locale: Locale) {
	return queryOptions<SourceDetailData, Error>({
		queryKey: ["source-detail", sourceId, locale],
		queryFn: () => loadSourceDetail(sourceId, locale),
		retry: false,
		staleTime: ARCHIVE_STALE_MS,
	});
}

// Holds the digest the server rendered with the page; never fetched on the
// client, which streams the live digest itself.
export function ssrDigestQueryOptions(topic: string, locale: Locale) {
	return queryOptions<DigestJsonData, Error>({
		queryKey: ["ssr-digest", topic, locale],
		queryFn: () => Promise.reject(new Error("The SSR digest is read-only.")),
		enabled: false,
		staleTime: Number.POSITIVE_INFINITY,
	});
}
