import { describe, expect, test } from "bun:test";
import { runWithWorkerBindings, type WorkerBindings } from "../../runtime";
import {
	sourceErrorBackoffMs,
	writeSnapshotError,
} from "../cache/source-cache";
import { getSourcesStatus } from "../services/get-sources-status";
import type { SourceId } from "../types";
import { SqliteD1 } from "./support/d1-sqlite";

const NOW = 1_794_400_000_000;

describe("sourceErrorBackoffMs", () => {
	test("a short outage is retried within minutes", () => {
		expect(sourceErrorBackoffMs(1)).toBe(30_000);
		expect(sourceErrorBackoffMs(4)).toBe(120_000);
		expect(sourceErrorBackoffMs(10)).toBe(300_000);
	});

	test("a source failing for hours is checked rarely", () => {
		expect(sourceErrorBackoffMs(11)).toBe(30 * 60_000);
		expect(sourceErrorBackoffMs(48)).toBe(30 * 60_000);
		expect(sourceErrorBackoffMs(49)).toBe(3 * 3_600_000);
		expect(sourceErrorBackoffMs(1028)).toBe(3 * 3_600_000);
	});
});

function row(db: SqliteD1, sourceId: string) {
	return db.all<{ error_count: number; expires_at: number; status: string }>(
		"SELECT error_count, expires_at, status FROM source WHERE source_id=?",
		sourceId
	)[0];
}

describe("a source that has never been read", () => {
	test("counts its failures, so it backs off instead of retrying every 30 s", async () => {
		const db = new SqliteD1();
		try {
			await db.run(async () => {
				for (let attempt = 0; attempt < 12; attempt += 1) {
					// No readable snapshot exists for it, as in production.
					await writeSnapshotError({
						errorMessage: "HTTP 404 for https://example.test/feed.xml",
						fetchedAt: NOW + attempt,
						previous: null,
						sourceId: "yahoo-finance" as SourceId,
						staleTtlMs: 3_600_000,
					});
				}
			});
			const stored = row(db, "yahoo-finance");
			expect(stored?.error_count).toBe(12);
			expect(stored?.status).toBe("error");
			expect((stored?.expires_at ?? 0) * 1000).toBe(
				Math.floor((NOW + 11 + 30 * 60_000) / 1000) * 1000
			);
		} finally {
			db.close();
		}
	});

	test("shows as failing with its error, not as missing", async () => {
		const db = new SqliteD1();
		try {
			const bindings = {
				BETTER_AUTH_SECRET: "fixture".repeat(8),
				BETTER_AUTH_URL: "http://localhost:3000",
				CORS_ORIGIN: "http://localhost:3001",
				DB: db.binding(),
			} as unknown as WorkerBindings;
			const status = await runWithWorkerBindings(bindings, async () => {
				await writeSnapshotError({
					errorMessage: "HTTP 404 for https://www.indiehackers.com/feed.xml",
					fetchedAt: NOW,
					previous: null,
					sourceId: "indiehackers" as SourceId,
					staleTtlMs: 3_600_000,
				});
				return await getSourcesStatus();
			});
			const failing = status.sources.find(
				(entry) => entry.sourceId === "indiehackers"
			);
			expect(failing).toMatchObject({
				errorCount: 1,
				lastError: "HTTP 404 for https://www.indiehackers.com/feed.xml",
				status: "error",
			});
			expect(failing?.fetchedAt).toBeUndefined();
			// A source nobody has tried yet is still reported as missing.
			const untried = status.sources.find(
				(entry) => entry.sourceId === "9to5mac"
			);
			expect(untried).toMatchObject({ errorCount: 0, status: "missing" });
			expect(status.totals.error).toBe(1);
		} finally {
			db.close();
		}
	});
});
