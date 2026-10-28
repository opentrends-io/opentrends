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
	runTranslationBatch,
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

// Old queue messages remain safe: unsupported locales drain, supported ones
// register the latest input before using the same durable attempt budget.
export async function runTranslationPrewarmJob(
	message: TranslationPrewarmMessage,
	generator?: TranslationGenerator
): Promise<void> {
	if (
		!translationPolicy() ||
		env.TRANSLATION_SCHEDULER_ENABLED !== "true" ||
		(message.lang !== "zh" && message.lang !== "en")
	) {
		return;
	}
	const database = getWorkerBindings()?.DB;
	if (!database) {
		return;
	}
	const owner = await claimTranslationLane(database, message.lang);
	if (!owner) {
		return;
	}
	const started = Date.now();
	try {
		if (message.sourceId) {
			const snapshot = await readSnapshot(message.sourceId);
			if (snapshot) {
				await registerItems(snapshot.items);
			}
		}
		for (let batch = 0; batch < 6 && Date.now() - started < 90_000; batch++) {
			if (!(await touchTranslationLane(database, message.lang, owner))) {
				break;
			}
			if (!(await runTranslationBatch(message.lang, generator))) {
				break;
			}
			await touchTranslationLane(database, message.lang, owner, true);
		}
	} finally {
		await releaseTranslationLane(database, message.lang, owner);
	}
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
	for (let offset = 0; offset < Math.min(16, sources.length); offset++) {
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
		.bind(sources.length ? (cursor + 16) % sources.length : 0)
		.run();
	try {
		const events = await database
			.prepare(
				"SELECT event_id,title,summary FROM trend_event e WHERE event_id>? AND primary_source_id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM trend_event_topic t WHERE t.event_id=e.event_id AND t.topic_id IN (SELECT value FROM json_each(?))) ORDER BY event_id LIMIT 20"
			)
			.bind(
				control?.event_cursor ?? "",
				JSON.stringify(getEventEligibleSourceIds()),
				JSON.stringify(Object.keys(topicPresets))
			)
			.all<{ event_id: string; title: string; summary: string | null }>();
		await registerItems(
			await resolveEventTranslationItems(
				events.results.map((event) => ({
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
