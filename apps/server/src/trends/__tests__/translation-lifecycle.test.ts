import { expect, test } from "bun:test";
import type { TranslationSubject } from "../services/translation-identity";
import {
	claimTranslationBatch,
	completeTranslationJob,
	failTranslationAttempt,
	registerTranslationJobs,
	selectTranslationBatch,
	settleTranslationAttempt,
	type TranslationJob,
	translationDay,
} from "../services/translation-job-store";
import { SqliteD1 } from "./support/d1-sqlite";

const NOW = 1_793_200_000_000;
function requiredJob(
	batch: NonNullable<Awaited<ReturnType<typeof claimTranslationBatch>>>
) {
	const job = batch.jobs[0];
	if (!job) {
		throw new Error("missing fixture job");
	}
	return job;
}
const subject: TranslationSubject = {
	subjectType: "source",
	sourceId: "fixture",
	itemId: "1",
	lang: "zh",
	title: "A new discovery",
};
const limits = {
	dailyMicros: 50_000_000,
	reserveMicros: 100_000,
	concurrency: 2,
	perMinute: 12,
	model: "fixture",
	dailyCalls: 1000,
};

function fixture() {
	const database = new SqliteD1();
	database.database.exec("INSERT INTO source(source_id) VALUES ('fixture')");
	database.database
		.query(
			"INSERT INTO source_item(source_id,item_id,generation,url,title,rank,fetched_at,last_seen_at,content_hash) VALUES('fixture','1',1,'https://example.test',?,1,1,1,'hash')"
		)
		.run(subject.title);
	return database;
}

test("different deliveries of the same business job have one lease, one reservation and atomic ready result", async () => {
	const database = fixture();
	const binding = database.binding();
	try {
		await Promise.all([
			registerTranslationJobs(binding, [subject], NOW),
			registerTranslationJobs(binding, [subject], NOW),
		]);
		const [a, b] = await Promise.all([
			claimTranslationBatch(binding, "zh", limits, NOW),
			claimTranslationBatch(binding, "zh", limits, NOW),
		]);
		expect([a, b].filter(Boolean)).toHaveLength(1);
		const batch = a ?? b;
		expect(batch?.jobs).toHaveLength(1);
		expect(database.all("SELECT * FROM translation_attempt")).toHaveLength(1);
		if (!batch) {
			throw new Error("missing claim");
		}
		await completeTranslationJob(
			binding,
			requiredJob(batch),
			batch.id,
			{ title: "一项新发现", description: null },
			"fixture",
			NOW + 1
		);
		expect(
			database.all<{ state: string }>("SELECT state FROM translation_job")[0]
				?.state
		).toBe("ready");
		expect(
			database.all<{ title: string }>(
				"SELECT title FROM source_item_translation"
			)[0]?.title
		).toBe("一项新发现");
		expect(
			await claimTranslationBatch(binding, "zh", limits, NOW + 2)
		).toBeNull();
	} finally {
		database.close();
	}
});

test("failure budget survives redelivery and stops the fourth paid attempt", async () => {
	const database = fixture();
	const binding = database.binding();
	try {
		for (let i = 0; i < 3; i++) {
			const now = NOW + i * 600_000;
			await registerTranslationJobs(binding, [subject], now);
			const batch = await claimTranslationBatch(binding, "zh", limits, now);
			expect(batch).not.toBeNull();
			if (batch) {
				await failTranslationAttempt(binding, batch.id, "transient", now);
			}
		}
		await registerTranslationJobs(binding, [subject], NOW + 2_000_000);
		expect(
			await claimTranslationBatch(binding, "zh", limits, NOW + 2_000_000)
		).toBeNull();
		expect(
			database.all<{ state: string }>("SELECT state FROM translation_job")[0]
				?.state
		).toBe("failed");
	} finally {
		database.close();
	}
});

test("storage failure rolls back result and ready state together", async () => {
	const database = fixture();
	const binding = database.binding();
	try {
		await registerTranslationJobs(binding, [subject], NOW);
		const batch = await claimTranslationBatch(binding, "zh", limits, NOW);
		if (!batch) {
			throw new Error("missing claim");
		}
		database.database.exec(
			"CREATE TRIGGER fail_ready BEFORE UPDATE OF state ON translation_job WHEN new.state='ready' BEGIN SELECT RAISE(ABORT,'fixture failure'); END"
		);
		await expect(
			completeTranslationJob(
				binding,
				requiredJob(batch),
				batch.id,
				{ title: "译文", description: null },
				"fixture",
				NOW + 1
			)
		).rejects.toThrow("fixture failure");
		expect(database.all("SELECT * FROM source_item_translation")).toHaveLength(
			0
		);
		expect(
			database.all<{ state: string }>("SELECT state FROM translation_job")[0]
				?.state
		).toBe("running");
	} finally {
		database.close();
	}
});

test("expired owner cannot commit after takeover, new text or parent deletion", async () => {
	for (const change of ["takeover", "edit", "delete"] as const) {
		const database = fixture();
		const binding = database.binding();
		try {
			await registerTranslationJobs(binding, [subject], NOW);
			const first = await claimTranslationBatch(binding, "zh", limits, NOW);
			if (!first) {
				throw new Error("missing claim");
			}
			let now = NOW + 1;
			if (change === "takeover") {
				now = NOW + 100_000;
				expect(
					await claimTranslationBatch(binding, "zh", limits, now)
				).not.toBeNull();
			}
			if (change === "edit") {
				database.database.exec("UPDATE source_item SET title='changed'");
			}
			if (change === "delete") {
				database.database.exec("DELETE FROM source_item");
			}
			expect(
				await completeTranslationJob(
					binding,
					requiredJob(first),
					first.id,
					{ title: "旧译文", description: null },
					"fixture",
					now
				)
			).toBe(false);
			expect(
				database.all("SELECT * FROM source_item_translation")
			).toHaveLength(0);
		} finally {
			database.close();
		}
	}
});

test("budget reservation is atomic; unknown usage is charged and Beijing day rolls over", async () => {
	const database = fixture();
	const binding = database.binding();
	try {
		await registerTranslationJobs(binding, [subject], NOW);
		const constrained = { ...limits, dailyMicros: limits.reserveMicros };
		const first = await claimTranslationBatch(binding, "zh", constrained, NOW);
		if (!first) {
			throw new Error("missing claim");
		}
		await settleTranslationAttempt(binding, first.id, undefined);
		await failTranslationAttempt(binding, first.id, "transient", NOW);
		expect(
			await claimTranslationBatch(binding, "zh", constrained, NOW + 120_000)
		).toBeNull();
		expect(
			await claimTranslationBatch(binding, "zh", constrained, NOW + 86_400_000)
		).not.toBeNull();
		expect(translationDay(Date.parse("2026-10-28T15:59:59Z"))).toBe(
			"2026-10-28"
		);
		expect(translationDay(Date.parse("2026-10-28T16:00:00Z"))).toBe(
			"2026-10-29"
		);
	} finally {
		database.close();
	}
});

test("deleted parent cannot acquire work even after repeated registration", async () => {
	const database = fixture();
	const binding = database.binding();
	try {
		database.database.exec("DELETE FROM source_item");
		await registerTranslationJobs(binding, [subject], NOW);
		expect(await claimTranslationBatch(binding, "zh", limits, NOW)).toBeNull();
	} finally {
		database.close();
	}
});

test("global concurrency, minute and daily caps apply across distinct subjects and languages", async () => {
	for (const cap of ["concurrency", "perMinute", "dailyCalls"] as const) {
		const database = fixture();
		try {
			const binding = database.binding();
			await registerTranslationJobs(
				binding,
				[subject, { ...subject, lang: "en" }],
				NOW
			);
			const constrained = { ...limits, [cap]: 1 };
			const first = await claimTranslationBatch(
				binding,
				"zh",
				constrained,
				NOW
			);
			expect(first).not.toBeNull();
			if (!first) {
				throw new Error("missing claim");
			}
			if (cap !== "concurrency") {
				await settleTranslationAttempt(binding, first.id, undefined);
			}
			expect(
				await claimTranslationBatch(binding, "en", constrained, NOW + 1)
			).toBeNull();
			expect(database.all("SELECT * FROM translation_attempt")).toHaveLength(1);
		} finally {
			database.close();
		}
	}
});

test("retries travel in a small group and fresh jobs stop at the text budget", () => {
	const job = (id: string, attempts: number, bytes = 10): TranslationJob => ({
		attempts,
		created_at: 0,
		error_code: null,
		id,
		item_id: id,
		lang: "zh",
		lease_until: 0,
		next_attempt_at: 0,
		original_description: "x".repeat(bytes),
		original_title: "t",
		result_description: null,
		result_title: null,
		source_id: "fixture",
		state: "queued",
		subject_type: "source",
		text_hash: id,
		updated_at: 0,
	});
	const retries = selectTranslationBatch([
		job("a", 0),
		job("b", 1),
		job("c", 2),
		job("d", 1),
		job("e", 1),
	]);
	expect(retries.map((entry) => entry.id)).toEqual(["b", "c", "d"]);
	const fresh = selectTranslationBatch(
		Array.from({ length: 8 }, (_, i) => job(String(i), 0))
	);
	expect(fresh).toHaveLength(8);
	const large = selectTranslationBatch([
		job("big", 0, 9000),
		job("next", 0, 9000),
		job("small", 0),
	]);
	expect(large.map((entry) => entry.id)).toEqual(["big"]);
	expect(selectTranslationBatch([job("huge", 0, 20_000)])).toHaveLength(1);
});
