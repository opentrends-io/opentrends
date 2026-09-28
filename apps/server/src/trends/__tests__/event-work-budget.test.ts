import { describe, expect, it } from "bun:test";
import {
	CLOUDFLARE_FREE_SUBREQUEST_LIMIT,
	D1_BOUND_PARAMETER_LIMIT,
	D1_EMBEDDING_WRITE_BATCH_SIZE,
	D1_JSON_PAYLOAD_MAX_BYTES,
	EVENT_CONTENT_ITEM_LIMIT,
	EVENT_EMBEDDING_ITEM_LIMIT,
	EVENT_REBUILD_WORST_CASE,
	EVENT_ROW_MAX_JSON_BYTES,
	EVENT_SOURCE_LINK_MAX_JSON_BYTES,
	EVENT_TITLE_MAX_CHARS,
	estimateContentEnrichmentSubrequests,
	estimateEmbeddingSubrequests,
	estimateEventRebuildSubrequests,
	jsonPayloadStatementCount,
	takeEventContentBatch,
} from "../services/event-work-budget";
import { toJsonPayloads } from "../services/event-write-statements";

describe("Cloudflare Free event-work budget", () => {
	it("keeps one content-enrichment task below 50 subrequests", () => {
		expect(
			estimateContentEnrichmentSubrequests(EVENT_CONTENT_ITEM_LIMIT)
		).toBeLessThan(CLOUDFLARE_FREE_SUBREQUEST_LIMIT);
	});

	it("continues oversized content work without duplicating the current batch", () => {
		const input = Array.from(
			{ length: EVENT_CONTENT_ITEM_LIMIT * 2 + 1 },
			(_, index) => index
		);
		const result = takeEventContentBatch(input);

		expect(result.current).toEqual(input.slice(0, EVENT_CONTENT_ITEM_LIMIT));
		expect(result.remaining).toEqual(input.slice(EVENT_CONTENT_ITEM_LIMIT));
	});

	it("counts provider calls, usage records and vector upserts for embeddings", () => {
		// 32 items: 4 provider calls, 4 usage rows, 2 upserts of 16 rows.
		expect(estimateEmbeddingSubrequests(EVENT_EMBEDDING_ITEM_LIMIT)).toBe(10);
		expect(D1_EMBEDDING_WRITE_BATCH_SIZE * 6).toBeLessThanOrEqual(
			D1_BOUND_PARAMETER_LIMIT
		);
	});

	it("fits the worst-case rebuild of every event source in one invocation", () => {
		expect(
			estimateEventRebuildSubrequests(EVENT_REBUILD_WORST_CASE)
		).toBeLessThanOrEqual(CLOUDFLARE_FREE_SUBREQUEST_LIMIT);
	});

	it("needs only a few statements when nothing changed", () => {
		expect(
			estimateEventRebuildSubrequests({
				embeddedItemCount: 0,
				writes: {
					eventRows: 0,
					hasRemovals: false,
					sourceLinkRows: 0,
					topicLinkRows: 0,
				},
			})
		).toBe(6);
	});
});

describe("JSON row payloads", () => {
	it("splits rows so no payload exceeds the statement budget", () => {
		const rows = Array.from({ length: 500 }, (_, index) => ({
			id: `event-${index}`,
			title: "标题".repeat(EVENT_TITLE_MAX_CHARS / 2),
		}));
		const payloads = toJsonPayloads(rows, (row) => [row.id, row.title]);

		for (const payload of payloads) {
			expect(new TextEncoder().encode(payload).length).toBeLessThanOrEqual(
				D1_JSON_PAYLOAD_MAX_BYTES
			);
		}
		expect(payloads.flatMap((payload) => JSON.parse(payload))).toHaveLength(
			rows.length
		);
		expect(payloads.length).toBeLessThanOrEqual(
			jsonPayloadStatementCount(rows.length, EVENT_ROW_MAX_JSON_BYTES)
		);
	});

	it("bounds a source link row by its budgeted size", () => {
		const [payload] = toJsonPayloads(
			[
				[
					"event-12345678",
					"techcrunch-robotics",
					`https://x.com/${"a".repeat(300)}`,
					1,
					99,
					1_790_000_000,
				],
			],
			(row) => row
		);
		expect(new TextEncoder().encode(payload).length).toBeLessThan(
			EVENT_SOURCE_LINK_MAX_JSON_BYTES
		);
	});
});
