import { db, schema } from "@opentrends/db";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { getEventEligibleSourceIds, getSourcePreset } from "../config/sources";
import { assertEventEmbeddingConfigured } from "./event-embedding";
import {
	type EventFeedItem,
	type EventFeedResponse,
	type EventFeedRow,
	eventFeedRowSelection,
	isLowValueEventFeedRow,
	localizeEventFeedItems,
	prepareEventFeedTopicSources,
	readEventCoverImages,
	readEventFeedSources,
	readEventTopicIds,
	toFeedItem,
} from "./event-feed";
import { type EventReport, eventHeat, publisherName } from "./event-heat";
import type {
	TranslationLanguage,
	TranslationMode,
} from "./translate-news-items";

const { sourceItem, trendEvent, trendEventSourceItem, trendEventTopic } =
	schema;

// Stories older than this have cooled off; they stay in the event archive
// but not in the "reported by several publishers" list.
const STORY_WINDOW_MS = 96 * 60 * 60_000;
const STORY_DEFAULT_LIMIT = 30;
const STORY_MAX_LIMIT = 60;
// D1 binds at most 100 parameters per statement.
const ID_CHUNK = 80;

function chunk<T>(values: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size));
	}
	return chunks;
}

function readStoryRows(topicId: string | undefined, since: Date) {
	const eligible = inArray(
		trendEvent.primarySourceId,
		getEventEligibleSourceIds()
	);
	const recentMultiSource = and(
		eligible,
		gte(trendEvent.sourceCount, 2),
		gte(trendEvent.lastSeenAt, since)
	);
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
	return topicId
		? query
				.innerJoin(
					trendEventTopic,
					eq(trendEvent.eventId, trendEventTopic.eventId)
				)
				.where(and(eq(trendEventTopic.topicId, topicId), recentMultiSource))
		: query.where(
				and(
					recentMultiSource,
					sql`EXISTS (
						SELECT 1
						FROM ${trendEventTopic}
						WHERE ${trendEventTopic.eventId} = ${trendEvent.eventId}
					)`
				)
			);
}

async function readEventReports(
	eventIds: readonly string[]
): Promise<Map<string, EventReport[]>> {
	const reports = new Map<string, EventReport[]>();
	for (const ids of chunk(eventIds, ID_CHUNK)) {
		const rows = await db
			.select({
				eventId: trendEventSourceItem.eventId,
				fetchedAt: sourceItem.fetchedAt,
				publishedAt: sourceItem.publishedAt,
				sourceId: trendEventSourceItem.sourceId,
			})
			.from(trendEventSourceItem)
			.innerJoin(
				sourceItem,
				and(
					eq(trendEventSourceItem.sourceId, sourceItem.sourceId),
					eq(trendEventSourceItem.itemId, sourceItem.itemId)
				)
			)
			.where(inArray(trendEventSourceItem.eventId, ids));
		for (const row of rows) {
			const time = (row.publishedAt ?? row.fetchedAt).getTime();
			reports.set(row.eventId, [
				...(reports.get(row.eventId) ?? []),
				{ sourceId: row.sourceId, time },
			]);
		}
	}
	return reports;
}

interface RankedStory {
	heat: number;
	publishers: ReturnType<typeof eventHeat>["publishers"];
	row: EventFeedRow;
}

function rankStories(
	rows: readonly EventFeedRow[],
	reports: ReadonlyMap<string, EventReport[]>,
	now: number
): RankedStory[] {
	const ranked: RankedStory[] = [];
	for (const row of rows) {
		const { heat, publishers } = eventHeat(reports.get(row.eventId) ?? [], now);
		// The stored count and the links can disagree for a moment while an
		// event is rebuilt; the links decide.
		if (publishers.length >= 2) {
			ranked.push({ heat, publishers, row });
		}
	}
	return ranked.sort(
		(a, b) =>
			b.heat - a.heat || b.row.lastSeenAt.getTime() - a.row.lastSeenAt.getTime()
	);
}

function toStoryItem(story: RankedStory, item: EventFeedItem): EventFeedItem {
	return {
		...item,
		heat: Math.round(story.heat * 100) / 100,
		publishers: story.publishers.map((publisher) => {
			const preset = getSourcePreset(publisher.sourceId);
			return {
				firstAt: new Date(publisher.firstAt).toISOString(),
				homeUrl: preset && "homeUrl" in preset ? preset.homeUrl : undefined,
				id: publisher.id,
				latestAt: new Date(publisher.latestAt).toISOString(),
				title: publisherName(preset?.name ?? publisher.sourceId),
			};
		}),
		sourceCount: story.publishers.length,
	};
}

// The stories two or more publishers are reporting, most reported now first.
export async function getEventStories(
	topicId?: string,
	options: {
		lang?: TranslationLanguage;
		limit?: number;
		now?: number;
		offset?: number;
		translationMode?: TranslationMode;
		waitUntil?: (promise: Promise<unknown>) => void;
	} = {}
): Promise<EventFeedResponse> {
	assertEventEmbeddingConfigured();
	prepareEventFeedTopicSources(topicId, options.waitUntil);
	const now = options.now ?? Date.now();
	const limit = Math.min(
		Math.max(options.limit ?? STORY_DEFAULT_LIMIT, 1),
		STORY_MAX_LIMIT
	);
	const offset = Math.max(options.offset ?? 0, 0);
	const rows = (
		await readStoryRows(topicId, new Date(now - STORY_WINDOW_MS))
	).filter((row) => !isLowValueEventFeedRow(row));
	const reports = await readEventReports(rows.map((row) => row.eventId));
	const ranked = rankStories(rows, reports, now);
	const page = ranked.slice(offset, offset + limit);
	const pageRows = page.map((story) => story.row);
	const eventIds = pageRows.map((row) => row.eventId);
	const [topicIdsByEvent, coverImages, sourcesByEvent] = await Promise.all([
		readEventTopicIds(eventIds),
		readEventCoverImages(eventIds),
		readEventFeedSources(eventIds),
	]);
	const items = page.map((story) =>
		toStoryItem(
			story,
			toFeedItem(
				{
					...story.row,
					topicIds: topicIdsByEvent.get(story.row.eventId) ?? [
						story.row.topicId,
					],
				},
				sourcesByEvent.get(story.row.eventId) ?? [],
				coverImages.get(story.row.eventId)
			)
		)
	);
	const localized = await localizeEventFeedItems(
		items,
		pageRows,
		options.lang,
		options.translationMode,
		options.waitUntil
	);
	return {
		events: localized.events,
		nextOffset: ranked.length > offset + limit ? offset + limit : undefined,
		translationsPending: localized.pending || undefined,
	};
}
