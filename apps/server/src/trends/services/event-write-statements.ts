import { db, schema } from "@opentrends/db";
import { type SQL, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { D1_JSON_PAYLOAD_MAX_BYTES } from "./event-work-budget";
import type {
	EventRow,
	EventWritePlan,
	SourceLinkRow,
	TopicLinkRow,
} from "./event-write-plan";

// Turns an EventWritePlan into D1 statements. Row sets travel as one JSON
// array per statement (read back with json_each), so a statement uses one or
// two bound parameters however many rows it writes, and a rebuild needs only
// a handful of statements.

const { trendEvent, trendEventSourceItem, trendEventTopic } = schema;
const utf8 = new TextEncoder();
const EVENT_COLUMN_COUNT = 11;
const TOPIC_LINK_COLUMN_COUNT = 3;
const SOURCE_LINK_COLUMN_COUNT = 6;

type Statement = BatchItem<"sqlite">;

// Splits rows into JSON arrays of at most D1_JSON_PAYLOAD_MAX_BYTES each.
export function toJsonPayloads<T>(
	rows: readonly T[],
	toValues: (row: T) => unknown[]
): string[] {
	const payloads: string[] = [];
	let current: string[] = [];
	let bytes = 2;
	for (const row of rows) {
		const encoded = JSON.stringify(toValues(row));
		const size = utf8.encode(encoded).length + 1;
		if (current.length > 0 && bytes + size > D1_JSON_PAYLOAD_MAX_BYTES) {
			payloads.push(`[${current.join(",")}]`);
			current = [];
			bytes = 2;
		}
		current.push(encoded);
		bytes += size;
	}
	if (current.length > 0) {
		payloads.push(`[${current.join(",")}]`);
	}
	return payloads;
}

function jsonValues(values: readonly string[]): SQL {
	return sql`(SELECT value FROM json_each(${JSON.stringify(values)}))`;
}

function jsonRows(payload: string, columnCount: number): SQL {
	const columns = sql.join(
		Array.from({ length: columnCount }, (_, index) =>
			sql.raw(`json_extract(value, '$[${index}]')`)
		),
		sql`, `
	);
	// "WHERE true" keeps SQLite from reading ON CONFLICT as a join constraint.
	return sql`SELECT ${columns} FROM json_each(${payload}) WHERE true`;
}

function keysIn(key: SQL, payload: string): SQL {
	return sql`${key} IN (SELECT json_extract(value, '$[0]') FROM json_each(${payload}))`;
}

// char(31) matches LINK_KEY_SEPARATOR in event-write-plan.ts.
const sourceLinkKeySql = sql`${trendEventSourceItem.eventId} || char(31) || ${trendEventSourceItem.sourceId} || char(31) || ${trendEventSourceItem.itemId}`;
const topicLinkKeySql = sql`${trendEventTopic.eventId} || char(31) || ${trendEventTopic.topicId}`;

function sourceLinkDeletes(plan: EventWritePlan): Statement[] {
	const statements: Statement[] = [];
	if (plan.deleteSourceLinksOutside) {
		statements.push(
			db
				.delete(trendEventSourceItem)
				.where(
					sql`${trendEventSourceItem.eventId} NOT IN ${jsonValues(plan.deleteSourceLinksOutside)}`
				)
		);
	}
	for (const payload of toJsonPayloads(plan.deleteSourceLinkKeys, (key) => [
		key,
	])) {
		statements.push(
			db.delete(trendEventSourceItem).where(keysIn(sourceLinkKeySql, payload))
		);
	}
	return statements;
}

function topicLinkDeletes(plan: EventWritePlan): Statement[] {
	const statements: Statement[] = [];
	if (plan.deleteTopicLinksOutside) {
		const { eventIds, topicIds } = plan.deleteTopicLinksOutside;
		statements.push(
			db
				.delete(trendEventTopic)
				.where(
					sql`${trendEventTopic.eventId} NOT IN ${jsonValues(eventIds)} OR ${trendEventTopic.topicId} NOT IN ${jsonValues(topicIds)}`
				)
		);
	}
	for (const payload of toJsonPayloads(plan.deleteTopicLinkKeys, (key) => [
		key,
	])) {
		statements.push(
			db.delete(trendEventTopic).where(keysIn(topicLinkKeySql, payload))
		);
	}
	return statements;
}

function eventDeletes(plan: EventWritePlan): Statement[] {
	if (!plan.deleteEventsOutside) {
		return [];
	}
	return [
		db
			.delete(trendEvent)
			.where(
				sql`${trendEvent.eventId} NOT IN ${jsonValues(plan.deleteEventsOutside)}`
			),
	];
}

function eventUpserts(rows: EventRow[], nowSeconds: number): Statement[] {
	return toJsonPayloads(rows, (row) => [
		row.eventId,
		row.topicId,
		row.title,
		row.summary,
		row.score,
		row.sourceCount,
		row.firstSeenAt,
		row.lastSeenAt,
		row.primarySourceId,
		row.primaryItemId,
		nowSeconds,
	]).map((payload) =>
		db
			.insert(trendEvent)
			.select(jsonRows(payload, EVENT_COLUMN_COUNT))
			.onConflictDoUpdate({
				target: trendEvent.eventId,
				set: {
					firstSeenAt: sql`excluded.first_seen_at`,
					lastSeenAt: sql`excluded.last_seen_at`,
					primaryItemId: sql`excluded.primary_item_id`,
					primarySourceId: sql`excluded.primary_source_id`,
					score: sql`excluded.score`,
					sourceCount: sql`excluded.source_count`,
					summary: sql`excluded.summary`,
					title: sql`excluded.title`,
					topicId: sql`excluded.topic_id`,
					updatedAt: sql`excluded.updated_at`,
				},
			})
	);
}

function topicLinkInserts(
	rows: TopicLinkRow[],
	nowSeconds: number
): Statement[] {
	return toJsonPayloads(rows, (row) => [
		row.eventId,
		row.topicId,
		nowSeconds,
	]).map((payload) =>
		db
			.insert(trendEventTopic)
			.select(jsonRows(payload, TOPIC_LINK_COLUMN_COUNT))
			.onConflictDoNothing()
	);
}

function sourceLinkUpserts(
	rows: SourceLinkRow[],
	nowSeconds: number
): Statement[] {
	return toJsonPayloads(rows, (row) => [
		row.eventId,
		row.sourceId,
		row.itemId,
		row.isPrimary,
		row.mergeConfidence,
		nowSeconds,
	]).map((payload) =>
		db
			.insert(trendEventSourceItem)
			.select(jsonRows(payload, SOURCE_LINK_COLUMN_COUNT))
			.onConflictDoUpdate({
				target: [
					trendEventSourceItem.eventId,
					trendEventSourceItem.sourceId,
					trendEventSourceItem.itemId,
				],
				set: {
					isPrimary: sql`excluded.is_primary`,
					mergeConfidence: sql`excluded.merge_confidence`,
				},
			})
	);
}

// In dependency order: removals first, then events before the links that
// point to them, so any prefix of the list leaves the tables consistent.
export function buildEventWriteStatements(
	plan: EventWritePlan,
	nowSeconds: number
): Statement[] {
	return [
		...sourceLinkDeletes(plan),
		...topicLinkDeletes(plan),
		...eventDeletes(plan),
		...eventUpserts(plan.upsertEvents, nowSeconds),
		...topicLinkInserts(plan.insertTopicLinks, nowSeconds),
		...sourceLinkUpserts(plan.upsertSourceLinks, nowSeconds),
	];
}
