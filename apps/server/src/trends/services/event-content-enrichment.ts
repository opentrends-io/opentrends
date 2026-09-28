import { db, schema } from "@opentrends/db";
import { and, eq, or } from "drizzle-orm";

import type { SourceId } from "../types";
import {
	ArticleFetchError,
	type ArticlePage,
	type FetchArticleOptions,
	fetchArticleHtml,
} from "./article-fetch";
import { extractArticleText, MIN_ARTICLE_TEXT_LENGTH } from "./article-text";

const { sourceItem } = schema;
const MAX_CONTENT_ERROR_LENGTH = 300;

// Every failure this module records starts with "<stage>: ". Failed rows
// without such a prefix were written by the old jsdom path (see
// event-content-retry.ts).
export const CONTENT_ERROR_STAGES = ["fetch", "extract"] as const;
type ContentErrorStage = (typeof CONTENT_ERROR_STAGES)[number];

export interface EventSourceItemRef {
	itemId: string;
	sourceId: SourceId;
}

export interface ContentExtractionResult {
	error?: string;
	status: "failed" | "ok" | "restricted" | "too_short";
	text?: string;
}

function buildItemPredicates(items: readonly EventSourceItemRef[]) {
	return items.map((item) =>
		and(
			eq(sourceItem.sourceId, item.sourceId),
			eq(sourceItem.itemId, item.itemId)
		)
	);
}

function getFallbackText(row: {
	description: string | null;
	title: string;
}): string {
	return [row.title, row.description ?? ""].filter(Boolean).join("\n\n");
}

function describeError(stage: ContentErrorStage, error: unknown): string {
	const message =
		error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	return `${stage}: ${message}`.slice(0, MAX_CONTENT_ERROR_LENGTH);
}

/**
 * Fetches one article and extracts its body. Every failure is folded into
 * the result (never thrown) with the stage it happened in, so the row keeps
 * a useful content_error.
 */
export async function extractContentText(
	url: string,
	options: FetchArticleOptions = {}
): Promise<ContentExtractionResult> {
	let page: ArticlePage;
	try {
		page = await fetchArticleHtml(url, options);
	} catch (error) {
		if (error instanceof ArticleFetchError) {
			return {
				status: error.restricted ? "restricted" : "failed",
				error: error.restricted ? "restricted" : `fetch: ${error.message}`,
			};
		}
		return { status: "failed", error: describeError("fetch", error) };
	}
	try {
		return extractArticleText(page.html, page.url);
	} catch (error) {
		return { status: "failed", error: describeError("extract", error) };
	}
}

export async function enrichEventSourceItems(
	items: readonly EventSourceItemRef[]
): Promise<void> {
	if (items.length === 0) {
		return;
	}
	const predicates = buildItemPredicates(items);
	const rows = await db
		.select({
			sourceId: sourceItem.sourceId,
			itemId: sourceItem.itemId,
			url: sourceItem.url,
			title: sourceItem.title,
			description: sourceItem.description,
			contentFetchedAt: sourceItem.contentFetchedAt,
			contentStatus: sourceItem.contentStatus,
		})
		.from(sourceItem)
		.where(or(...predicates));

	for (const row of rows) {
		if (
			row.contentFetchedAt &&
			(row.contentStatus === "ok" || row.contentStatus === "too_short")
		) {
			continue;
		}
		const extracted = await extractContentText(row.url);
		const fallback = getFallbackText(row);
		const text =
			extracted.text && extracted.text.length >= MIN_ARTICLE_TEXT_LENGTH
				? extracted.text
				: fallback;
		await db
			.update(sourceItem)
			.set({
				contentText: text,
				contentFetchedAt: new Date(),
				contentStatus: extracted.status,
				contentError: extracted.error ?? null,
			})
			.where(
				and(
					eq(sourceItem.sourceId, row.sourceId),
					eq(sourceItem.itemId, row.itemId)
				)
			);
	}
}
