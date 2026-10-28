import { expect, test } from "bun:test";
import { translationHealthRoutes } from "../../routes/translation-health";
import { runWithWorkerBindings, type WorkerBindings } from "../../runtime";
import { translateNewsItems } from "../services/translate-news-items";
import {
	dispatchTranslationPrewarmJobs,
	resolveEventTranslationItems,
} from "../services/translation-prewarm-jobs";
import { runTranslationBatch } from "../services/translation-worker";
import { SqliteD1 } from "./support/d1-sqlite";

const item = {
	id: "1",
	sourceId: "fixture",
	title: "A new discovery",
	url: "https://example.test",
	fetchedAt: 0,
};
function setup() {
	const database = new SqliteD1();
	database.database.exec(
		"INSERT INTO source(source_id) VALUES('fixture'); INSERT INTO source_item(source_id,item_id,generation,url,title,rank,fetched_at,last_seen_at,content_hash) VALUES('fixture','1',1,'https://example.test','A new discovery',1,1,1,'hash')"
	);
	const messages: unknown[] = [];
	database.database
		.query("UPDATE translation_control SET scheduler_seen_at=?")
		.run(Date.now());
	database.database
		.query("UPDATE translation_lane SET consumer_seen_at=?")
		.run(Date.now());
	const bindings = {
		DB: database.binding(),
		BETTER_AUTH_SECRET: "fixture".repeat(8),
		BETTER_AUTH_URL: "http://localhost:3000",
		CORS_ORIGIN: "http://localhost:3001",
		LLM_API_KEY: "fixture-only",
		LLM_BASE_URL: "https://example.test/v1",
		LLM_MODEL: "fixture",
		LLM_TRANSLATION_MODEL: "fixture",
		TRANSLATION_JOBS_ENABLED: "true",
		TRANSLATION_SCHEDULER_ENABLED: "true",
		TRANSLATION_DAILY_BUDGET_CNY: "50",
		TRANSLATION_PRICE_MODEL: "fixture",
		TRANSLATION_INPUT_CNY_PER_MILLION: "1",
		TRANSLATION_OUTPUT_CNY_PER_MILLION: "4",
		SUMMARY_PREWARM_QUEUE: {
			send: (message: unknown) => {
				messages.push(message);
				return Promise.resolve();
			},
		},
		TRENDS_REFRESH_SCHEDULER: "disabled",
	} as unknown as WorkerBindings;
	return { database, bindings, messages };
}

test("ingest registers durable work; 100 public sync reads create no work; worker persists shared result", async () => {
	const { database, bindings, messages } = setup();
	try {
		await runWithWorkerBindings(bindings, async () => {
			for (let i = 0; i < 100; i++) {
				const [read] = await translateNewsItems([item], "zh", "sync");
				expect(read?.translation?.state).toBe("unknown");
			}
			expect(database.all("SELECT * FROM translation_job")).toHaveLength(0);
			expect(database.all("SELECT * FROM translation_attempt")).toHaveLength(0);
			expect(messages).toHaveLength(0);
			await dispatchTranslationPrewarmJobs("fixture", [item]);
			expect(database.all("SELECT * FROM translation_job")).toHaveLength(1);
			expect(messages).toHaveLength(1);
			expect(
				(await translateNewsItems([item], "zh"))[0]?.translation?.state
			).toBe("queued");
			let calls = 0;
			await runTranslationBatch("zh", async () => {
				calls++;
				expect(
					(await translateNewsItems([item], "zh"))[0]?.translation?.state
				).toBe("running");
				const job = database.all<{ id: string }>(
					"SELECT id FROM translation_job"
				)[0];
				if (!job) {
					throw new Error("missing fixture job");
				}
				return {
					text: JSON.stringify({
						items: [{ id: "0", title: "一项新发现", description: null }],
					}),
					inputTokens: 100,
					outputTokens: 20,
				};
			});
			expect(calls).toBe(1);
			expect(
				(await translateNewsItems([item], "zh"))[0]?.translation?.state
			).toBe("ready");
			expect((await translateNewsItems([item], "zh"))[0]?.title).toBe(
				"一项新发现"
			);
		});
	} finally {
		database.close();
	}
});

test("invalid output has exactly three durable calls, no nested parser/SDK retries", async () => {
	const { database, bindings } = setup();
	try {
		await runWithWorkerBindings(bindings, async () => {
			await dispatchTranslationPrewarmJobs("fixture", [item]);
			let calls = 0;
			for (let i = 0; i < 5; i++) {
				database.database.exec("UPDATE translation_job SET next_attempt_at=0");
				await runTranslationBatch("zh", () => {
					calls++;
					return Promise.resolve({ text: "not JSON" });
				});
				await dispatchTranslationPrewarmJobs("fixture", [item]);
			}
			expect(calls).toBe(3);
			expect(
				(await translateNewsItems([item], "zh"))[0]?.translation?.state
			).toBe("failed");
		});
	} finally {
		database.close();
	}
});

test("provider rejection pauses every consumer rather than splitting into paid requests", async () => {
	const { database, bindings } = setup();
	try {
		await runWithWorkerBindings(bindings, async () => {
			await dispatchTranslationPrewarmJobs("fixture", [item]);
			let calls = 0;
			const generate = () => {
				calls++;
				return Promise.reject(
					Object.assign(new Error("fixture rejection"), {
						statusCode: 402,
					})
				);
			};
			await runTranslationBatch("zh", generate);
			database.database.exec("UPDATE translation_job SET next_attempt_at=0");
			await runTranslationBatch("zh", generate);
			expect(calls).toBe(1);
			expect(
				(await translateNewsItems([item], "zh"))[0]?.translation
			).toMatchObject({ state: "blocked", reason: "provider" });
		});
	} finally {
		database.close();
	}
});

test("storage errors never publish ready or invoke the model again within one delivery", async () => {
	const { database, bindings } = setup();
	try {
		await runWithWorkerBindings(bindings, async () => {
			await dispatchTranslationPrewarmJobs("fixture", [item]);
			database.database.exec(
				"CREATE TRIGGER fail_ready BEFORE UPDATE OF state ON translation_job WHEN new.state='ready' BEGIN SELECT RAISE(ABORT,'fixture failure'); END"
			);
			let calls = 0;
			await runTranslationBatch("zh", () => {
				calls++;
				const job = database.all<{ id: string }>(
					"SELECT id FROM translation_job"
				)[0];
				if (!job) {
					throw new Error("missing fixture job");
				}
				return Promise.resolve({
					text: JSON.stringify({
						items: [{ id: "0", title: "译文", description: null }],
					}),
				});
			});
			expect(calls).toBe(1);
			expect(
				database.all("SELECT * FROM source_item_translation")
			).toHaveLength(0);
			expect(
				(await translateNewsItems([item], "zh"))[0]?.translation?.state
			).toBe("retry_wait");
		});
	} finally {
		database.close();
	}
});

test("429 respects provider retry-after globally and health is authenticated and read-only", async () => {
	const { database, bindings, messages } = setup();
	try {
		await runWithWorkerBindings(
			{ ...bindings, EVENT_PAGES_ADMIN_TOKEN: "fixture-token-not-a-secret" },
			async () => {
				await dispatchTranslationPrewarmJobs("fixture", [item]);
				let calls = 0;
				const generate = () => {
					calls++;
					return Promise.reject(
						Object.assign(new Error("limited"), {
							statusCode: 429,
							responseHeaders: { "retry-after": "180" },
						})
					);
				};
				const before = Date.now();
				await runTranslationBatch("zh", generate);
				database.database.exec("UPDATE translation_job SET next_attempt_at=0");
				await runTranslationBatch("zh", generate);
				expect(calls).toBe(1);
				expect(
					database.all<{ blocked_until: number }>(
						"SELECT blocked_until FROM translation_control"
					)[0]?.blocked_until
				).toBeGreaterThanOrEqual(before + 180_000);
				expect((await translationHealthRoutes.request("/")).status).toBe(401);
				const response = await translationHealthRoutes.request("/", {
					headers: { Authorization: "Bearer fixture-token-not-a-secret" },
				});
				expect(response.status).toBe(200);
				expect(response.headers.get("cache-control")).toBe("no-store");
				const health = await response.json();
				expect(health.budget.accountBalanceAvailable).toBe(false);
				expect(health.budget.calls).toBe(1);
				expect(health.budget.unknownCalls).toBe(1);
				expect(JSON.stringify(health)).not.toContain("fixture-token");
				expect(messages).toHaveLength(1);
			}
		);
	} finally {
		database.close();
	}
});

test("events reuse an identical source translation but keep independent identity for derived text", async () => {
	const { database, bindings } = setup();
	try {
		database.database.exec(
			"INSERT INTO trend_event(event_id,topic_id,title,first_seen_at,last_seen_at,updated_at,primary_source_id,primary_item_id) VALUES('event-1','ai','A new discovery',1,1,1,'fixture','1')"
		);
		await runWithWorkerBindings(bindings, async () => {
			const event = { ...item, id: "event-1", sourceId: "event:event-1" };
			const same = await resolveEventTranslationItems([event]);
			expect(same[0]).toMatchObject({ id: "1", sourceId: "fixture" });
			const changed = await resolveEventTranslationItems([
				{ ...event, title: "Different synthesis" },
			]);
			expect(changed[0]).toMatchObject({
				id: "event-1",
				sourceId: "event:event-1",
			});
			await dispatchTranslationPrewarmJobs("fixture", [item]);
			await dispatchTranslationPrewarmJobs("fixture", same);
			expect(database.all("SELECT * FROM translation_job")).toHaveLength(1);
		});
	} finally {
		database.close();
	}
});
