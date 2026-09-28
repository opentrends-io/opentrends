// One-time, self-draining retry for article bodies that failed before the
// Workers-compatible extractor shipped (jsdom threw "__dirname is not
// defined" / "JSDOM is not a constructor" on every item). Errors written by
// the current code carry a stage prefix ("fetch: …", "extract: …"); anything
// else on a failed row is from the old code path.
//
// Rows are claimed with an UPDATE … RETURNING before they are fetched, so each
// one is retried at most once: a page that fails again keeps its new
// stage-prefixed error, and a claim whose invocation dies stays claimed.
import { db, schema } from "@opentrends/db";
import { and, desc, eq, gte, inArray, isNull, notLike, or } from "drizzle-orm";

import type { SourceId } from "../types";
import {
	CONTENT_ERROR_STAGES,
	type EventSourceItemRef,
	enrichEventSourceItems,
} from "./event-content-enrichment";

const { sourceItem } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;

export const LEGACY_CONTENT_RETRY_WINDOW_MS = 7 * DAY_MS;
export const LEGACY_CONTENT_RETRY_CLAIM = "retry: claimed";
const CURRENT_ERROR_PATTERNS = [...CONTENT_ERROR_STAGES, "retry"].map(
	(stage) => `${stage}:%`
);

function isLegacyFailure() {
	const notNewFormat = CURRENT_ERROR_PATTERNS.map((pattern) =>
		notLike(sourceItem.contentError, pattern)
	);
	return and(
		eq(sourceItem.contentStatus, "failed"),
		or(isNull(sourceItem.contentError), and(...notNewFormat))
	);
}

/**
 * Marks up to `limit` legacy failures of one source, seen within the retry
 * window, as claimed and returns them. The fetched_at bound lets D1 use the
 * (source_id, fetched_at) index instead of reading the source's history.
 */
export async function claimLegacyContentFailures(
	sourceId: SourceId,
	limit: number,
	now = Date.now()
): Promise<EventSourceItemRef[]> {
	if (limit <= 0) {
		return [];
	}
	const cutoff = new Date(now - LEGACY_CONTENT_RETRY_WINDOW_MS);
	const candidates = db
		.select({ itemId: sourceItem.itemId })
		.from(sourceItem)
		.where(
			and(
				eq(sourceItem.sourceId, sourceId),
				gte(sourceItem.fetchedAt, cutoff),
				gte(sourceItem.lastSeenAt, cutoff),
				isLegacyFailure()
			)
		)
		.orderBy(desc(sourceItem.lastSeenAt))
		.limit(limit);
	const claimed = await db
		.update(sourceItem)
		.set({ contentError: LEGACY_CONTENT_RETRY_CLAIM })
		.where(
			and(
				eq(sourceItem.sourceId, sourceId),
				inArray(sourceItem.itemId, candidates),
				isLegacyFailure()
			)
		)
		.returning({ itemId: sourceItem.itemId, sourceId: sourceItem.sourceId });
	return claimed.map((row) => ({
		itemId: row.itemId,
		sourceId: row.sourceId as SourceId,
	}));
}

/**
 * Retries up to `limit` legacy failures of one source in this invocation and
 * returns how many were claimed. Callers pass only the spare room left in the
 * current content batch, so the subrequest budget does not grow.
 */
export async function retryLegacyContentFailures(
	sourceId: SourceId,
	limit: number,
	now = Date.now()
): Promise<number> {
	const claimed = await claimLegacyContentFailures(sourceId, limit, now);
	await enrichEventSourceItems(claimed);
	return claimed.length;
}
