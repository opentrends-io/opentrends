import { db, schema } from "@opentrends/db";
import { and, eq, isNull } from "drizzle-orm";

import { getTopicPreset } from "../config/topics";
import { type FetchArticleOptions, isAllowedArticleUrl } from "./article-fetch";
import { MAX_ARTICLE_TEXT_LENGTH, truncateText } from "./article-text";
import { extractContentText } from "./event-content-enrichment";
import {
	ArticleContentChangedError,
	articleCursorSchema,
	contentVersion,
	decodeCursor,
	encodeCursor,
	ResearchInputError,
} from "./research-cursor";

const { source, sourceItem } = schema;
const FAILED_RETRY_MS = 60 * 60_000;
const FETCH_LEASE_MS = 60_000;
export const MAX_ARTICLE_BODY_LENGTH = 200_000;

interface ArticleRef {
	cursor?: string;
	itemId: string;
	sourceId: string;
	topic: string;
}

export interface ArticleContent {
	contentTruncated?: boolean;
	contentVersion?: string;
	hasMore?: boolean;
	itemId: string;
	nextCursor?: string;
	offset?: number;
	source?: "cache" | "fetched";
	sourceId: string;
	status: "failed" | "ok" | "pending" | "restricted" | "too_short";
	text?: string;
	textLimitChars: number;
	title: string;
	totalChars?: number;
	truncated?: boolean | "unknown";
	url: string;
}

function pageBody(
	base: Pick<
		ArticleContent,
		"itemId" | "sourceId" | "title" | "url" | "textLimitChars"
	>,
	body: { text: string; version: string; truncated: boolean },
	cursor: ReturnType<typeof articleCursorSchema.parse> | undefined,
	origin: "cache" | "fetched"
): ArticleContent {
	if (
		cursor &&
		(cursor.version !== body.version || cursor.offset >= body.text.length)
	) {
		throw new ArticleContentChangedError(
			"Article changed; restart without a cursor."
		);
	}
	const offset = cursor?.offset ?? 0;
	const first = body.text.charCodeAt(offset);
	if (first >= 0xdc_00 && first <= 0xdf_ff) {
		throw new ResearchInputError("Cursor splits a Unicode character.");
	}
	let end = Math.min(offset + MAX_ARTICLE_TEXT_LENGTH, body.text.length);
	const last = body.text.charCodeAt(end - 1);
	if (end < body.text.length && last >= 0xd8_00 && last <= 0xdb_ff) {
		end -= 1;
	}
	const text = body.text.slice(offset, end);
	const hasMore = end < body.text.length;
	return {
		...base,
		source: origin,
		status: "ok",
		text,
		offset,
		hasMore,
		totalChars: body.text.length,
		contentVersion: body.version,
		contentTruncated: body.truncated,
		truncated: hasMore || body.truncated,
		nextCursor: hasMore
			? encodeCursor({
					v: 1,
					sourceId: base.sourceId,
					itemId: base.itemId,
					offset: end,
					version: body.version,
				})
			: undefined,
	};
}

function knownTopicSource(topic: string, sourceId: string): boolean {
	return (
		getTopicPreset(topic)?.sections.some((section) =>
			section.sourceIds.includes(sourceId)
		) ?? false
	);
}

function publicStatus(value: string): ArticleContent["status"] {
	if (value === "restricted" || value === "too_short" || value === "failed") {
		return value;
	}
	return "pending";
}

async function readArticle(ref: ArticleRef) {
	const [row] = await db
		.select({
			articleText: sourceItem.articleText,
			articleVersion: sourceItem.articleVersion,
			articleContentHash: sourceItem.articleContentHash,
			articleTruncated: sourceItem.articleTruncated,
			contentFetchedAt: sourceItem.contentFetchedAt,
			contentHash: sourceItem.contentHash,
			contentStatus: sourceItem.contentStatus,
			contentText: sourceItem.contentText,
			generation: sourceItem.generation,
			itemId: sourceItem.itemId,
			sourceId: sourceItem.sourceId,
			title: sourceItem.title,
			url: sourceItem.url,
		})
		.from(sourceItem)
		.innerJoin(source, eq(source.sourceId, sourceItem.sourceId))
		.where(
			and(
				eq(sourceItem.sourceId, ref.sourceId),
				eq(sourceItem.itemId, ref.itemId)
			)
		)
		.limit(1);
	return row;
}

export async function getArticleContent(
	ref: ArticleRef,
	fetchOptions: FetchArticleOptions = {}
): Promise<ArticleContent | null> {
	if (!knownTopicSource(ref.topic, ref.sourceId)) {
		return null;
	}
	const cursor = ref.cursor
		? decodeCursor(ref.cursor, articleCursorSchema)
		: undefined;
	if (
		cursor &&
		(cursor.itemId !== ref.itemId || cursor.sourceId !== ref.sourceId)
	) {
		throw new ResearchInputError("Cursor belongs to a different article.");
	}
	const row = await readArticle(ref);
	if (!(row && isAllowedArticleUrl(row.url))) {
		return null;
	}
	const base = {
		itemId: row.itemId,
		sourceId: row.sourceId,
		textLimitChars: MAX_ARTICLE_TEXT_LENGTH,
		title: row.title,
		url: row.url,
	};
	if (
		row.articleText &&
		row.articleVersion &&
		row.articleContentHash === row.contentHash
	) {
		return pageBody(
			base,
			{
				text: row.articleText,
				version: row.articleVersion,
				truncated: row.articleTruncated ?? true,
			},
			cursor,
			"cache"
		);
	}
	if (cursor) {
		throw new ArticleContentChangedError(
			"Article changed; restart without a cursor."
		);
	}
	return fetchAndCacheArticle(row, base, fetchOptions);
}

async function fetchAndCacheArticle(
	row: NonNullable<Awaited<ReturnType<typeof readArticle>>>,
	base: Pick<
		ArticleContent,
		"itemId" | "sourceId" | "title" | "url" | "textLimitChars"
	>,
	fetchOptions: FetchArticleOptions
): Promise<ArticleContent> {
	if (row.contentStatus === "restricted" || row.contentStatus === "too_short") {
		return { ...base, status: publicStatus(row.contentStatus) };
	}
	const now = Date.now();
	if (
		row.contentFetchedAt &&
		((row.contentStatus === "fetching" &&
			now - row.contentFetchedAt.getTime() < FETCH_LEASE_MS) ||
			(row.contentStatus === "failed" &&
				now - row.contentFetchedAt.getTime() < FAILED_RETRY_MS))
	) {
		return { ...base, status: publicStatus(row.contentStatus) };
	}
	const claimed = await db
		.update(sourceItem)
		.set({ contentFetchedAt: new Date(now), contentStatus: "fetching" })
		.where(
			and(
				eq(sourceItem.sourceId, row.sourceId),
				eq(sourceItem.itemId, row.itemId),
				eq(sourceItem.generation, row.generation),
				eq(sourceItem.contentHash, row.contentHash),
				eq(sourceItem.contentStatus, row.contentStatus),
				row.contentFetchedAt
					? eq(sourceItem.contentFetchedAt, row.contentFetchedAt)
					: isNull(sourceItem.contentFetchedAt)
			)
		)
		.returning({ itemId: sourceItem.itemId });
	if (claimed.length === 0) {
		return { ...base, status: "pending" };
	}
	const extracted = await extractContentText(row.url, {
		...fetchOptions,
		maxTextLength: MAX_ARTICLE_BODY_LENGTH,
	});
	const version =
		extracted.status === "ok"
			? await contentVersion([
					row.contentHash,
					extracted.text,
					extracted.truncated,
				])
			: null;
	const written = await db
		.update(sourceItem)
		.set({
			contentError: extracted.error ?? null,
			contentFetchedAt: new Date(),
			contentStatus: extracted.status,
			contentText:
				extracted.status === "ok"
					? truncateText(extracted.text ?? "", MAX_ARTICLE_TEXT_LENGTH)
					: row.contentText,
			...(extracted.status === "ok"
				? {
						articleText: extracted.text,
						articleVersion: version,
						articleContentHash: row.contentHash,
						articleTruncated: extracted.truncated ?? true,
					}
				: {}),
		})
		.where(
			and(
				eq(sourceItem.sourceId, row.sourceId),
				eq(sourceItem.itemId, row.itemId),
				eq(sourceItem.contentHash, row.contentHash),
				eq(sourceItem.contentStatus, "fetching"),
				eq(sourceItem.contentFetchedAt, new Date(now))
			)
		)
		.returning({ itemId: sourceItem.itemId });
	if (written.length === 0) {
		throw new ArticleContentChangedError(
			"Article changed during extraction; restart without a cursor."
		);
	}
	if (extracted.status !== "ok") {
		return { ...base, status: extracted.status };
	}
	return pageBody(
		base,
		{
			text: extracted.text ?? "",
			version: version ?? "",
			truncated: extracted.truncated ?? true,
		},
		undefined,
		"fetched"
	);
}
