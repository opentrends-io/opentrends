import { db } from "@opentrends/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getSourcePreset } from "../config/sources";
import { getTopicPreset, topicForSource, topicPresets } from "../config/topics";
import type { SourceId } from "../types";
import {
	decodeCursor,
	encodeCursor,
	ResearchInputError,
} from "./research-cursor";

const DAY_SECONDS = 86_400;
const dateInput = z.union([z.iso.datetime({ offset: true }), z.iso.date()]);
const searchInput = z.object({
	query: z.string().trim().min(1).max(200),
	topic: z.string().optional(),
	since: dateInput.optional(),
	until: dateInput.optional(),
	limit: z.coerce.number().int().min(1).max(100).default(30),
	cursor: z.string().max(4000).optional(),
});
const cursorSchema = z.object({
	v: z.literal(1),
	query: z.string(),
	topic: z.string().optional(),
	since: z.number().int().nonnegative().max(253_402_300_799),
	until: z.number().int().nonnegative().max(253_402_300_799),
	time: z.number().int().nonnegative().max(253_402_300_799),
	sourceId: z.string(),
	itemId: z.string(),
});

interface SearchRow {
	description: string | null;
	fetchedAt: number;
	itemId: string;
	itemTime: number;
	originalTitle: string | null;
	publishedAt: number | null;
	sourceId: SourceId;
	title: string;
	url: string;
}

function seconds(value: string | undefined): number | undefined {
	return value === undefined ? undefined : Math.ceil(Date.parse(value) / 1000);
}

function prepareSearch(input: unknown, now: number) {
	const parsed = searchInput.safeParse(input);
	if (!parsed.success) {
		throw new ResearchInputError(
			"Use a nonempty query (max 200 characters), limit 1–100, and ISO dates or timestamps with timezone."
		);
	}
	const args = parsed.data;
	const preset = args.topic ? getTopicPreset(args.topic) : undefined;
	if (args.topic && !preset) {
		throw new ResearchInputError("Unknown topic.");
	}
	const cursor = args.cursor
		? decodeCursor(args.cursor, cursorSchema)
		: undefined;
	const until = seconds(args.until) ?? cursor?.until ?? Math.ceil(now / 1000);
	const since = seconds(args.since) ?? cursor?.since ?? until - 7 * DAY_SECONDS;
	if (since < 0 || since >= until || until - since > 31 * DAY_SECONDS) {
		throw new ResearchInputError(
			"The time range must be positive and at most 31 days; since is inclusive, until exclusive."
		);
	}
	if (
		cursor &&
		(cursor.query !== args.query ||
			cursor.topic !== args.topic ||
			cursor.since !== since ||
			cursor.until !== until ||
			cursor.time < since ||
			cursor.time >= until)
	) {
		throw new ResearchInputError(
			"Cursor does not match this search; keep query, topic and time range unchanged."
		);
	}
	const presets = preset ? [preset] : Object.values(topicPresets);
	const sourceIds = [
		...new Set(
			presets.flatMap((entry) =>
				entry.sections.flatMap((section) => section.sourceIds)
			)
		),
	];
	return { ...args, cursor, since, until, sourceIds };
}

/** Query retained records directly: no feed refreshes, per-source preview caps or LLM calls. */
export async function searchArticles(input: unknown, now = Date.now()) {
	const args = prepareSearch(input, now);
	const itemTime = sql`coalesce(i.published_at, i.fetched_at)`;
	const searchable = sql`lower(i.title || char(10) || coalesce(i.description, '') || char(10) || coalesce(json_extract(i.original, '$.title'), '') || char(10) || coalesce(json_extract(i.original, '$.description'), ''))`;
	const conditions = sql`i.source_id IN (SELECT value FROM json_each(${JSON.stringify(args.sourceIds)}))
		AND ${itemTime} >= ${args.since} AND ${itemTime} < ${args.until}
		AND instr(${searchable}, ${args.query.toLowerCase()}) > 0`;
	const after = args.cursor
		? sql`AND (
		${itemTime} < ${args.cursor.time} OR
		(${itemTime} = ${args.cursor.time} AND i.source_id > ${args.cursor.sourceId}) OR
		(${itemTime} = ${args.cursor.time} AND i.source_id = ${args.cursor.sourceId} AND i.item_id > ${args.cursor.itemId})
	)`
		: sql``;
	const [counts, rows] = await Promise.all([
		db.all<{ total: number }>(
			sql`SELECT count(*) AS total FROM source_item i INNER JOIN source s ON s.source_id = i.source_id WHERE ${conditions}`
		),
		db.all<SearchRow>(sql`SELECT i.item_id AS itemId, i.source_id AS sourceId, i.title,
			substr(i.description, 1, 280) AS description, i.url,
			i.published_at AS publishedAt, i.fetched_at AS fetchedAt,
			json_extract(i.original, '$.title') AS originalTitle, ${itemTime} AS itemTime
			FROM source_item i INNER JOIN source s ON s.source_id = i.source_id
			WHERE ${conditions} ${after}
			ORDER BY ${itemTime} DESC, i.source_id ASC, i.item_id ASC LIMIT ${args.limit + 1}`),
	]);
	const page = rows.slice(0, args.limit);
	const hasMore = rows.length > args.limit;
	const last = page.at(-1);
	return {
		query: args.query,
		since: new Date(args.since * 1000).toISOString(),
		until: new Date(args.until * 1000).toISOString(),
		total: counts[0]?.total ?? 0,
		hasMore,
		nextCursor:
			hasMore && last
				? encodeCursor({
						v: 1,
						query: args.query,
						topic: args.topic,
						since: args.since,
						until: args.until,
						time: last.itemTime,
						sourceId: last.sourceId,
						itemId: last.itemId,
					})
				: undefined,
		coverage: "retained_feed_history",
		searchFields: [
			"title",
			"description",
			"original.title",
			"original.description",
		],
		language: "original",
		datePolicy:
			"publishedAt, falling back to fetchedAt; since inclusive, until exclusive",
		hits: page.map((row) => ({
			itemId: row.itemId,
			sourceId: row.sourceId,
			title: row.title,
			originalTitle: row.originalTitle ?? undefined,
			description: row.description ?? undefined,
			url: row.url,
			source: getSourcePreset(row.sourceId)?.name ?? row.sourceId,
			topic: args.topic ?? topicForSource(row.sourceId) ?? "featured",
			publishedAt:
				row.publishedAt === null
					? undefined
					: new Date(row.publishedAt * 1000).toISOString(),
			fetchedAt: new Date(row.fetchedAt * 1000).toISOString(),
			date: new Date(row.itemTime * 1000).toISOString(),
			dateBasis: row.publishedAt === null ? "fetchedAt" : "publishedAt",
		})),
	};
}
