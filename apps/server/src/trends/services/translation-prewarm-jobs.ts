import { env } from "@opentrends/env/server";
import { getWorkerBindings } from "../../runtime";
import { readSnapshot } from "../cache/source-cache";
import { getEventEligibleSourceIds, sourcePresets } from "../config/sources";
import { topicPresets } from "../config/topics";
import type { NewsItem, SourceId, TrendsPageData } from "../types";
import {
	needsTranslation,
	type TranslationLanguage,
} from "./translate-news-items";
import {
	expireTranslationLeases,
	registerTranslationJobs,
	translationBudgetSnapshot,
} from "./translation-job-store";
import { translationPolicy } from "./translation-policy";
import {
	claimTranslationLane,
	releaseTranslationLane,
	releaseTranslationWake,
	reserveTranslationWake,
	touchTranslationLane,
} from "./translation-service";
import {
	type ClaimedTranslationBatch,
	claimTranslationWork,
	runClaimedTranslationBatch,
	type TranslationGenerator,
} from "./translation-worker";

export const TRANSLATION_PREWARM_LANGUAGES = ["zh", "en"] as const;
export interface TranslationPrewarmMessage {
	itemIds?: string[];
	lang: TranslationLanguage;
	sourceId: SourceId;
}

// Pure compatibility helper. Public routes never dispatch these messages.
export function translationPrewarmMessagesForPage(
	page: TrendsPageData,
	lang: TranslationLanguage
): TranslationPrewarmMessage[] {
	if (lang !== "zh" && lang !== "en") {
		return [];
	}
	return [
		...new Set(
			page.sections.flatMap((section) =>
				section.sources
					.filter((source) =>
						source.items.some((item) => needsTranslation(item, lang))
					)
					.map((source) => source.sourceId)
			)
		),
	].map((sourceId) => ({ sourceId, lang }));
}

async function registerItems(items: NewsItem[]): Promise<void> {
	const database = getWorkerBindings()?.DB;
	if (!(database && translationPolicy())) {
		return;
	}
	await registerTranslationJobs(
		database,
		TRANSLATION_PREWARM_LANGUAGES.flatMap((lang) =>
			items
				.filter((item) => needsTranslation(item, lang))
				.map((item) => ({
					subjectType: item.sourceId.startsWith("event:")
						? ("event" as const)
						: ("source" as const),
					sourceId: item.sourceId,
					itemId: item.id,
					lang,
					title: item.title,
					description: item.description,
				}))
		)
	);
}

async function wake(lang: "zh" | "en"): Promise<void> {
	const queue = getWorkerBindings()?.SUMMARY_PREWARM_QUEUE;
	const database = getWorkerBindings()?.DB;
	const policy = translationPolicy();
	if (
		!(queue && database && policy) ||
		env.TRANSLATION_SCHEDULER_ENABLED !== "true"
	) {
		return; // Durable jobs remain available for the next scheduled reconciliation.
	}
	const now = Date.now();
	const budget = await translationBudgetSnapshot(database, now);
	if (
		(budget.calls ?? 0) >= policy.dailyCalls ||
		(budget.chargedMicros ?? 0) + policy.reserveMicros > policy.dailyMicros ||
		(budget.blockedUntil ?? 0) > now
	) {
		return;
	}
	const due = await database
		.prepare(
			"SELECT 1 FROM translation_job WHERE lang=? AND attempts<3 AND ((state IN ('queued','retry_wait') AND next_attempt_at<=?) OR (state='running' AND lease_until<=?)) LIMIT 1"
		)
		.bind(lang, now, now)
		.first();
	if (!(due && (await reserveTranslationWake(database, lang, now)))) {
		return;
	}
	try {
		await queue.send({
			kind: "translation-prewarm",
			payload: { sourceId: "", lang },
		});
	} catch {
		await releaseTranslationWake(database, lang);
		console.warn("[translation-jobs] wakeup failed; durable jobs retained");
	}
}

export async function dispatchTranslationPrewarmJobs(
	_sourceId: SourceId,
	items: NewsItem[]
): Promise<void> {
	if (!translationPolicy()) {
		return;
	}
	await registerItems(items);
	await Promise.all(TRANSLATION_PREWARM_LANGUAGES.map(wake));
}

// A lane runs a few model calls side by side: each claim reserves its own
// attempt under the global concurrency and per-minute caps, so parallel
// rounds spend no more than the policy allows, only sooner.
const PARALLEL_BATCHES = 3;
const MAX_ROUNDS_PER_WAKE = 6;
export const DRAIN_BUDGET_MS = 90_000;

// Old queue messages remain safe: unsupported locales drain, supported ones
// register the latest input before using the same durable attempt budget.
// Returns whether due work may remain, so the caller can wake again.
export async function runTranslationPrewarmJob(
	message: TranslationPrewarmMessage,
	generator?: TranslationGenerator,
	budgetMs = DRAIN_BUDGET_MS
): Promise<boolean> {
	if (
		!translationPolicy() ||
		env.TRANSLATION_SCHEDULER_ENABLED !== "true" ||
		(message.lang !== "zh" && message.lang !== "en")
	) {
		return false;
	}
	const lang = message.lang;
	const database = getWorkerBindings()?.DB;
	if (!database) {
		return false;
	}
	const owner = await claimTranslationLane(database, lang);
	if (!owner) {
		return false;
	}
	const started = Date.now();
	let exhausted = false;
	try {
		if (message.sourceId) {
			const snapshot = await readSnapshot(message.sourceId);
			if (snapshot) {
				await registerItems(snapshot.items);
			}
		}
		for (
			let round = 0;
			round < MAX_ROUNDS_PER_WAKE && Date.now() - started < budgetMs;
			round++
		) {
			if (!(await touchTranslationLane(database, lang, owner))) {
				break;
			}
			if (!(await runTranslationRound(lang, generator))) {
				exhausted = true;
				break;
			}
			await touchTranslationLane(database, lang, owner, true);
		}
	} finally {
		await releaseTranslationLane(database, lang, owner);
	}
	if (!exhausted) {
		// More may be due: ask for the next delivery now instead of waiting
		// for the scheduler's next tick. Idempotent per language.
		await wake(lang);
	}
	return !exhausted;
}

// Claims one after another so they take disjoint jobs; the model calls
// then run side by side. False when nothing could be claimed.
async function runTranslationRound(
	lang: "zh" | "en",
	generator?: TranslationGenerator
): Promise<boolean> {
	const claimed: ClaimedTranslationBatch[] = [];
	for (let slot = 0; slot < PARALLEL_BATCHES; slot++) {
		const batch = await claimTranslationWork(lang);
		if (!batch) {
			break;
		}
		claimed.push(batch);
	}
	if (claimed.length === 0) {
		return false;
	}
	await Promise.all(
		claimed.map((batch) => runClaimedTranslationBatch(lang, batch, generator))
	);
	return true;
}

// The scheduler's own drain: both lanes side by side, bounded to the
// tick, independent of the shared queue. A lane held by a queue consumer
// is simply skipped.
export async function drainTranslationJobs(
	generator?: TranslationGenerator,
	budgetMs = 50_000
): Promise<void> {
	await Promise.all(
		TRANSLATION_PREWARM_LANGUAGES.map((lang) =>
			runTranslationPrewarmJob({ sourceId: "", lang }, generator, budgetMs)
		)
	);
}

// Event text identical to a source item uses its translation, not a second job.
export async function resolveEventTranslationItems(
	items: NewsItem[]
): Promise<NewsItem[]> {
	const database = getWorkerBindings()?.DB;
	if (!(database && items.length)) {
		return items;
	}
	const matches = new Map<
		string,
		{
			source_id: string;
			item_id: string;
			title: string;
			description: string | null;
		}
	>();
	for (let start = 0; start < items.length; start += 80) {
		const part = items.slice(start, start + 80);
		const rows = await database
			.prepare(
				`SELECT e.event_id,s.source_id,s.item_id,s.title,s.description FROM trend_event e JOIN source_item s ON s.source_id=e.primary_source_id AND s.item_id=e.primary_item_id WHERE e.event_id IN (${part.map(() => "?").join(",")})`
			)
			.bind(...part.map((item) => item.id))
			.all<{
				event_id: string;
				source_id: string;
				item_id: string;
				title: string;
				description: string | null;
			}>();
		for (const row of rows.results) {
			matches.set(row.event_id, row);
		}
	}
	return items.map((item) => {
		const match = matches.get(item.id);
		return match &&
			match.title === item.title &&
			(match.description ?? "") === (item.description ?? "")
			? { ...item, sourceId: match.source_id, id: match.item_id }
			: item;
	});
}

// Recovers a crash between source persistence and registration, lost queue
// deliveries, and expired leases without depending on a visitor. Bounded sweep.
export async function reconcileTranslationJobs(
	dependencies: { readSource?: typeof readSnapshot; sourceIds?: string[] } = {}
): Promise<void> {
	const database = getWorkerBindings()?.DB;
	if (
		!(database && translationPolicy()) ||
		env.TRANSLATION_SCHEDULER_ENABLED !== "true"
	) {
		return;
	}
	await database
		.prepare("UPDATE translation_control SET scheduler_seen_at=? WHERE id=1")
		.bind(Date.now())
		.run();
	await expireTranslationLeases(database);
	// Wake already durable work before ingestion: a bad source cannot stop
	// unrelated translations. Sending is idempotent per language/lease.
	await Promise.all(TRANSLATION_PREWARM_LANGUAGES.map(wake));
	const control = await database
		.prepare(
			"SELECT reconcile_cursor,event_cursor FROM translation_control WHERE id=1"
		)
		.first<{ reconcile_cursor: number; event_cursor: string }>();
	const sources = dependencies.sourceIds ?? [
		...new Set([
			...topicPresets.featured.sections.flatMap((section) => [
				...section.sourceIds,
			]),
			...Object.keys(sourcePresets),
		]),
	];
	const cursor = control?.reconcile_cursor ?? 0;
	for (
		let offset = 0;
		offset < Math.min(RECONCILE_SOURCES_PER_TICK, sources.length);
		offset++
	) {
		const sourceId = sources[(cursor + offset) % sources.length];
		if (!sourceId) {
			continue;
		}
		try {
			const snapshot = await (dependencies.readSource ?? readSnapshot)(
				sourceId
			);
			if (snapshot) {
				await registerItems(snapshot.items);
			}
		} catch {
			console.warn(
				"[translation-jobs] one source failed; continuing reconciliation"
			);
		}
	}
	await database
		.prepare("UPDATE translation_control SET reconcile_cursor=? WHERE id=1")
		.bind(
			sources.length
				? (cursor + RECONCILE_SOURCES_PER_TICK) % sources.length
				: 0
		)
		.run();
	try {
		const eligible = JSON.stringify(getEventEligibleSourceIds());
		const topics = JSON.stringify(Object.keys(topicPresets));
		// Events written or reworded in the last while go first, every tick,
		// so a fresh event is registered within a minute; the cursor sweep
		// behind it still covers everything else over time.
		const [recent, events] = await Promise.all([
			database
				.prepare(
					`SELECT event_id,title,summary FROM trend_event e WHERE updated_at>=? AND ${EVENT_PUBLIC} ORDER BY updated_at DESC LIMIT ?`
				)
				.bind(
					Math.floor(Date.now() / 1000) - RECENT_EVENT_WINDOW_S,
					eligible,
					topics,
					RECENT_EVENTS_PER_TICK
				)
				.all<EventRow>(),
			database
				.prepare(
					`SELECT event_id,title,summary FROM trend_event e WHERE event_id>? AND ${EVENT_PUBLIC} ORDER BY event_id LIMIT ?`
				)
				.bind(control?.event_cursor ?? "", eligible, topics, EVENTS_PER_TICK)
				.all<EventRow>(),
		]);
		await registerItems(
			await resolveEventTranslationItems(
				[...recent.results, ...events.results].map((event) => ({
					id: event.event_id,
					sourceId: `event:${event.event_id}`,
					title: event.title,
					description: event.summary ?? undefined,
					url: "",
					fetchedAt: 0,
				}))
			)
		);
		await database
			.prepare("UPDATE translation_control SET event_cursor=? WHERE id=1")
			.bind(events.results.at(-1)?.event_id ?? "")
			.run();
	} finally {
		await Promise.all(TRANSLATION_PREWARM_LANGUAGES.map(wake));
	}
}

interface EventRow {
	event_id: string;
	summary: string | null;
	title: string;
}
const EVENT_PUBLIC =
	"primary_source_id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM trend_event_topic t WHERE t.event_id=e.event_id AND t.topic_id IN (SELECT value FROM json_each(?)))";
const RECONCILE_SOURCES_PER_TICK = 32;
const EVENTS_PER_TICK = 40;
const RECENT_EVENTS_PER_TICK = 60;
const RECENT_EVENT_WINDOW_S = 2 * 3600;
