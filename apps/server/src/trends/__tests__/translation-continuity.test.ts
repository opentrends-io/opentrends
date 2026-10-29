import { expect, test } from "bun:test";
import { runWithWorkerBindings, type WorkerBindings } from "../../runtime";
import { getEventEligibleSourceIds } from "../config/sources";
import { translateNewsItems } from "../services/translate-news-items";
import {
	expireTranslationLeases,
	failTranslationAttempt,
	registerTranslationJobs,
} from "../services/translation-job-store";
import {
	reconcileTranslationJobs,
	runTranslationPrewarmJob,
} from "../services/translation-prewarm-jobs";
import {
	claimTranslationLane,
	releaseTranslationLane,
	reserveTranslationWake,
} from "../services/translation-service";
import { SqliteD1 } from "./support/d1-sqlite";

const NOW = 1_793_200_000_000;
test("one bad source and a failed send do not strand durable jobs; the next scheduler tick recovers", async () => {
	const f = setup(1);
	let sends = 0;
	try {
		await runWithWorkerBindings(
			{
				...f.bindings,
				SUMMARY_PREWARM_QUEUE: {
					send: () => {
						sends++;
						return sends === 1
							? Promise.reject(new Error("fixture delivery failure"))
							: Promise.resolve();
					},
				},
			} as unknown as WorkerBindings,
			async () => {
				const dependencies = {
					sourceIds: ["bad", "fixture"],
					readSource: (id: string) =>
						id === "bad"
							? Promise.reject(new Error("fixture source failure"))
							: Promise.resolve({
									sourceId: id,
									items: f.items,
									status: "ok" as const,
									errorCount: 0,
									expiresAt: 0,
									fetchedAt: 0,
									staleUntil: 0,
								}),
				};
				await reconcileTranslationJobs(dependencies);
				expect(
					f.db.all("SELECT * FROM translation_job WHERE state='queued'")
				).toHaveLength(1);
				expect(sends).toBe(1);
				await reconcileTranslationJobs(dependencies);
				expect(sends).toBe(2);
				await reconcileTranslationJobs(dependencies);
				expect(sends).toBe(2);
				expect(
					f.db.all<{ scheduler_seen_at: number }>(
						"SELECT scheduler_seen_at FROM translation_control"
					)[0]?.scheduler_seen_at
				).toBeGreaterThan(Date.now() - 1000);
				expect(f.db.all("SELECT * FROM translation_attempt")).toHaveLength(0);
			}
		);
	} finally {
		f.db.close();
	}
});

test("reconciliation registers only public eligible events; stale ineligible jobs never call a model", async () => {
	const f = setup(0);
	try {
		const source = getEventEligibleSourceIds()[0];
		if (!source) {
			throw new Error("no eligible source");
		}
		for (const [id, primary, topic] of [
			["valid", source, "ai"],
			["removed", source, "home"],
			["private", "fixture", "ai"],
		]) {
			f.db.database
				.query(
					"INSERT INTO trend_event(event_id,topic_id,title,first_seen_at,last_seen_at,updated_at,primary_source_id,primary_item_id) VALUES(?,?,'New discovery',1,1,1,?,'1')"
				)
				.run(id ?? "", topic ?? "", primary ?? "");
			f.db.database
				.query(
					"INSERT INTO trend_event_topic(event_id,topic_id,created_at) VALUES(?,?,1)"
				)
				.run(id ?? "", topic ?? "");
		}
		await registerTranslationJobs(f.db.binding(), [
			{
				subjectType: "event",
				sourceId: "event:removed",
				itemId: "removed",
				lang: "zh",
				title: "New discovery",
			},
		]);
		await runWithWorkerBindings(f.bindings, async () => {
			await reconcileTranslationJobs({ sourceIds: [] });
			expect(
				f.db
					.all<{ item_id: string }>(
						"SELECT item_id FROM translation_job ORDER BY item_id"
					)
					.map((row) => row.item_id)
			).toEqual(["removed", "valid"]);
			let calls = 0;
			await runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, (prompt) => {
				calls++;
				const input = JSON.parse(prompt.split("\n").at(-1) ?? "{}");
				expect(input.items.map((item: { id: string }) => item.id)).toEqual([
					"0",
				]);
				return Promise.resolve(validOutput(prompt));
			});
			expect(calls).toBe(1);
			expect(
				f.db.all<{ state: string }>(
					"SELECT state FROM translation_job WHERE item_id='removed'"
				)[0]?.state
			).toBe("obsolete");
		});
	} finally {
		f.db.close();
	}
});

test("an event reworded behind the cursor is registered on the next tick", async () => {
	const f = setup(0);
	try {
		const source = getEventEligibleSourceIds()[0];
		if (!source) {
			throw new Error("no eligible source");
		}
		const now = Math.floor(Date.now() / 1000);
		for (const [id, updatedAt] of [
			["event-aaaa", now - 3 * 3600],
			["event-bbbb", now - 60],
		] as const) {
			f.db.database
				.query(
					"INSERT INTO trend_event(event_id,topic_id,title,first_seen_at,last_seen_at,updated_at,primary_source_id,primary_item_id) VALUES(?,'ai','New discovery',1,1,?,?,'1')"
				)
				.run(id, updatedAt, source);
			f.db.database
				.query(
					"INSERT INTO trend_event_topic(event_id,topic_id,created_at) VALUES(?,'ai',1)"
				)
				.run(id);
		}
		// The sweep cursor already sits past both ids.
		f.db.database.exec(
			"UPDATE translation_control SET event_cursor='event-zzzz'"
		);
		await runWithWorkerBindings(f.bindings, async () => {
			await reconcileTranslationJobs({ sourceIds: [] });
			expect(
				f.db
					.all<{ item_id: string }>(
						"SELECT item_id FROM translation_job ORDER BY item_id"
					)
					.map((row) => row.item_id)
			).toEqual(["event-bbbb"]);
		});
	} finally {
		f.db.close();
	}
});

test("a healthy service exposes a bounded registration wait without writing on read; paused workers make no calls", async () => {
	const f = setup(1);
	try {
		f.db.database
			.query("UPDATE translation_control SET scheduler_seen_at=?")
			.run(Date.now());
		await runWithWorkerBindings(f.bindings, async () => {
			expect(
				(await translateNewsItems(f.items, "zh"))[0]?.translation
			).toMatchObject({ state: "unknown", reason: "registration" });
			expect(f.db.all("SELECT * FROM translation_job")).toHaveLength(0);
		});
		await registerFixture(f);
		await runWithWorkerBindings(
			{ ...f.bindings, TRANSLATION_SCHEDULER_ENABLED: "false" },
			() =>
				runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, () => {
					throw new Error("paused worker called model");
				})
		);
		expect(f.db.all("SELECT * FROM translation_attempt")).toHaveLength(0);
		f.db.database.exec(
			"UPDATE translation_job SET state='running',attempts=3,lease_until=1"
		);
		await expireTranslationLeases(f.db.binding());
		expect(
			f.db.all<{ state: string }>("SELECT state FROM translation_job")[0]?.state
		).toBe("failed");
		await failTranslationAttempt(f.db.binding(), "none", "provider", NOW);
		await failTranslationAttempt(
			f.db.binding(),
			"none",
			"rate_limit",
			NOW + 1,
			60_000
		);
		expect(
			f.db.all("SELECT blocked_until,reason FROM translation_control")[0]
		).toEqual({ blocked_until: NOW + 86_400_000, reason: "provider" });
	} finally {
		f.db.close();
	}
});
test("one wake and one consumer per language survive duplicate deliveries; expired owner cannot release successor", async () => {
	const db = new SqliteD1();
	try {
		const binding = db.binding();
		const wakes = await Promise.all([
			reserveTranslationWake(binding, "zh", NOW),
			reserveTranslationWake(binding, "zh", NOW),
		]);
		expect(wakes.filter(Boolean)).toHaveLength(1);
		const owner = await claimTranslationLane(binding, "zh", NOW);
		expect(owner).not.toBeNull();
		expect(await claimTranslationLane(binding, "zh", NOW)).toBeNull();
		expect(await reserveTranslationWake(binding, "zh", NOW + 1)).toBe(false);
		const successor = await claimTranslationLane(binding, "zh", NOW + 200_000);
		expect(successor).not.toBeNull();
		if (!(owner && successor)) {
			throw new Error("missing lease");
		}
		await releaseTranslationLane(binding, "zh", owner);
		expect(await claimTranslationLane(binding, "zh", NOW + 200_001)).toBeNull();
		await releaseTranslationLane(binding, "zh", successor);
		expect(await reserveTranslationWake(binding, "zh", NOW + 200_002)).toBe(
			true
		);
	} finally {
		db.close();
	}
});

function setup(count = 18) {
	const db = new SqliteD1();
	db.database.exec(
		"INSERT INTO source(source_id,generation) VALUES('fixture',1)"
	);
	const items = Array.from({ length: count }, (_, i) => ({
		sourceId: "fixture",
		id: String(i),
		title: `Discovery ${i}`,
		url: "https://example.test",
		fetchedAt: 0,
	}));
	for (const item of items) {
		db.database
			.query(
				"INSERT INTO source_item(source_id,item_id,generation,url,title,rank,fetched_at,last_seen_at,content_hash) VALUES('fixture',?,1,?,?,?,1,1,'hash')"
			)
			.run(item.id, item.url, item.title, Number(item.id));
	}
	const bindings = {
		DB: db.binding(),
		BETTER_AUTH_SECRET: "fixture".repeat(8),
		BETTER_AUTH_URL: "http://localhost:3000",
		CORS_ORIGIN: "http://localhost:3001",
		LLM_API_KEY: "fixture",
		LLM_BASE_URL: "https://example.test/v1",
		LLM_MODEL: "fixture",
		LLM_TRANSLATION_MODEL: "fixture",
		TRANSLATION_JOBS_ENABLED: "true",
		TRANSLATION_SCHEDULER_ENABLED: "true",
		TRANSLATION_DAILY_BUDGET_CNY: "1",
		TRANSLATION_PRICE_MODEL: "fixture",
		TRANSLATION_INPUT_CNY_PER_MILLION: "1",
		TRANSLATION_OUTPUT_CNY_PER_MILLION: "4",
		SUMMARY_PREWARM_QUEUE: { send: () => Promise.resolve() },
		TRENDS_REFRESH_SCHEDULER: "disabled",
	} as unknown as WorkerBindings;
	return { db, items, bindings };
}
async function registerFixture(fixture: ReturnType<typeof setup>) {
	await registerTranslationJobs(
		fixture.db.binding(),
		fixture.items.map((item) => ({
			...item,
			itemId: item.id,
			subjectType: "source" as const,
			lang: "zh" as const,
		}))
	);
	fixture.db.database
		.query("UPDATE translation_control SET scheduler_seen_at=?")
		.run(Date.now());
	fixture.db.database
		.query("UPDATE translation_lane SET consumer_seen_at=?")
		.run(Date.now());
}
function validOutput(prompt: string) {
	const input = JSON.parse(prompt.split("\n").at(-1) ?? "{}");
	return {
		text: JSON.stringify({
			items: input.items.map((row: { id: string }) => ({
				id: row.id,
				title: "真实译文",
				description: null,
			})),
		}),
		inputTokens: 100,
		outputTokens: 50,
	};
}
test("one real delivery drains multiple batches without readers, and duplicate deliveries do not fork a pump", async () => {
	const f = setup();
	let calls = 0;
	try {
		await registerFixture(f);
		await runWithWorkerBindings(f.bindings, async () => {
			const generate = (prompt: string) => {
				calls++;
				return Promise.resolve(validOutput(prompt));
			};
			await Promise.all([
				runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, generate),
				runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, generate),
			]);
			expect(calls).toBe(3);
			expect(
				f.db.all("SELECT * FROM translation_job WHERE state='ready'")
			).toHaveLength(18);
			expect(
				f.db.all("SELECT * FROM translation_lane WHERE lease_until>0")
			).toHaveLength(0);
		});
	} finally {
		f.db.close();
	}
});
test("drain is bounded per delivery and day-call limit has its own truthful reason", async () => {
	// 400 items at 8 per call is 50 calls; one delivery runs at most six
	// rounds of three parallel calls, and the day allows 30 in all.
	const f = setup(400);
	let calls = 0;
	try {
		await registerFixture(f);
		const limited = { ...f.bindings, TRANSLATION_DAILY_CALL_LIMIT: "30" };
		await runWithWorkerBindings(limited, async () => {
			const generate = (prompt: string) => {
				calls++;
				return Promise.resolve(validOutput(prompt));
			};
			expect(
				await runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, generate)
			).toBe(true);
			expect(calls).toBe(18);
			expect(
				await runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, generate)
			).toBe(false);
			expect(calls).toBe(30);
			await runTranslationPrewarmJob({ sourceId: "", lang: "zh" }, generate);
			expect(calls).toBe(30);
			const results = await translateNewsItems(f.items, "zh");
			expect(
				results.some((item) => item.translation?.reason === "call_limit")
			).toBe(true);
		});
	} finally {
		f.db.close();
	}
});
test("paused schedule and stale scheduler/consumer cannot become queued merely because a GET is fresh", async () => {
	const f = setup(1);
	try {
		await registerFixture(f);
		await runWithWorkerBindings(
			{ ...f.bindings, TRANSLATION_SCHEDULER_ENABLED: "false" },
			async () => {
				expect(
					(await translateNewsItems(f.items, "zh"))[0]?.translation
				).toMatchObject({ state: "blocked", reason: "paused" });
			}
		);
		for (const stale of ["scheduler", "consumer"]) {
			await registerFixture(f);
			f.db.database.exec(
				stale === "scheduler"
					? "UPDATE translation_control SET scheduler_seen_at=1"
					: "UPDATE translation_lane SET consumer_seen_at=1; UPDATE translation_job SET created_at=1"
			);
			await runWithWorkerBindings(f.bindings, async () => {
				for (let n = 0; n < 3; n++) {
					expect(
						(await translateNewsItems(f.items, "zh"))[0]?.translation
					).toMatchObject({ state: "blocked", reason: "stalled" });
				}
			});
		}
		expect(f.db.all("SELECT * FROM translation_attempt")).toHaveLength(0);
	} finally {
		f.db.close();
	}
});
