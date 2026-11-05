import { db, schema } from "@opentrends/db";
import { and, desc, eq, gte, inArray, lt, type SQL, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { getSourcePreset, isEventEligibleSource } from "../config/sources";
import { topicPresets } from "../config/topics";
import {
	type CandidateCluster,
	type ClusterCandidate,
	clusterEventCandidates,
	normalizeUrl,
} from "./event-clustering";
import {
	buildCanonicalEmbeddingText,
	EVENT_EMBEDDING_DIMENSIONS,
	embedTexts,
	getEventEmbeddingModel,
	hashEmbeddingText,
	hashText,
} from "./event-embedding";
import { keywordsForText } from "./event-merge-rules";
import { isPromotionalItem } from "./event-promotions";
import { isRoundupItem } from "./event-roundups";
import {
	choosePrimary,
	type EventCandidate,
	type EventCluster,
	isFeedWorthyCluster,
	scoreCluster,
	summarizeCluster,
} from "./event-scoring";
import { independentSourceCount } from "./event-source-family";
import { normalizeEventText } from "./event-text";
import { eventTopicIds } from "./event-topics";
import {
	CLOUDFLARE_FREE_SUBREQUEST_LIMIT,
	D1_EMBEDDING_WRITE_BATCH_SIZE,
	EVENT_CURRENT_ITEM_LIMIT,
	EVENT_EMBEDDING_ITEM_LIMIT,
	EVENT_RECENT_ITEM_LIMIT,
	EVENT_TITLE_MAX_CHARS,
	estimateEmbeddingSubrequests,
} from "./event-work-budget";
import { type EventState, planEventWrites } from "./event-write-plan";
import { buildEventWriteStatements } from "./event-write-statements";

const {
	source,
	sourceItem,
	sourceItemEmbedding,
	trendEvent,
	trendEventSourceItem,
	trendEventTopic,
} = schema;

export const EVENT_LOOKBACK_MS = 7 * 24 * 60 * 60_000;
// How long a report that has left its feed can still be joined by a later
// report of the same story.
export const EVENT_RECENT_WINDOW_MS = 48 * 60 * 60_000;
// Keywords use the first words of a report, never more than this much body.
const KEYWORD_CONTENT_MAX_CHARS = 2000;
const CANDIDATE_READ_QUERY_COUNT = 2;
const STATE_READ_QUERY_COUNT = 3;
const QUEUE_CONTINUATION_SUBREQUEST_COUNT = 1;
const MS_PER_SECOND = 1000;

interface RebuildCandidate extends EventCandidate, ClusterCandidate {
	embedding: number[] | null;
	inCurrentFeed: boolean;
	keywords: Set<string>;
}

type CandidateRow = Omit<
	RebuildCandidate,
	"inCurrentFeed" | "keywords" | "time"
>;

// Every event source that belongs to a topic, with its topics in the order
// the topics are listed.
export function getEventSourceTopics(): Map<string, string[]> {
	const topicsBySource = new Map<string, string[]>();
	for (const [topicId, topic] of Object.entries(topicPresets)) {
		for (const section of topic.sections) {
			for (const sourceId of section.sourceIds as readonly string[]) {
				if (!isEventEligibleSource(sourceId)) {
					continue;
				}
				const topics = topicsBySource.get(sourceId) ?? [];
				if (!topics.includes(topicId)) {
					topicsBySource.set(sourceId, [...topics, topicId]);
				}
			}
		}
	}
	return topicsBySource;
}

function sourceName(sourceId: string): string {
	return getSourcePreset(sourceId)?.name ?? sourceId;
}

function toSeconds(value: Date | number): number {
	const ms = typeof value === "number" ? value : value.getTime();
	return Math.floor(ms / MS_PER_SECOND);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

const candidateColumns = {
	contentHash: sourceItem.contentHash,
	contentText: sql<
		string | null
	>`substr(${sourceItem.contentText}, 1, ${KEYWORD_CONTENT_MAX_CHARS})`,
	description: sourceItem.description,
	// Vectors of another size (made before the dimensions changed) are not
	// read: they are large and are replaced anyway.
	embedding: sql<
		number[] | null
	>`CASE WHEN json_array_length(${sourceItemEmbedding.embedding}) = ${EVENT_EMBEDDING_DIMENSIONS} THEN ${sourceItemEmbedding.embedding} END`.mapWith(
		sourceItemEmbedding.embedding
	),
	fetchedAt: sourceItem.fetchedAt,
	hotValue: sourceItem.hotValue,
	itemId: sourceItem.itemId,
	publishedAt: sourceItem.publishedAt,
	rank: sourceItem.rank,
	sourceId: sourceItem.sourceId,
	textHash: sourceItemEmbedding.textHash,
	title: sourceItem.title,
	url: sourceItem.url,
};

function selectCandidates(where: SQL | undefined) {
	return db
		.select(candidateColumns)
		.from(sourceItem)
		.innerJoin(source, eq(source.sourceId, sourceItem.sourceId))
		.leftJoin(
			sourceItemEmbedding,
			and(
				eq(sourceItem.sourceId, sourceItemEmbedding.sourceId),
				eq(sourceItem.itemId, sourceItemEmbedding.itemId)
			)
		)
		.where(where);
}

function toCandidate(row: CandidateRow, inCurrentFeed: boolean) {
	const title = normalizeEventText(row.title);
	const description = normalizeEventText(row.description) || null;
	const contentText = row.contentText
		? normalizeEventText(row.contentText)
		: null;
	return {
		...row,
		contentText,
		description,
		inCurrentFeed,
		keywords: keywordsForText(
			`${title}\n${description ?? ""}\n${contentText ?? ""}`
		),
		time: (row.publishedAt ?? row.fetchedAt).getTime(),
		title,
	} satisfies RebuildCandidate;
}

// Reports still in their source's feed from the last week, plus reports that
// left the feed in the last 48 hours. Promotional posts are dropped here, so
// they are neither embedded nor merged.
async function readCandidates(
	sourceIds: string[],
	now: number
): Promise<RebuildCandidate[]> {
	const itemTime = sql`COALESCE(${sourceItem.publishedAt}, ${sourceItem.fetchedAt})`;
	const lookback = sql`${itemTime} >= ${toSeconds(now - EVENT_LOOKBACK_MS)}`;
	const inSources = inArray(sourceItem.sourceId, sourceIds);
	const [currentRows, recentRows] = await Promise.all([
		selectCandidates(
			and(inSources, eq(sourceItem.generation, source.generation), lookback)
		)
			.orderBy(desc(itemTime))
			.limit(EVENT_CURRENT_ITEM_LIMIT),
		selectCandidates(
			and(
				inSources,
				lt(sourceItem.generation, source.generation),
				gte(sourceItem.fetchedAt, new Date(now - EVENT_RECENT_WINDOW_MS)),
				lookback
			)
		)
			.orderBy(desc(sourceItem.fetchedAt))
			.limit(EVENT_RECENT_ITEM_LIMIT),
	]);
	return [
		...currentRows.map((row) => toCandidate(row, true)),
		...recentRows.map((row) => toCandidate(row, false)),
	].filter(
		(candidate) => !(isPromotionalItem(candidate) || isRoundupItem(candidate))
	);
}

interface EmbeddingResult {
	candidates: RebuildCandidate[];
	embeddedCount: number;
	remainingCount: number;
}

async function ensureEmbeddings(
	candidates: RebuildCandidate[]
): Promise<EmbeddingResult> {
	const pending = candidates
		.map((candidate, index) => {
			const text = buildCanonicalEmbeddingText({
				description: candidate.description,
				publishedAt: candidate.publishedAt,
				sourceName: sourceName(candidate.sourceId),
				title: candidate.title,
			});
			return { candidate, index, text, textHash: hashEmbeddingText(text) };
		})
		.filter(
			({ candidate, textHash }) =>
				!(candidate.embedding && candidate.textHash === textHash)
		)
		// Reports still in a feed first, newest first.
		.sort(
			(a, b) =>
				Number(b.candidate.inCurrentFeed) - Number(a.candidate.inCurrentFeed) ||
				b.candidate.time - a.candidate.time
		);
	if (pending.length === 0) {
		return { candidates, embeddedCount: 0, remainingCount: 0 };
	}
	const batch = pending.slice(0, EVENT_EMBEDDING_ITEM_LIMIT);
	const vectors = await embedTexts(batch.map((entry) => entry.text));
	const model = getEventEmbeddingModel();
	const createdAt = new Date();
	const updated = new Map(
		batch.map((entry, position) => [
			entry.index,
			{
				...entry.candidate,
				embedding: vectors[position] ?? null,
				textHash: entry.textHash,
			},
		])
	);
	const rows = batch.map((entry, position) => ({
		createdAt,
		embedding: vectors[position] ?? [],
		itemId: entry.candidate.itemId,
		model,
		sourceId: entry.candidate.sourceId,
		textHash: entry.textHash,
	}));
	const writes: BatchItem<"sqlite">[] = chunk(
		rows,
		D1_EMBEDDING_WRITE_BATCH_SIZE
	).map((rowBatch) =>
		db
			.insert(sourceItemEmbedding)
			.values(rowBatch)
			.onConflictDoUpdate({
				target: [sourceItemEmbedding.sourceId, sourceItemEmbedding.itemId],
				set: {
					createdAt: sql`excluded.created_at`,
					embedding: sql`excluded.embedding`,
					model: sql`excluded.model`,
					textHash: sql`excluded.text_hash`,
				},
			})
	);
	await db.batch(writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
	return {
		candidates: candidates.map(
			(candidate, index) => updated.get(index) ?? candidate
		),
		embeddedCount: batch.length,
		remainingCount: pending.length - batch.length,
	};
}

function makeEventId(anchor: EventCandidate): string {
	return `event-${hashText(`${normalizeUrl(anchor.url)}:${anchor.contentHash}:${anchor.title}`)}`;
}

function toEventCluster(
	cluster: CandidateCluster<RebuildCandidate>
): EventCluster {
	const items = cluster.items.map(({ confidence, item }) => ({
		...item,
		confidence,
	}));
	const primary = items.reduce<EventCandidate>(
		(best, item) => choosePrimary(best, item),
		cluster.anchor
	);
	return {
		eventId: makeEventId(cluster.anchor),
		firstSeenAt: new Date(cluster.firstSeenAt),
		items,
		lastSeenAt: new Date(cluster.lastSeenAt),
		primary,
	};
}

function eventTopics(
	cluster: EventCluster,
	topicsBySource: ReadonlyMap<string, readonly string[]>,
	topicOrder: readonly string[]
): string[] {
	return eventTopicIds(cluster.items, topicsBySource, topicOrder);
}

// The events, topic links and source links the current reports call for.
export function buildDesiredEventState(
	clusters: readonly EventCluster[],
	topicsBySource: ReadonlyMap<string, readonly string[]>,
	topicOrder: readonly string[]
): EventState {
	const state: EventState = { events: [], sourceLinks: [], topicLinks: [] };
	const seen = new Set<string>();
	for (const cluster of clusters) {
		const topics = eventTopics(cluster, topicsBySource, topicOrder);
		if (seen.has(cluster.eventId) || topics.length === 0) {
			continue;
		}
		seen.add(cluster.eventId);
		const primaryTopic =
			topicsBySource.get(cluster.primary.sourceId)?.[0] ?? topics[0] ?? "";
		state.events.push({
			eventId: cluster.eventId,
			firstSeenAt: toSeconds(cluster.firstSeenAt),
			lastSeenAt: toSeconds(cluster.lastSeenAt),
			primaryItemId: cluster.primary.itemId,
			primarySourceId: cluster.primary.sourceId,
			score: scoreCluster(cluster),
			sourceCount: independentSourceCount(cluster.items),
			summary: summarizeCluster(cluster),
			title: cluster.primary.title.slice(0, EVENT_TITLE_MAX_CHARS),
			topicId: primaryTopic,
		});
		for (const topicId of topics) {
			state.topicLinks.push({ eventId: cluster.eventId, topicId });
		}
		for (const item of cluster.items) {
			state.sourceLinks.push({
				eventId: cluster.eventId,
				isPrimary:
					item.sourceId === cluster.primary.sourceId &&
					item.itemId === cluster.primary.itemId
						? 1
						: 0,
				itemId: item.itemId,
				mergeConfidence: item.confidence,
				sourceId: item.sourceId,
			});
		}
	}
	return state;
}

async function readStoredEventState(): Promise<EventState> {
	const [events, topicLinks, sourceLinks] = await Promise.all([
		db
			.select({
				eventId: trendEvent.eventId,
				firstSeenAt: trendEvent.firstSeenAt,
				lastSeenAt: trendEvent.lastSeenAt,
				primaryItemId: trendEvent.primaryItemId,
				primarySourceId: trendEvent.primarySourceId,
				score: trendEvent.score,
				sourceCount: trendEvent.sourceCount,
				summary: trendEvent.summary,
				title: trendEvent.title,
				topicId: trendEvent.topicId,
			})
			.from(trendEvent),
		db
			.select({
				eventId: trendEventTopic.eventId,
				topicId: trendEventTopic.topicId,
			})
			.from(trendEventTopic),
		db
			.select({
				eventId: trendEventSourceItem.eventId,
				isPrimary: trendEventSourceItem.isPrimary,
				itemId: trendEventSourceItem.itemId,
				mergeConfidence: trendEventSourceItem.mergeConfidence,
				sourceId: trendEventSourceItem.sourceId,
			})
			.from(trendEventSourceItem),
	]);
	return {
		events: events.map((row) => ({
			...row,
			firstSeenAt: toSeconds(row.firstSeenAt),
			lastSeenAt: toSeconds(row.lastSeenAt),
		})),
		sourceLinks,
		topicLinks,
	};
}

// Rebuilds every event from the reports of all event sources at once, so
// reports of one story from sources in different topics can merge, and each
// event is linked to every topic its reports belong to. Returns false when
// the work did not fit in this invocation and a continuation is needed.
export async function rebuildEvents(now = Date.now()): Promise<boolean> {
	const topicsBySource = getEventSourceTopics();
	const sourceIds = [...topicsBySource.keys()];
	if (sourceIds.length === 0) {
		return true;
	}
	let used = CANDIDATE_READ_QUERY_COUNT;
	const candidates = await readCandidates(sourceIds, now);
	if (candidates.length === 0) {
		// Never wipe the stored events because no report could be read.
		return true;
	}
	const embedded = await ensureEmbeddings(candidates);
	used += estimateEmbeddingSubrequests(embedded.embeddedCount);
	if (embedded.remainingCount > 0) {
		return false;
	}
	const clusters = clusterEventCandidates(embedded.candidates)
		.filter((cluster) => cluster.items.some(({ item }) => item.inCurrentFeed))
		.map(toEventCluster)
		.filter(isFeedWorthyCluster);
	const desired = buildDesiredEventState(
		clusters,
		topicsBySource,
		Object.keys(topicPresets)
	);
	used += STATE_READ_QUERY_COUNT;
	const plan = planEventWrites(
		desired,
		await readStoredEventState(),
		Object.keys(topicPresets)
	);
	const statements = buildEventWriteStatements(plan, toSeconds(now));
	const available =
		CLOUDFLARE_FREE_SUBREQUEST_LIMIT -
		used -
		QUEUE_CONTINUATION_SUBREQUEST_COUNT;
	const current = statements.slice(0, Math.max(available, 0));
	if (current.length > 0) {
		await db.batch(current as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
	}
	return current.length === statements.length;
}
