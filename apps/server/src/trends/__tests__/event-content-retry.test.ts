import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { type AppDatabase, runWithDbClient } from "@opentrends/db";
import { drizzle } from "drizzle-orm/bun-sqlite";

import {
	claimLegacyContentFailures,
	LEGACY_CONTENT_RETRY_CLAIM,
	retryLegacyContentFailures,
} from "../services/event-content-retry";
import {
	EVENT_CONTENT_ITEM_LIMIT,
	spareContentCapacity,
} from "../services/event-work-budget";
import type { SourceId } from "../types";

const migration = readFileSync(
	new URL(
		"../../../../../packages/db/src/d1-migrations/0000_romantic_puck.sql",
		import.meta.url
	),
	"utf8"
).replaceAll("--> statement-breakpoint", "");
const articleHtml = readFileSync(
	new URL("fixtures/article-page.html", import.meta.url),
	"utf8"
);

const SOURCE = "engadget" as SourceId;
const DAY_SECONDS = 86_400;
const NOW_SECONDS = 1_790_000_000;
const NOW_MS = NOW_SECONDS * 1000;

interface Row {
	ageDays?: number;
	error: string | null;
	id: string;
	sourceId?: string;
	status: string;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function createDatabase(rows: Row[]): Database {
	const database = new Database(":memory:");
	database.exec(migration);
	const insert = database.query(
		`insert into source_item
			(source_id, item_id, generation, url, title, description, rank,
			 fetched_at, last_seen_at, content_hash, content_status, content_error)
		 values (?, ?, 1, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
	);
	for (const row of rows) {
		const seenAt = NOW_SECONDS - (row.ageDays ?? 0) * DAY_SECONDS;
		insert.run(
			row.sourceId ?? SOURCE,
			row.id,
			`https://news.example.com/${row.id}`,
			`Title ${row.id}`,
			`Description ${row.id}`,
			seenAt,
			seenAt,
			`hash-${row.id}`,
			row.status,
			row.error
		);
	}
	return database;
}

function withDb<T>(database: Database, callback: () => Promise<T>): Promise<T> {
	return runWithDbClient(drizzle(database) as unknown as AppDatabase, callback);
}

function rowState(database: Database, id: string) {
	return database
		.query(
			"select content_status as status, content_error as error, content_text as text from source_item where item_id = ?"
		)
		.get(id) as { error: string | null; status: string; text: string | null };
}

describe("claimLegacyContentFailures", () => {
	test("claims only failures written by the old extractor", async () => {
		const database = createDatabase([
			{ id: "dirname", status: "failed", error: "__dirname is not defined" },
			{ id: "jsdom", status: "failed", error: "JSDOM is not a constructor" },
			{ id: "no-error", status: "failed", error: null },
			{ id: "old-http", status: "failed", error: "HTTP 404" },
			{ id: "new-fetch", status: "failed", error: "fetch: HTTP 404" },
			{
				id: "new-extract",
				status: "failed",
				error: "extract: TypeError: boom",
			},
			{ id: "claimed", status: "failed", error: LEGACY_CONTENT_RETRY_CLAIM },
			{ id: "restricted", status: "restricted", error: "restricted" },
			{ id: "ok", status: "ok", error: null },
			{ id: "pending", status: "pending", error: null },
			{
				ageDays: 10,
				id: "stale",
				status: "failed",
				error: "__dirname is not defined",
			},
			{
				id: "other-source",
				sourceId: "techcrunch",
				status: "failed",
				error: "__dirname is not defined",
			},
		]);
		try {
			const claimed = await withDb(database, () =>
				claimLegacyContentFailures(SOURCE, 10, NOW_MS)
			);

			expect(claimed.map((item) => item.itemId).sort()).toEqual([
				"dirname",
				"jsdom",
				"no-error",
				"old-http",
			]);
			expect(claimed.every((item) => item.sourceId === SOURCE)).toBe(true);
			expect(rowState(database, "dirname").error).toBe(
				LEGACY_CONTENT_RETRY_CLAIM
			);
			expect(rowState(database, "new-fetch").error).toBe("fetch: HTTP 404");
			expect(rowState(database, "stale").error).toBe(
				"__dirname is not defined"
			);
		} finally {
			database.close();
		}
	});

	test("takes the most recently seen rows first and respects the limit", async () => {
		const database = createDatabase(
			[3, 1, 2, 0].map((ageDays) => ({
				ageDays,
				id: `age-${ageDays}`,
				status: "failed",
				error: "JSDOM is not a constructor",
			}))
		);
		try {
			const claimed = await withDb(database, () =>
				claimLegacyContentFailures(SOURCE, 2, NOW_MS)
			);

			expect(claimed.map((item) => item.itemId).sort()).toEqual([
				"age-0",
				"age-1",
			]);
			expect(rowState(database, "age-2").error).toBe(
				"JSDOM is not a constructor"
			);
		} finally {
			database.close();
		}
	});

	test("never claims a row twice, even if the retry never finished", async () => {
		const database = createDatabase([
			{ id: "dirname", status: "failed", error: "__dirname is not defined" },
		]);
		try {
			const first = await withDb(database, () =>
				claimLegacyContentFailures(SOURCE, 4, NOW_MS)
			);
			const second = await withDb(database, () =>
				claimLegacyContentFailures(SOURCE, 4, NOW_MS)
			);

			expect(first).toHaveLength(1);
			expect(second).toEqual([]);
		} finally {
			database.close();
		}
	});

	test("does nothing without spare room", async () => {
		const database = createDatabase([
			{ id: "dirname", status: "failed", error: "__dirname is not defined" },
		]);
		try {
			const claimed = await withDb(database, () =>
				claimLegacyContentFailures(SOURCE, 0, NOW_MS)
			);

			expect(claimed).toEqual([]);
			expect(rowState(database, "dirname").error).toBe(
				"__dirname is not defined"
			);
		} finally {
			database.close();
		}
	});
});

describe("retryLegacyContentFailures", () => {
	test("re-extracts once and records the new outcome", async () => {
		const database = createDatabase([
			{ id: "readable", status: "failed", error: "__dirname is not defined" },
			{ id: "gone", status: "failed", error: "JSDOM is not a constructor" },
		]);
		const requested: string[] = [];
		globalThis.fetch = ((input: RequestInfo | URL) => {
			const url = String(input);
			requested.push(url);
			return Promise.resolve(
				url.endsWith("/readable")
					? new Response(articleHtml, {
							headers: { "Content-Type": "text/html; charset=utf-8" },
						})
					: new Response("Not found", { status: 404 })
			);
		}) as typeof fetch;
		try {
			const retried = await withDb(database, () =>
				retryLegacyContentFailures(SOURCE, 4, NOW_MS)
			);
			const again = await withDb(database, () =>
				retryLegacyContentFailures(SOURCE, 4, NOW_MS)
			);

			expect(retried).toBe(2);
			expect(again).toBe(0);
			expect(requested).toHaveLength(2);
			const readable = rowState(database, "readable");
			expect(readable.status).toBe("ok");
			expect(readable.error).toBeNull();
			expect(readable.text).toContain("battery-powered boats");
			expect(rowState(database, "gone")).toMatchObject({
				status: "failed",
				error: "fetch: HTTP 404",
			});
		} finally {
			database.close();
		}
	});
});

describe("spareContentCapacity", () => {
	test("lends only the room left in the current batch", () => {
		expect(spareContentCapacity(0)).toBe(EVENT_CONTENT_ITEM_LIMIT);
		expect(spareContentCapacity(1)).toBe(EVENT_CONTENT_ITEM_LIMIT - 1);
		expect(spareContentCapacity(EVENT_CONTENT_ITEM_LIMIT)).toBe(0);
		expect(spareContentCapacity(EVENT_CONTENT_ITEM_LIMIT + 3)).toBe(0);
	});
});
