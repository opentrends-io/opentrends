import { db, schema } from "@opentrends/db";
import { and, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";

import { getEventEligibleSourceIds, getSourcePreset } from "../config/sources";
import { getTopicPreset } from "../config/topics";
import type { NewsItem } from "../types";
import { EVENT_TIME_WINDOW_MS } from "./event-clustering";
import { isLogoLikeImage } from "./event-cover";
import {
	assertEventEmbeddingConfigured,
	getEventEmbeddingModel,
} from "./event-embedding";
import { EVENT_SIMILARITY_THRESHOLD } from "./event-merge-rules";
import { isLowValuePromotionText } from "./event-promotions";
import { EVENT_LOOKBACK_MS } from "./event-rebuild";
import {
	CONSUMER_TECH_NEWS_RE,
	itemHotScore,
	itemRankScore,
	sourceQualityScore,
	sourceSignalTier,
} from "./event-scoring";
import { independentSourceCount, sourceFamilyId } from "./event-source-family";
import { EVENT_ITEM_LIMIT } from "./event-work-budget";
import {
	refreshExpiredTopicSourcesInBackground,
	TopicNotFoundError,
} from "./get-trends-page";
import {
	needsTranslation,
	prewarmItemTranslations,
	type TranslationLanguage,
	type TranslationMode,
	translateNewsItems,
} from "./translate-news-items";

const {
	sourceItem,
	sourceItemEmbedding,
	trendEvent,
	trendEventSourceItem,
	trendEventTopic,
} = schema;
const EVENT_FEED_DEFAULT_LIMIT = 30;
const EVENT_FEED_MAX_LIMIT = 80;
const EVENT_DETAIL_SOURCE_LIMIT = 160;
const LOW_VALUE_SINGLE_SOURCE_RE =
	/\b(?:buying guide|gift guide|deals?|discount|sale|streaming|trailer|review roundup)\b|(?:导购|好价|优惠|折扣|开箱|种草|平替|穿搭|餐吧|钓鱼服)/i;
type EventSelectionReason =
	| "high_score"
	| "multiple_sources"
	| "official_source"
	| "selected"
	| "strong_source";
export interface EventFeedPublisher {
	firstAt: string;
	homeUrl?: string;
	id: string;
	latestAt: string;
	title: string;
}

export interface EventFeedItem {
	eventId: string;
	firstSeenAt: string;
	/** Stories only: how much the story is being reported now. */
	heat?: number;
	imageUrl?: string;
	lastSeenAt: string;
	original?: {
		summary?: string;
		title: string;
	};
	primarySource?: {
		imageUrl?: string;
		sourceId: string;
		title: string;
		url: string;
	};
	/** Stories only: each publisher once, in the order they reported. */
	publishers?: EventFeedPublisher[];
	score: number;
	selectionReason?: EventSelectionReason;
	sourceCount: number;
	sources: Array<{
		homeUrl?: string;
		sourceId: string;
		title: string;
	}>;
	summary?: string;
	title: string;
	topicId: string;
	topicIds?: string[];
}

export interface EventFeedResponse {
	events: EventFeedItem[];
	nextOffset?: number;
	/** Some titles are still being translated: do not cache this for long. */
	translationsPending?: boolean;
}

/** stories: two or more publishers, by heat. briefs: one publisher, newest first. */
export type EventFeedView = "stories" | "briefs";

export interface EventDetailResponse {
	eventId: string;
	firstSeenAt: string;
	lastSeenAt: string;
	original?: {
		summary?: string;
		title: string;
	};
	processing: {
		embeddedItemCount: number;
		embeddingModel: string;
		enrichedItemCount: number;
		inputItemCount: number;
		itemLimit: number;
		lookbackHours: number;
		mergeRules: {
			similarityThreshold: number;
			timeWindowHours: number;
		};
		scoreInputs: {
			itemScore: number;
			sourceScore: number;
			uniqueSourceCount: number;
		};
		steps: Array<{
			detail: string;
			label: string;
			status: "done" | "pending" | "skipped";
		}>;
	};
	score: number;
	sourceItems: Array<{
		contentFetchedAt?: string;
		contentStatus: string;
		description?: string;
		embeddingModel?: string;
		hasEmbedding: boolean;
		itemId: string;
		imageUrl?: string;
		isPrimary: boolean;
		mergeConfidence: number;
		original?: {
			description?: string;
			title: string;
		};
		publishedAt?: string;
		sourceId: string;
		textHash?: string;
		title: string;
		url: string;
	}>;
	summary?: string;
	title: string;
	topicId: string;
}

function sourceName(sourceId: string): string {
	return getSourcePreset(sourceId)?.name ?? sourceId;
}

export interface EventFeedRow {
	eventId: string;
	firstSeenAt: Date;
	imageUrl: string | null;
	lastSeenAt: Date;
	primaryDescription: string | null;
	primaryItemId: string | null;
	primarySourceId: string | null;
	score: number;
	sourceCount: number;
	summary: string | null;
	title: string;
	topicId: string;
	topicIds?: string[];
	url: string | null;
}

function isLowValuePromotionFeedRow(row: EventFeedRow): boolean {
	return isLowValuePromotionText(
		`${row.title}\n${row.summary ?? ""}\n${row.primaryDescription ?? ""}`,
		row.primarySourceId
	);
}

function isLowValueSingleSourceFeedRow(row: EventFeedRow): boolean {
	if (row.sourceCount > 1) {
		return false;
	}
	const text = `${row.title}\n${row.summary ?? ""}\n${row.primaryDescription ?? ""}`;
	if (LOW_VALUE_SINGLE_SOURCE_RE.test(text) && row.score < 150) {
		return true;
	}
	if (row.score >= 135 || sourceSignalTier(row.primarySourceId) !== "t2") {
		return false;
	}
	return !CONSUMER_TECH_NEWS_RE.test(text);
}

export function isLowValueEventFeedRow(row: EventFeedRow): boolean {
	return isLowValuePromotionFeedRow(row) || isLowValueSingleSourceFeedRow(row);
}

function getSelectionReason(
	row: EventFeedRow,
	sourceDiversity: number
): EventSelectionReason {
	const sourceTier = sourceSignalTier(row.primarySourceId);
	if (sourceTier === "t1") {
		return "official_source";
	}
	if (sourceDiversity > 1 || row.sourceCount > 1) {
		return "multiple_sources";
	}
	if (row.score >= 140) {
		return "high_score";
	}
	if (sourceTier === "t15") {
		return "strong_source";
	}
	return "selected";
}

export function toFeedItem(
	row: EventFeedRow,
	sources: EventFeedItem["sources"],
	coverImageUrl?: string
): EventFeedItem {
	const imageUrl = [row.imageUrl, coverImageUrl].find(
		(url): url is string => Boolean(url) && !isLogoLikeImage(url ?? "")
	);
	const topicIds = row.topicIds ?? [row.topicId];
	return {
		eventId: row.eventId,
		topicId: row.topicId,
		topicIds,
		title: row.title,
		summary: row.summary ?? undefined,
		imageUrl: imageUrl ?? undefined,
		score: row.score,
		sources,
		sourceCount: row.sourceCount,
		firstSeenAt: row.firstSeenAt.toISOString(),
		lastSeenAt: row.lastSeenAt.toISOString(),
		primarySource:
			row.primarySourceId && row.url
				? {
						sourceId: row.primarySourceId,
						title: sourceName(row.primarySourceId),
						url: row.url,
						imageUrl: imageUrl ?? undefined,
					}
				: undefined,
		selectionReason: getSelectionReason(row, independentSourceCount(sources)),
	};
}

export const eventFeedRowSelection = {
	eventId: trendEvent.eventId,
	topicId: trendEvent.topicId,
	title: trendEvent.title,
	summary: trendEvent.summary,
	score: trendEvent.score,
	sourceCount: trendEvent.sourceCount,
	firstSeenAt: trendEvent.firstSeenAt,
	lastSeenAt: trendEvent.lastSeenAt,
	primarySourceId: trendEvent.primarySourceId,
	primaryItemId: trendEvent.primaryItemId,
	primaryDescription: sourceItem.description,
	url: sourceItem.url,
	imageUrl: sourceItem.imageUrl,
};

function readEventFeedRows(
	topicId?: string,
	limit = EVENT_FEED_DEFAULT_LIMIT,
	offset = 0,
	view?: EventFeedView
): Promise<EventFeedRow[]> {
	const eventSourceIds = getEventEligibleSourceIds();
	const query = db
		.select(eventFeedRowSelection)
		.from(trendEvent)
		.leftJoin(
			sourceItem,
			and(
				eq(trendEvent.primarySourceId, sourceItem.sourceId),
				eq(trendEvent.primaryItemId, sourceItem.itemId)
			)
		)
		.$dynamic();
	const eventSourcePredicate =
		view === "briefs"
			? and(
					inArray(trendEvent.primarySourceId, eventSourceIds),
					lte(trendEvent.sourceCount, 1)
				)
			: inArray(trendEvent.primarySourceId, eventSourceIds);
	const filteredQuery = topicId
		? query
				.innerJoin(
					trendEventTopic,
					eq(trendEvent.eventId, trendEventTopic.eventId)
				)
				.where(and(eq(trendEventTopic.topicId, topicId), eventSourcePredicate))
		: query.where(
				and(
					eventSourcePredicate,
					sql`EXISTS (
						SELECT 1
						FROM ${trendEventTopic}
						WHERE ${trendEventTopic.eventId} = ${trendEvent.eventId}
					)`
				)
			);
	return filteredQuery
		.orderBy(
			desc(trendEvent.firstSeenAt),
			desc(trendEvent.lastSeenAt),
			desc(trendEvent.eventId)
		)
		.limit(limit)
		.offset(offset);
}

export async function readEventTopicIds(
	eventIds: string[]
): Promise<Map<string, string[]>> {
	if (eventIds.length === 0) {
		return new Map();
	}
	const rows = await db
		.select({
			eventId: trendEventTopic.eventId,
			topicId: trendEventTopic.topicId,
		})
		.from(trendEventTopic)
		.where(inArray(trendEventTopic.eventId, eventIds));
	const topics = new Map<string, string[]>();
	for (const row of rows) {
		const topicIds = topics.get(row.eventId) ?? [];
		topicIds.push(row.topicId);
		topics.set(row.eventId, topicIds);
	}
	for (const topicIds of topics.values()) {
		topicIds.sort();
	}
	return topics;
}

export function prepareEventFeedTopicSources(
	topicId: string | undefined,
	waitUntil: ((promise: Promise<unknown>) => void) | undefined
): void {
	if (!topicId) {
		return;
	}
	if (!getTopicPreset(topicId)) {
		throw new TopicNotFoundError(topicId);
	}
	const refresh = refreshExpiredTopicSourcesInBackground(
		topicId,
		waitUntil
	).catch((error) => {
		console.warn("[event-feed] failed to prepare topic sources", error);
	});
	waitUntil?.(refresh);
}

export async function readEventCoverImages(
	eventIds: string[]
): Promise<Map<string, string>> {
	if (eventIds.length === 0) {
		return new Map();
	}
	const rows = await db
		.select({
			eventId: trendEventSourceItem.eventId,
			imageUrl: sourceItem.imageUrl,
		})
		.from(trendEventSourceItem)
		.innerJoin(
			sourceItem,
			and(
				eq(trendEventSourceItem.sourceId, sourceItem.sourceId),
				eq(trendEventSourceItem.itemId, sourceItem.itemId)
			)
		)
		.where(
			and(
				inArray(trendEventSourceItem.eventId, eventIds),
				isNotNull(sourceItem.imageUrl)
			)
		)
		.orderBy(
			desc(trendEventSourceItem.isPrimary),
			desc(sourceItem.publishedAt)
		);
	const images = new Map<string, string>();
	for (const row of rows) {
		if (
			row.imageUrl &&
			!images.has(row.eventId) &&
			!isLogoLikeImage(row.imageUrl)
		) {
			images.set(row.eventId, row.imageUrl);
		}
	}
	return images;
}

export async function readEventFeedSources(
	eventIds: string[]
): Promise<Map<string, EventFeedItem["sources"]>> {
	if (eventIds.length === 0) {
		return new Map();
	}
	const rows = await db
		.select({
			eventId: trendEventSourceItem.eventId,
			sourceId: trendEventSourceItem.sourceId,
			isPrimary: trendEventSourceItem.isPrimary,
		})
		.from(trendEventSourceItem)
		.where(inArray(trendEventSourceItem.eventId, eventIds))
		.orderBy(
			desc(trendEventSourceItem.isPrimary),
			desc(trendEventSourceItem.mergeConfidence)
		);
	const sourcesByEvent = new Map<string, EventFeedItem["sources"]>();
	const seenByEvent = new Map<string, Set<string>>();
	for (const row of rows) {
		const seen = seenByEvent.get(row.eventId) ?? new Set<string>();
		if (seen.has(row.sourceId)) {
			continue;
		}
		seen.add(row.sourceId);
		seenByEvent.set(row.eventId, seen);
		const preset = getSourcePreset(row.sourceId);
		const eventSources = sourcesByEvent.get(row.eventId) ?? [];
		eventSources.push({
			sourceId: row.sourceId,
			title: preset?.name ?? row.sourceId,
			homeUrl: preset && "homeUrl" in preset ? preset.homeUrl : undefined,
		});
		sourcesByEvent.set(row.eventId, eventSources);
	}
	return sourcesByEvent;
}

function getEventFeedNextOffset({
	limit,
	offset,
	readLimit,
	rowsLength,
	visibleRows,
}: {
	limit: number;
	offset: number;
	readLimit: number;
	rowsLength: number;
	visibleRows: Array<{ index: number; row: EventFeedRow }>;
}): number | undefined {
	if (visibleRows.length > limit) {
		return offset + (visibleRows[limit]?.index ?? limit);
	}
	if (rowsLength === readLimit) {
		return offset + rowsLength;
	}
	return;
}

export async function getEventFeed(
	topicId?: string,
	options: {
		lang?: TranslationLanguage;
		limit?: number;
		offset?: number;
		translationMode?: TranslationMode;
		view?: EventFeedView;
		waitUntil?: (promise: Promise<unknown>) => void;
	} = {}
): Promise<EventFeedResponse> {
	assertEventEmbeddingConfigured();
	prepareEventFeedTopicSources(topicId, options.waitUntil);
	const limit = Math.min(
		Math.max(options.limit ?? EVENT_FEED_DEFAULT_LIMIT, 1),
		EVENT_FEED_MAX_LIMIT
	);
	const offset = Math.max(options.offset ?? 0, 0);
	const readLimit = limit + 25;
	const rows = await readEventFeedRows(
		topicId,
		readLimit,
		offset,
		options.view
	);
	const visibleRows = rows
		.map((row, index) => ({ index, row }))
		.filter(({ row }) => !isLowValueEventFeedRow(row));
	const pageEntries = visibleRows.slice(0, limit);
	const pageRows = pageEntries.map(({ row }) => row);
	const nextOffset = getEventFeedNextOffset({
		limit,
		offset,
		readLimit,
		rowsLength: rows.length,
		visibleRows,
	});
	const eventIds = pageRows.map((row) => row.eventId);
	const [topicIdsByEvent, coverImages, sourcesByEvent] = await Promise.all([
		readEventTopicIds(eventIds),
		readEventCoverImages(eventIds),
		readEventFeedSources(eventIds),
	]);
	for (const row of pageRows) {
		row.topicIds = topicIdsByEvent.get(row.eventId) ?? [row.topicId];
	}
	const events = pageRows.map((row) =>
		toFeedItem(
			row,
			sourcesByEvent.get(row.eventId) ?? [],
			coverImages.get(row.eventId)
		)
	);
	const localized = await localizeEventFeedItems(
		events,
		pageRows,
		options.lang,
		options.translationMode,
		options.waitUntil
	);
	return {
		events: localized.events,
		nextOffset,
		translationsPending: localized.pending || undefined,
	};
}

// Titles and summaries in the reader's language. Items whose translation is
// not back yet keep their original text and mark the response as pending.
// Event titles are translated with their topic pages; a report that has
// left every topic page never would be. Whatever is still missing is
// translated after the response, once per isolate at a time.
const EVENT_TRANSLATION_PREWARM_MS = 25_000;
const eventTranslationsInFlight = new Set<string>();

function prewarmMissingTranslations(
	items: readonly NewsItem[],
	lang: TranslationLanguage,
	waitUntil: ((promise: Promise<unknown>) => void) | undefined
): void {
	const missing = items.filter(
		(item) =>
			needsTranslation(item, lang) &&
			!eventTranslationsInFlight.has(`${lang}:${item.sourceId}:${item.id}`)
	);
	if (!waitUntil || missing.length === 0) {
		return;
	}
	const keys = missing.map((item) => `${lang}:${item.sourceId}:${item.id}`);
	for (const key of keys) {
		eventTranslationsInFlight.add(key);
	}
	waitUntil(
		prewarmItemTranslations(missing, lang, {
			timeoutMs: EVENT_TRANSLATION_PREWARM_MS,
		})
			.catch((error) => {
				console.warn("[event-feed] could not translate event titles", error);
			})
			.finally(() => {
				for (const key of keys) {
					eventTranslationsInFlight.delete(key);
				}
			})
	);
}

export async function localizeEventFeedItems(
	events: readonly EventFeedItem[],
	rows: readonly EventFeedRow[],
	lang: TranslationLanguage | undefined,
	translationMode: TranslationMode | undefined,
	waitUntil?: (promise: Promise<unknown>) => void
): Promise<{ events: EventFeedItem[]; pending: boolean }> {
	if (!lang) {
		return { events: [...events], pending: false };
	}
	const translated = await translateNewsItems(
		events.map((event, index) => {
			const row = rows[index];
			return {
				description: event.summary,
				fetchedAt: Date.now(),
				id: row?.primaryItemId ?? event.eventId,
				sourceId: row?.primarySourceId ?? `event:${event.topicId}`,
				title: event.title,
				url: event.primarySource?.url ?? "",
			};
		}),
		lang,
		translationMode
	);
	prewarmMissingTranslations(translated, lang, waitUntil);
	let pending = false;
	const localized = events.map((event, index) => {
		const item = translated[index];
		if (!item) {
			return event;
		}
		if (needsTranslation(item, lang)) {
			pending = true;
		}
		if (!item.original) {
			return event;
		}
		return {
			...event,
			original: {
				summary: item.original.description,
				title: item.original.title,
			},
			summary: item.description,
			title: item.title,
		};
	});
	return { events: localized, pending };
}

export async function getEventDetail(
	eventId: string,
	topicId?: string,
	options: {
		lang?: TranslationLanguage;
		translationMode?: TranslationMode;
		waitUntil?: (promise: Promise<unknown>) => void;
	} = {}
): Promise<EventDetailResponse | null> {
	assertEventEmbeddingConfigured();
	if (topicId && !getTopicPreset(topicId)) {
		throw new TopicNotFoundError(topicId);
	}
	const eventSelection = {
		eventId: trendEvent.eventId,
		topicId: trendEvent.topicId,
		title: trendEvent.title,
		summary: trendEvent.summary,
		score: trendEvent.score,
		firstSeenAt: trendEvent.firstSeenAt,
		lastSeenAt: trendEvent.lastSeenAt,
	};
	const eventRows = topicId
		? await db
				.select(eventSelection)
				.from(trendEvent)
				.innerJoin(
					trendEventTopic,
					eq(trendEvent.eventId, trendEventTopic.eventId)
				)
				.where(
					and(
						eq(trendEventTopic.topicId, topicId),
						eq(trendEvent.eventId, eventId)
					)
				)
				.limit(1)
		: await db
				.select(eventSelection)
				.from(trendEvent)
				.where(eq(trendEvent.eventId, eventId))
				.limit(1);
	const event = eventRows[0];
	if (!event) {
		return null;
	}
	const items = await db
		.select({
			sourceId: trendEventSourceItem.sourceId,
			itemId: trendEventSourceItem.itemId,
			isPrimary: trendEventSourceItem.isPrimary,
			mergeConfidence: trendEventSourceItem.mergeConfidence,
			title: sourceItem.title,
			description: sourceItem.description,
			url: sourceItem.url,
			imageUrl: sourceItem.imageUrl,
			hotValue: sourceItem.hotValue,
			rank: sourceItem.rank,
			publishedAt: sourceItem.publishedAt,
			fetchedAt: sourceItem.fetchedAt,
			contentFetchedAt: sourceItem.contentFetchedAt,
			contentStatus: sourceItem.contentStatus,
			// Only whether a vector exists: the vectors themselves are large.
			hasEmbedding: sql<number>`${sourceItemEmbedding.embedding} IS NOT NULL`,
			embeddingModel: sourceItemEmbedding.model,
			textHash: sourceItemEmbedding.textHash,
		})
		.from(trendEventSourceItem)
		.innerJoin(
			sourceItem,
			and(
				eq(trendEventSourceItem.sourceId, sourceItem.sourceId),
				eq(trendEventSourceItem.itemId, sourceItem.itemId)
			)
		)
		.leftJoin(
			sourceItemEmbedding,
			and(
				eq(trendEventSourceItem.sourceId, sourceItemEmbedding.sourceId),
				eq(trendEventSourceItem.itemId, sourceItemEmbedding.itemId)
			)
		)
		.where(eq(trendEventSourceItem.eventId, eventId))
		.orderBy(desc(trendEventSourceItem.isPrimary), desc(sourceItem.publishedAt))
		.limit(EVENT_DETAIL_SOURCE_LIMIT);
	const uniqueSourceCount = new Set(
		items.map((item) => sourceFamilyId(item.sourceId))
	).size;
	const embeddedCount = items.filter((item) => item.hasEmbedding).length;
	const enrichedCount = items.filter(
		(item) => item.contentStatus === "ok" || item.contentFetchedAt
	).length;
	const sourceScore =
		uniqueSourceCount > 1 ? 52 + (uniqueSourceCount - 2) * 24 : 0;
	const itemScore = Math.max(
		0,
		...items.map(
			(item) =>
				itemRankScore(item) +
				itemHotScore(item) +
				sourceQualityScore(item.sourceId)
		)
	);
	const translatedItems = options.lang
		? await translateNewsItems(
				items.map((item) => ({
					description: item.description ?? undefined,
					fetchedAt: item.fetchedAt.getTime(),
					id: item.itemId,
					imageUrl: item.imageUrl ?? undefined,
					publishedAt: item.publishedAt?.getTime(),
					sourceId: item.sourceId,
					title: item.title,
					url: item.url,
				})),
				options.lang,
				options.translationMode
			)
		: [];
	if (options.lang) {
		prewarmMissingTranslations(
			translatedItems,
			options.lang,
			options.waitUntil
		);
	}
	const primaryIndex = items.findIndex((item) => item.isPrimary === 1);
	const primaryTranslation =
		primaryIndex >= 0 ? translatedItems[primaryIndex] : undefined;
	return {
		eventId: event.eventId,
		topicId: topicId ?? event.topicId,
		title: primaryTranslation?.original
			? primaryTranslation.title
			: event.title,
		summary: primaryTranslation?.original
			? primaryTranslation.description
			: (event.summary ?? undefined),
		original: primaryTranslation?.original
			? {
					title: primaryTranslation.original.title,
					summary: primaryTranslation.original.description,
				}
			: undefined,
		score: event.score,
		firstSeenAt: event.firstSeenAt.toISOString(),
		lastSeenAt: event.lastSeenAt.toISOString(),
		processing: {
			embeddedItemCount: embeddedCount,
			embeddingModel: getEventEmbeddingModel(),
			enrichedItemCount: enrichedCount,
			inputItemCount: items.length,
			itemLimit: EVENT_ITEM_LIMIT,
			lookbackHours: EVENT_LOOKBACK_MS / 3_600_000,
			mergeRules: {
				similarityThreshold: EVENT_SIMILARITY_THRESHOLD,
				timeWindowHours: EVENT_TIME_WINDOW_MS / 3_600_000,
			},
			scoreInputs: {
				itemScore,
				sourceScore,
				uniqueSourceCount,
			},
			steps: [
				{
					label: "Read recent reports from every event source",
					status: "done",
					detail: `${items.length} linked source items from ${uniqueSourceCount} sources are attached to this event.`,
				},
				{
					label: "Extract article content",
					status: enrichedCount > 0 ? "done" : "pending",
					detail: `${enrichedCount}/${items.length} items have extracted content or a completed content fetch.`,
				},
				{
					label: "Create embeddings",
					status: embeddedCount > 0 ? "done" : "pending",
					detail: `${embeddedCount}/${items.length} items have ${getEventEmbeddingModel()} vectors.`,
				},
				{
					label: "Merge into event cluster",
					status: "done",
					detail: `Reports from different publishers and topics merge by exact URL/content hash, or when similar to the event's first report (vector similarity >= ${EVENT_SIMILARITY_THRESHOLD} with shared keywords) inside ${EVENT_TIME_WINDOW_MS / 3_600_000}h. Promotional posts are left out.`,
				},
				{
					label: "Choose primary item and score",
					status: "done",
					detail: `Primary item drives the title/source. Score ${event.score} includes ${sourceScore} source points and ${itemScore} item points plus freshness.`,
				},
			],
		},
		sourceItems: items.map((item, index) => ({
			sourceId: item.sourceId,
			itemId: item.itemId,
			title: translatedItems[index]?.original
				? (translatedItems[index]?.title ?? item.title)
				: item.title,
			description: translatedItems[index]?.original
				? translatedItems[index]?.description
				: (item.description ?? undefined),
			url: item.url,
			imageUrl: item.imageUrl ?? undefined,
			contentFetchedAt: item.contentFetchedAt?.toISOString(),
			contentStatus: item.contentStatus,
			embeddingModel: item.embeddingModel ?? undefined,
			hasEmbedding: Boolean(item.hasEmbedding),
			publishedAt: item.publishedAt?.toISOString(),
			isPrimary: item.isPrimary === 1,
			mergeConfidence: item.mergeConfidence,
			original: translatedItems[index]?.original
				? {
						title: translatedItems[index].original.title,
						description: translatedItems[index].original.description,
					}
				: undefined,
			textHash: item.textHash ?? undefined,
		})),
	};
}
