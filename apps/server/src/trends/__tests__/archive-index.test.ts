import { describe, expect, it } from "bun:test";

import {
	ARCHIVE_INDEX_FRESH_MS,
	type ArchiveIndex,
	buildArchiveIndex,
	countArchiveDays,
	resolveArchiveIndex,
} from "../services/archive-index";

const NOW = 1_800_000_000_000;

function index(generatedAt: number, days: string[]): ArchiveIndex {
	return { generatedAt, topics: { ai: { en: days } } };
}

function deps(options: {
	build?: () => Promise<ArchiveIndex>;
	stored?: ArchiveIndex | null;
}) {
	const writes: ArchiveIndex[] = [];
	let builds = 0;
	return {
		builds: () => builds,
		deps: {
			build: () => {
				builds += 1;
				return options.build
					? options.build()
					: Promise.resolve(index(NOW, ["2026-09-28"]));
			},
			now: () => NOW,
			readStored: () => Promise.resolve(options.stored ?? null),
			writeStored: (value: ArchiveIndex) => {
				writes.push(value);
				return Promise.resolve();
			},
		},
		writes,
	};
}

describe("archive index", () => {
	it("lists days per topic and language, dropping empty ones", async () => {
		const built = await buildArchiveIndex({
			langs: ["en", "zh"],
			listDays: (topic, lang) =>
				Promise.resolve(
					topic === "ai" && lang === "zh" ? ["2026-09-28", "2026-09-27"] : []
				),
			now: () => NOW,
			topics: ["featured", "ai"],
		});
		expect(built).toEqual({
			generatedAt: NOW,
			topics: { ai: { zh: ["2026-09-28", "2026-09-27"] } },
		});
		expect(countArchiveDays(built)).toBe(2);
	});

	it("serves a fresh stored copy without listing KV", async () => {
		const stored = index(NOW - ARCHIVE_INDEX_FRESH_MS + 1000, ["2026-09-27"]);
		const run = deps({ stored });
		const result = await resolveArchiveIndex(run.deps);
		expect(result).toEqual({ index: stored, source: "stored" });
		expect(run.builds()).toBe(0);
	});

	it("rebuilds a stale copy and stores the new one", async () => {
		const stored = index(NOW - ARCHIVE_INDEX_FRESH_MS - 1, ["2026-09-27"]);
		const run = deps({ stored });
		const result = await resolveArchiveIndex(run.deps);
		expect(result.source).toBe("built");
		expect(result.index.topics.ai?.en).toEqual(["2026-09-28"]);
		expect(run.writes).toHaveLength(1);
	});

	it("serves a stale copy at once and rebuilds it in the background", async () => {
		const stored = index(NOW - ARCHIVE_INDEX_FRESH_MS - 1, ["2026-09-27"]);
		const run = deps({ stored });
		const deferred: Promise<unknown>[] = [];
		const result = await resolveArchiveIndex({
			...run.deps,
			defer: (task) => {
				deferred.push(task);
			},
		});
		expect(result).toEqual({ index: stored, source: "stale" });
		expect(deferred).toHaveLength(1);
		await Promise.all(deferred);
		expect(run.writes).toHaveLength(1);
		expect(run.writes[0]?.topics.ai?.en).toEqual(["2026-09-28"]);
	});

	it("falls back to the stale copy when the rebuild fails", async () => {
		const stored = index(NOW - ARCHIVE_INDEX_FRESH_MS - 1, ["2026-09-27"]);
		const run = deps({
			build: () => Promise.reject(new Error("KV list failed")),
			stored,
		});
		const result = await resolveArchiveIndex(run.deps);
		expect(result).toEqual({ index: stored, source: "stale" });
		expect(run.writes).toHaveLength(0);
	});

	it("keeps the stored copy when a rebuild comes back far shorter", async () => {
		const days = Array.from(
			{ length: 10 },
			(_, i) => `2026-09-${String(10 + i).padStart(2, "0")}`
		);
		const stored = index(NOW - ARCHIVE_INDEX_FRESH_MS - 1, days);
		const run = deps({
			build: () => Promise.resolve(index(NOW, [])),
			stored,
		});
		const result = await resolveArchiveIndex(run.deps);
		expect(result).toEqual({ index: stored, source: "stale" });
		expect(run.writes).toHaveLength(0);
	});

	it("reports failure only when there is nothing to fall back to", async () => {
		const run = deps({
			build: () => Promise.reject(new Error("KV list failed")),
			stored: null,
		});
		await expect(resolveArchiveIndex(run.deps)).rejects.toThrow(
			"KV list failed"
		);
	});
});
