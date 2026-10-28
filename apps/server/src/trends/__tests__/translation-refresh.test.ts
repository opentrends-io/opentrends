import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { runWithWorkerBindings, type WorkerBindings } from "../../runtime";
import type { TrendsPageData } from "../types";
import { SqliteD1 } from "./support/d1-sqlite";

test("fresh shared page picks up saved translations without rebuilding or calling a model", async () => {
	process.env.BETTER_AUTH_SECRET = "x".repeat(32);
	process.env.BETTER_AUTH_URL = "http://localhost:3000";
	process.env.CORS_ORIGIN = "http://localhost:3001";
	const { clearTrendsPageCache, getTrendsPageWithCacheInfo } = await import(
		"../services/get-trends-page"
	);
	const { writeItemTranslations } = await import(
		"../cache/item-translation-cache"
	);
	const db = new SqliteD1();
	const now = Date.now();
	const title = "Researchers publish a new model";
	const page: TrendsPageData = {
		id: "ai",
		title: "AI",
		description: "AI",
		updatedAt: now,
		sections: [
			{
				id: "news",
				title: "News",
				sources: [
					{
						sourceId: "openai-news",
						title: "OpenAI",
						status: "ok",
						expiresAt: now + 60_000,
						items: [
							{
								id: "1",
								sourceId: "openai-news",
								title,
								url: "https://example.test/1",
								fetchedAt: now,
							},
						],
					},
				],
			},
		],
	};
	let writes = 0;
	const bindings = {
		BETTER_AUTH_SECRET: "x".repeat(32),
		BETTER_AUTH_URL: "http://localhost:3000",
		CORS_ORIGIN: "http://localhost:3001",
		NODE_ENV: "test",
		TRENDS_REFRESH_SCHEDULER: "disabled",
		LLM_API_KEY: "test-only",
		LLM_BASE_URL: "https://model.invalid/v1",
		LLM_MODEL: "test",
		DB: db.binding(),
		HOT_CACHE: {
			get: () =>
				Promise.resolve({
					createdAt: now,
					freshUntil: now + 60_000,
					staleUntil: now + 600_000,
					schemaVersion: 3,
					value: structuredClone(page),
				}),
			put: () => {
				writes++;
				return Promise.resolve();
			},
		},
	} as unknown as WorkerBindings;
	clearTrendsPageCache();
	try {
		await runWithWorkerBindings(bindings, async () => {
			const before = await getTrendsPageWithCacheInfo("ai", "zh");
			expect(before.page.sections[0]?.sources[0]?.items[0]?.title).toBe(title);
			await writeItemTranslations([
				{
					sourceId: "openai-news",
					itemId: "1",
					lang: "zh",
					title: "研究人员发布新模型",
					description: null,
					model: "test",
					textHash: createHash("sha256")
						.update(JSON.stringify({ description: null, title }))
						.digest("hex"),
				},
			]);
			// Simulate another isolate reading the still-fresh, untranslated KV snapshot.
			clearTrendsPageCache();
			const after = await getTrendsPageWithCacheInfo("ai", "zh");
			expect(after.cacheStatus).toBe("hit");
			expect(after.page.sections[0]?.sources[0]?.items[0]?.title).toBe(
				"研究人员发布新模型"
			);
			expect(
				after.page.sections[0]?.sources[0]?.items[0]?.original?.title
			).toBe(title);
			expect(writes).toBe(0);
			expect(db.batchedSql.some((sql) => sql.includes("source_snapshot"))).toBe(
				false
			);
		});
	} finally {
		clearTrendsPageCache();
		db.close();
	}
});
