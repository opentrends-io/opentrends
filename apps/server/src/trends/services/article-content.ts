import { db, schema } from "@opentrends/db";
import { and, eq, isNull } from "drizzle-orm";

import { getTopicPreset } from "../config/topics";
import { type FetchArticleOptions, isAllowedArticleUrl } from "./article-fetch";
import { MAX_ARTICLE_TEXT_LENGTH } from "./article-text";
import { extractContentText } from "./event-content-enrichment";

const { source, sourceItem } = schema;
const FAILED_RETRY_MS = 60 * 60_000;
const FETCH_LEASE_MS = 60_000;

interface ArticleRef {
	itemId: string;
	sourceId: string;
	topic: string;
}

export interface ArticleContent {
	itemId: string;
	source?: "cache" | "fetched";
	sourceId: string;
	status: "failed" | "ok" | "pending" | "restricted" | "too_short";
	text?: string;
	textLimitChars: number;
	title: string;
	truncated?: boolean | "unknown";
	url: string;
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

export async function getArticleContent(
	ref: ArticleRef,
	fetchOptions: FetchArticleOptions = {}
): Promise<ArticleContent | null> {
	if (!knownTopicSource(ref.topic, ref.sourceId)) {
		return null;
	}
	const [row] = await db
		.select({
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
		.innerJoin(
			source,
			and(
				eq(source.sourceId, sourceItem.sourceId),
				eq(source.generation, sourceItem.generation)
			)
		)
		.where(
			and(
				eq(sourceItem.sourceId, ref.sourceId),
				eq(sourceItem.itemId, ref.itemId)
			)
		)
		.limit(1);
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
	if (row.contentStatus === "ok" && row.contentText) {
		return {
			...base,
			source: "cache",
			status: "ok",
			text: row.contentText,
			truncated:
				row.contentText.length >= MAX_ARTICLE_TEXT_LENGTH ? true : "unknown",
		};
	}
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
	const extracted = await extractContentText(row.url, fetchOptions);
	await db
		.update(sourceItem)
		.set({
			contentError: extracted.error ?? null,
			contentFetchedAt: new Date(),
			contentStatus: extracted.status,
			contentText: extracted.status === "ok" ? extracted.text : null,
		})
		.where(
			and(
				eq(sourceItem.sourceId, row.sourceId),
				eq(sourceItem.itemId, row.itemId),
				eq(sourceItem.generation, row.generation),
				eq(sourceItem.contentHash, row.contentHash),
				eq(sourceItem.contentStatus, "fetching")
			)
		);
	if (extracted.status !== "ok") {
		return { ...base, status: extracted.status };
	}
	return {
		...base,
		source: "fetched",
		status: "ok",
		text: extracted.text,
		truncated: extracted.truncated ?? "unknown",
	};
}
