import { getEventEligibleSourceIds } from "../config/sources";
import { topicPresets } from "../config/topics";
import {
	TRANSLATION_POLICY,
	type TranslationSubject,
	translationHash,
	translationJobId,
} from "./translation-identity";

export const TRANSLATION_LEASE_MS = 90_000;
export interface TranslationJob {
	attempts: number;
	created_at: number;
	error_code: string | null;
	id: string;
	item_id: string;
	lang: "zh" | "en";
	lease_until: number;
	next_attempt_at: number;
	original_description: string | null;
	original_title: string;
	result_description: string | null;
	result_title: string | null;
	source_id: string;
	state: string;
	subject_type: "source" | "event";
	text_hash: string;
	updated_at: number;
}
export interface TranslationLimits {
	concurrency: number;
	dailyCalls: number;
	dailyMicros: number;
	model: string;
	perMinute: number;
	reserveMicros: number;
}

export function translationDay(now: number): string {
	return new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
}

// A result is admissible only while the parent exists with this exact text.
// This predicate is shared by claim and commit, not a check-then-write in JS.
const CURRENT = `((subject_type='source' AND EXISTS (
 SELECT 1 FROM source_item s WHERE s.source_id=translation_job.source_id
 AND s.item_id=translation_job.item_id AND s.title=translation_job.original_title
 AND coalesce(s.description,'')=coalesce(translation_job.original_description,'')
)) OR (subject_type='event' AND EXISTS (
 SELECT 1 FROM trend_event e WHERE e.event_id=translation_job.item_id
 AND e.title=translation_job.original_title
 AND coalesce(e.summary,'')=coalesce(translation_job.original_description,'')
 AND e.primary_source_id IN (SELECT value FROM json_each('${JSON.stringify(getEventEligibleSourceIds()).replaceAll("'", "''")}'))
 AND EXISTS(SELECT 1 FROM trend_event_topic t WHERE t.event_id=e.event_id AND t.topic_id IN (SELECT value FROM json_each('${JSON.stringify(Object.keys(topicPresets)).replaceAll("'", "''")}')))
)))`;
const DUE =
	"attempts<3 AND ((state IN ('queued','retry_wait') AND next_attempt_at<=?) OR (state='running' AND lease_until<=?))";

// One model call translates up to this many items, as long as their text
// fits the prompt budget; the worker's byte check is the last resort.
export const TRANSLATION_BATCH_SIZE = 8;
// Retries carry a possibly bad item, so they travel in small groups: a
// second failure costs few attempts, but a lone retry no longer monopolises
// a whole call.
const RETRY_BATCH_SIZE = 3;
const BATCH_TEXT_BYTES = 11_000;

function jobTextBytes(job: TranslationJob): number {
	return new TextEncoder().encode(
		JSON.stringify({
			title: job.original_title,
			description: job.original_description,
		})
	).length;
}

// Which of the due candidates travel together: retries first in a small
// group, otherwise fresh jobs in rank order, never past the text budget.
export function selectTranslationBatch(
	candidates: readonly TranslationJob[]
): TranslationJob[] {
	const retries = candidates.filter((job) => job.attempts > 0);
	const pool = retries.length > 0 ? retries : candidates;
	const limit = retries.length > 0 ? RETRY_BATCH_SIZE : TRANSLATION_BATCH_SIZE;
	const selected: TranslationJob[] = [];
	let bytes = 0;
	for (const job of pool) {
		const size = jobTextBytes(job);
		if (selected.length > 0 && bytes + size > BATCH_TEXT_BYTES) {
			break;
		}
		selected.push(job);
		bytes += size;
		if (selected.length >= limit) {
			break;
		}
	}
	return selected;
}

export async function registerTranslationJobs(
	database: D1Database,
	subjects: TranslationSubject[],
	now = Date.now()
): Promise<void> {
	// Bounded caller batches; no raw article content in logs or queue bodies.
	for (let start = 0; start < subjects.length; start += 40) {
		await database.batch(
			subjects.slice(start, start + 40).map((subject) =>
				database
					.prepare(`
 INSERT INTO translation_job(id,subject_type,source_id,item_id,lang,policy,text_hash,original_title,original_description,created_at,updated_at)
 SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(
 SELECT 1 FROM source_item_translation WHERE source_id=? AND item_id=? AND lang=? AND text_hash=?)
 ON CONFLICT DO NOTHING`)
					.bind(
						translationJobId(subject),
						subject.subjectType,
						subject.sourceId,
						subject.itemId,
						subject.lang,
						TRANSLATION_POLICY,
						translationHash(subject),
						subject.title,
						subject.description ?? null,
						now,
						now,
						subject.sourceId,
						subject.itemId,
						subject.lang,
						translationHash(subject)
					)
			)
		);
	}
}

export async function claimTranslationBatch(
	database: D1Database,
	lang: "zh" | "en",
	limits: TranslationLimits,
	now = Date.now()
): Promise<{ id: string; jobs: TranslationJob[] } | null> {
	await database
		.prepare(`UPDATE translation_job SET state='obsolete',lease_until=0,updated_at=? WHERE id IN (
 SELECT id FROM translation_job WHERE state IN ('queued','retry_wait','running') AND NOT ${CURRENT} LIMIT 200)`)
		.bind(now)
		.run();
	await expireTranslationLeases(database, now);
	const candidates = await database
		.prepare(
			`SELECT * FROM translation_job WHERE lang=? AND ${DUE} AND ${CURRENT} ORDER BY
 CASE WHEN subject_type='source' AND EXISTS(SELECT 1 FROM source_item s JOIN source p ON p.source_id=s.source_id WHERE s.source_id=translation_job.source_id AND s.item_id=translation_job.item_id AND s.generation=p.generation) THEN 0 ELSE 1 END,
 coalesce((SELECT rank FROM source_item s WHERE s.source_id=translation_job.source_id AND s.item_id=translation_job.item_id),999),created_at,id LIMIT ?`
		)
		.bind(lang, now, now, TRANSLATION_BATCH_SIZE)
		.all<TranslationJob>();
	if (!candidates.results.length) {
		return null;
	}
	// Recovery never resets an attempt count; it only travels in a smaller group.
	const selected = selectTranslationBatch(candidates.results);
	const ids = selected.map((job) => job.id);
	const placeholders = ids.map(() => "?").join(",");
	const id = crypto.randomUUID();
	const day = translationDay(now);
	const minute = Math.floor(now / 60_000);
	const lease = now + TRANSLATION_LEASE_MS;
	const eligible = `id IN (${placeholders}) AND ${DUE} AND ${CURRENT}`;
	// One D1 transaction serializes the budget reservation and job lease. A
	// second consumer cannot reserve for already-claimed jobs, even with a new message ID.
	const results = await database.batch([
		database
			.prepare(`INSERT INTO translation_attempt(id,day,minute,model,reserved_micros,lease_until,created_at)
 SELECT ?,?,?,?,?,?,? WHERE
 (SELECT blocked_until FROM translation_control WHERE id=1)<=?
 AND coalesce((SELECT sum(coalesce(actual_micros,reserved_micros)) FROM translation_attempt WHERE day=?),0)+?<=?
 AND (SELECT count(*) FROM translation_attempt WHERE day=?)<?
 AND (SELECT count(*) FROM translation_attempt WHERE state='active' AND lease_until>?)<?
 AND (SELECT count(*) FROM translation_attempt WHERE minute=?)<?
 AND EXISTS(SELECT 1 FROM translation_job WHERE ${eligible})`)
			.bind(
				id,
				day,
				minute,
				limits.model,
				limits.reserveMicros,
				lease,
				now,
				now,
				day,
				limits.reserveMicros,
				limits.dailyMicros,
				day,
				limits.dailyCalls,
				now,
				limits.concurrency,
				minute,
				limits.perMinute,
				...ids,
				now,
				now
			),
		database
			.prepare(`UPDATE translation_job SET state='running',attempts=attempts+1,lease_owner=?,lease_until=?,updated_at=?
 WHERE ${eligible} AND EXISTS(SELECT 1 FROM translation_attempt WHERE id=?)`)
			.bind(id, lease, now, ...ids, now, now, id),
		database
			.prepare(
				"SELECT * FROM translation_job WHERE lease_owner=? AND state='running'"
			)
			.bind(id),
	]);
	const jobs = results[2]?.results as unknown as TranslationJob[];
	if (!jobs?.length) {
		return null;
	}
	return { id, jobs };
}

export async function completeTranslationJob(
	database: D1Database,
	job: TranslationJob,
	owner: string,
	result: { title: string; description: string | null },
	model: string,
	now = Date.now()
): Promise<boolean> {
	const guard = `id=? AND state='running' AND lease_owner=? AND lease_until>? AND ${CURRENT}`;
	const time = Math.floor(now / 1000);
	const results = await database.batch([
		database
			.prepare(`INSERT INTO source_item_translation(source_id,item_id,lang,text_hash,title,description,model,created_at,updated_at)
 SELECT source_id,item_id,lang,text_hash,?,?,?,?,? FROM translation_job WHERE ${guard}
 ON CONFLICT(source_id,item_id,lang) DO UPDATE SET text_hash=excluded.text_hash,title=excluded.title,description=excluded.description,model=excluded.model,updated_at=excluded.updated_at`)
			.bind(
				result.title,
				result.description,
				model,
				time,
				time,
				job.id,
				owner,
				now
			),
		database
			.prepare(
				`UPDATE translation_job SET state='ready',result_title=?,result_description=?,error_code=NULL,lease_until=0,updated_at=? WHERE ${guard}`
			)
			.bind(result.title, result.description, now, job.id, owner, now),
	]);
	return (results[1]?.meta.changes ?? 0) > 0;
}

export async function failTranslationAttempt(
	database: D1Database,
	owner: string,
	reason: "transient" | "output" | "provider" | "storage" | "rate_limit",
	now = Date.now(),
	retryAfterMs = 60_000
): Promise<void> {
	const statements = [
		database
			.prepare(`UPDATE translation_job SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'retry_wait' END,
 error_code=?,next_attempt_at=?,lease_until=0,updated_at=? WHERE lease_owner=? AND state='running'`)
			.bind(reason, now + Math.max(30_000, retryAfterMs), now, owner),
		database
			.prepare(
				"UPDATE translation_attempt SET state='error',lease_until=0 WHERE id=?"
			)
			.bind(owner),
	];
	if (reason === "provider" || reason === "rate_limit") {
		const blockedUntil =
			now +
			(reason === "provider" ? 24 * 3_600_000 : Math.max(30_000, retryAfterMs));
		statements.push(
			database
				.prepare(
					"UPDATE translation_control SET reason=CASE WHEN blocked_until<=? THEN ? ELSE reason END,blocked_until=max(blocked_until,?) WHERE id=1"
				)
				.bind(blockedUntil, reason, blockedUntil)
		);
	}
	await database.batch(statements);
}

export async function expireTranslationLeases(
	database: D1Database,
	now = Date.now()
): Promise<void> {
	await database
		.prepare(
			"UPDATE translation_job SET state='failed',error_code='attempts',updated_at=? WHERE state='running' AND lease_until<=? AND attempts>=3"
		)
		.bind(now, now)
		.run();
}

export async function settleTranslationAttempt(
	database: D1Database,
	id: string,
	usage: { input: number; output: number; costMicros: number } | undefined
): Promise<void> {
	// No usage is NOT zero cost. Preserve the reservation through process failure.
	await database
		.prepare(
			"UPDATE translation_attempt SET actual_micros=?,input_tokens=?,output_tokens=?,state='ok',lease_until=0 WHERE id=?"
		)
		.bind(
			usage?.costMicros ?? null,
			usage?.input ?? null,
			usage?.output ?? null,
			id
		)
		.run();
}

export async function translationBudgetSnapshot(
	database: D1Database,
	now = Date.now()
) {
	const [usage, control] = await Promise.all([
		database
			.prepare(
				"SELECT count(*) calls,coalesce(sum(coalesce(actual_micros,reserved_micros)),0) chargedMicros,sum(CASE WHEN actual_micros IS NULL THEN 1 ELSE 0 END) unknownCalls FROM translation_attempt WHERE day=?"
			)
			.bind(translationDay(now))
			.first<{
				calls: number;
				chargedMicros: number;
				unknownCalls: number | null;
			}>(),
		database
			.prepare(
				"SELECT blocked_until blockedUntil,reason,scheduler_seen_at schedulerSeenAt FROM translation_control WHERE id=1"
			)
			.first<{
				blockedUntil: number;
				reason: string | null;
				schedulerSeenAt: number;
			}>(),
	]);
	return { day: translationDay(now), ...usage, ...control };
}
