// Cloudflare Free plan: 50 subrequests and 50 D1 queries per invocation.
// Both are counted together here, so one invocation stays within either
// limit however Cloudflare attributes D1 calls.
export const CLOUDFLARE_FREE_SUBREQUEST_LIMIT = 50;
// D1 accepts at most 100 bound parameters per statement.
export const D1_BOUND_PARAMETER_LIMIT = 100;
// Row sets are written as one JSON array per statement (read back with
// json_each), kept well below D1's 100 KB statement size.
export const D1_JSON_PAYLOAD_MAX_BYTES = 90_000;

export const EVENT_CONTENT_ITEM_LIMIT = 4;
export const EVENT_CONTENT_REDIRECT_LIMIT = 2;
export const EVENT_EMBEDDING_ITEM_LIMIT = 32;
export const EVENT_EMBEDDING_PROVIDER_BATCH_SIZE = 8;
// Six columns per embedding row: 16 rows use 96 bound parameters.
export const D1_EMBEDDING_WRITE_BATCH_SIZE = 16;
const EMBEDDING_ROW_COLUMN_COUNT = 6;

// Reports one rebuild reads: those still in their source's feed, and those
// that left it recently (so a later report of the same story can join them).
export const EVENT_CURRENT_ITEM_LIMIT = 480;
export const EVENT_RECENT_ITEM_LIMIT = 240;
export const EVENT_ITEM_LIMIT =
	EVENT_CURRENT_ITEM_LIMIT + EVENT_RECENT_ITEM_LIMIT;

// Generous sizes for one JSON row, used to bound the number of statements.
// Payloads are split by their real size; if rows are ever larger, a rebuild
// writes what fits in the invocation and continues in the next one.
export const EVENT_TITLE_MAX_CHARS = 300;
export const EVENT_ROW_MAX_JSON_BYTES = 2048;
export const EVENT_TOPIC_LINK_MAX_JSON_BYTES = 96;
export const EVENT_SOURCE_LINK_MAX_JSON_BYTES = 512;
// A source belongs to at most this many topics (checked in tests), so an
// event has at most this many topic links per report.
export const EVENT_MAX_TOPICS_PER_SOURCE = 2;

const EVENT_CANDIDATE_READ_QUERY_COUNT = 2;
const EVENT_STATE_READ_QUERY_COUNT = 3;
const EVENT_STALE_DELETE_QUERY_COUNT = 3;
const EMBEDDING_USAGE_WRITES_PER_PROVIDER_CALL = 1;
const QUEUE_CONTINUATION_SUBREQUEST_COUNT = 1;
const CONTENT_READ_QUERY_COUNT = 1;
// Legacy-failure retry (event-content-retry.ts): one claiming UPDATE plus one
// more content read. Its items come out of the same EVENT_CONTENT_ITEM_LIMIT.
const LEGACY_RETRY_QUERY_COUNT = 2;

function batches(itemCount: number, batchSize: number): number {
	return Math.ceil(Math.max(itemCount, 0) / batchSize);
}

export function jsonPayloadStatementCount(
	rowCount: number,
	rowMaxBytes: number
): number {
	const rowsPerStatement = Math.max(
		1,
		Math.floor(D1_JSON_PAYLOAD_MAX_BYTES / rowMaxBytes)
	);
	return batches(rowCount, rowsPerStatement);
}

// Provider calls, their usage records and the vector upserts.
export function estimateEmbeddingSubrequests(itemCount: number): number {
	const providerCalls = batches(itemCount, EVENT_EMBEDDING_PROVIDER_BATCH_SIZE);
	return (
		providerCalls +
		providerCalls * EMBEDDING_USAGE_WRITES_PER_PROVIDER_CALL +
		batches(itemCount, D1_EMBEDDING_WRITE_BATCH_SIZE)
	);
}

// Reading the batch, fetching each page (with redirects) and storing its text,
// then queueing either the next batch or one rebuild.
export function estimateContentEnrichmentSubrequests(
	itemCount: number
): number {
	const fetchesPerItem = EVENT_CONTENT_REDIRECT_LIMIT + 1;
	return (
		CONTENT_READ_QUERY_COUNT +
		LEGACY_RETRY_QUERY_COUNT +
		(fetchesPerItem + 1) * itemCount +
		QUEUE_CONTINUATION_SUBREQUEST_COUNT
	);
}

export function takeEventContentBatch<T>(items: readonly T[]): {
	current: T[];
	remaining: T[];
} {
	return {
		current: items.slice(0, EVENT_CONTENT_ITEM_LIMIT),
		remaining: items.slice(EVENT_CONTENT_ITEM_LIMIT),
	};
}

/** Room left in a content batch of `currentCount` items. */
export function spareContentCapacity(currentCount: number): number {
	return Math.max(0, EVENT_CONTENT_ITEM_LIMIT - currentCount);
}

export interface EventWritePlanSize {
	eventRows: number;
	hasRemovals: boolean;
	sourceLinkRows: number;
	topicLinkRows: number;
}

export function estimateEventWriteQueries(plan: EventWritePlanSize): number {
	return (
		(plan.hasRemovals ? EVENT_STALE_DELETE_QUERY_COUNT : 0) +
		jsonPayloadStatementCount(plan.eventRows, EVENT_ROW_MAX_JSON_BYTES) +
		jsonPayloadStatementCount(
			plan.topicLinkRows,
			EVENT_TOPIC_LINK_MAX_JSON_BYTES
		) +
		jsonPayloadStatementCount(
			plan.sourceLinkRows,
			EVENT_SOURCE_LINK_MAX_JSON_BYTES
		)
	);
}

// Everything one rebuild invocation can do: read candidates, embed a batch,
// read the stored events, write the difference and queue a continuation.
export function estimateEventRebuildSubrequests(input: {
	embeddedItemCount: number;
	writes: EventWritePlanSize;
}): number {
	return (
		EVENT_CANDIDATE_READ_QUERY_COUNT +
		estimateEmbeddingSubrequests(input.embeddedItemCount) +
		EVENT_STATE_READ_QUERY_COUNT +
		estimateEventWriteQueries(input.writes) +
		QUEUE_CONTINUATION_SUBREQUEST_COUNT
	);
}

// The worst case: a full embedding batch, then every candidate written as its
// own event with the most topic links, after deleting stale rows.
export const EVENT_REBUILD_WORST_CASE = {
	embeddedItemCount: EVENT_EMBEDDING_ITEM_LIMIT,
	writes: {
		eventRows: EVENT_ITEM_LIMIT,
		hasRemovals: true,
		sourceLinkRows: EVENT_ITEM_LIMIT,
		topicLinkRows: EVENT_ITEM_LIMIT * EVENT_MAX_TOPICS_PER_SOURCE,
	},
} as const;

if (
	D1_EMBEDDING_WRITE_BATCH_SIZE * EMBEDDING_ROW_COLUMN_COUNT >
	D1_BOUND_PARAMETER_LIMIT
) {
	throw new Error("Embedding upserts exceed D1's bound parameter limit");
}

if (
	estimateEventRebuildSubrequests(EVENT_REBUILD_WORST_CASE) >
	CLOUDFLARE_FREE_SUBREQUEST_LIMIT
) {
	throw new Error("Event rebuild exceeds the Cloudflare Free budget");
}
