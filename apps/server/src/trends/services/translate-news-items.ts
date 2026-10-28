import type { TranslationStatus } from "@opentrends/api/translation-contract";
import { env } from "@opentrends/env/server";
import { getWorkerBindings } from "../../runtime";
import { readItemTranslations } from "../cache/item-translation-cache";
import type { NewsItem, TrendsPageData } from "../types";
import { translationHash, translationJobId } from "./translation-identity";
import {
	type TranslationJob,
	translationBudgetSnapshot,
} from "./translation-job-store";
import { translationPolicy } from "./translation-policy";

export const TRANSLATION_LANGUAGES = [
	"en",
	"zh",
	"zh-Hant",
	"ru",
	"fr-FR",
	"es-ES",
	"de-DE",
	"pt-BR",
] as const;
export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];
// Kept for old callers; neither mode is allowed to generate on a read.
export type TranslationMode = "background" | "sync";
export interface TranslationOptions {
	waitUntil?: (promise: Promise<unknown>) => void;
}
const CJK = /[\u3400-\u9fff]/;
const CYRILLIC = /\p{Script=Cyrillic}/u;

export function isTranslationLanguage(
	value: string | undefined
): value is TranslationLanguage {
	return (
		value !== undefined &&
		(TRANSLATION_LANGUAGES as readonly string[]).includes(value)
	);
}
export function normalizeTranslationLanguage(
	value: string | undefined
): TranslationLanguage {
	return isTranslationLanguage(value) ? value : "en";
}
function needsText(
	text: string | undefined,
	lang: TranslationLanguage
): boolean {
	if (!text?.trim()) {
		return false;
	}
	if (lang === "zh") {
		return !CJK.test(text);
	}
	if (lang === "en") {
		return CJK.test(text) || CYRILLIC.test(text);
	}
	if (lang === "ru") {
		return !CYRILLIC.test(text);
	}
	return true;
}
export function needsTranslation(
	item: NewsItem,
	lang: TranslationLanguage
): boolean {
	return (
		!item.original &&
		(needsText(item.title, lang) || needsText(item.description, lang))
	);
}
export function isTranslationConfigured(): boolean {
	return translationPolicy() !== null;
}

function blockedReasonForService(
	policy: ReturnType<typeof translationPolicy>,
	budget: Awaited<ReturnType<typeof translationBudgetSnapshot>> | undefined,
	lang: TranslationLanguage,
	now: number
): TranslationStatus["reason"] {
	if (lang !== "zh" && lang !== "en") {
		return "unsupported";
	}
	if (!(policy && getWorkerBindings()?.SUMMARY_PREWARM_QUEUE)) {
		return "configuration";
	}
	if (env.TRANSLATION_SCHEDULER_ENABLED !== "true") {
		return "paused";
	}
	if (!budget) {
		return "storage";
	}
	if ((budget.blockedUntil ?? 0) > now) {
		return budget.reason === "rate_limit" || budget.reason === "configuration"
			? budget.reason
			: "provider";
	}
	if ((budget.calls ?? 0) >= policy.dailyCalls) {
		return "call_limit";
	}
	if ((budget.chargedMicros ?? 0) + policy.reserveMicros > policy.dailyMicros) {
		return "budget";
	}
}

async function readStatuses(
	items: NewsItem[],
	lang: TranslationLanguage
): Promise<Map<string, TranslationStatus>> {
	const database = getWorkerBindings()?.DB;
	const now = Date.now();
	const statuses = new Map<string, TranslationStatus>();
	const policy = translationPolicy();
	if (!database) {
		return statuses;
	}
	const budget = policy
		? await translationBudgetSnapshot(database, now)
		: undefined;
	const blockedReason = blockedReasonForService(policy, budget, lang, now);
	const jobs = new Map<string, TranslationJob>();
	const lane = await database
		.prepare("SELECT consumer_seen_at FROM translation_lane WHERE lang=?")
		.bind(lang)
		.first<{ consumer_seen_at: number }>();
	const ids = items.map((item) =>
		translationJobId({
			subjectType: item.sourceId.startsWith("event:") ? "event" : "source",
			sourceId: item.sourceId,
			itemId: item.id,
			lang: lang as "zh" | "en",
			title: item.title,
			description: item.description,
		})
	);
	for (let start = 0; start < ids.length; start += 80) {
		const part = ids.slice(start, start + 80);
		const rows = await database
			.prepare(
				`SELECT * FROM translation_job WHERE id IN (${part.map(() => "?").join(",")})`
			)
			.bind(...part)
			.all<TranslationJob>();
		for (const job of rows.results) {
			jobs.set(job.id, job);
		}
	}
	items.forEach((item, index) => {
		const job = jobs.get(ids[index] ?? "");
		const status: TranslationStatus = {
			state: "unknown",
			language: lang,
			textHash: translationHash(item),
			checkedAt: now,
		};
		const serviceValidUntil = Math.min(
			(budget?.schedulerSeenAt ?? 0) + 180_000,
			Math.max(lane?.consumer_seen_at ?? 0, job?.created_at ?? now) + 180_000
		);
		const reason =
			blockedReason ?? (serviceValidUntil <= now ? "stalled" : undefined);
		Object.assign(status, jobStatus(job, now, reason));
		status.serviceValidUntil = serviceValidUntil;
		status.updatedAt = job?.updated_at;
		statuses.set(`${item.sourceId}:${item.id}`, status);
	});
	return statuses;
}

function jobStatus(
	job: TranslationJob | undefined,
	now: number,
	blockedReason: TranslationStatus["reason"]
): Partial<TranslationStatus> {
	if (job?.state === "failed") {
		return {
			state: "failed",
			reason: job.error_code === "storage" ? "storage" : "attempts",
		};
	}
	if (job?.state === "running" && job.lease_until > now) {
		return {
			state: "running",
			leaseUntil: job.lease_until,
			nextPollAt: now + 10_000,
		};
	}
	if (blockedReason) {
		return { state: "blocked", reason: blockedReason };
	}
	if (job && ["queued", "running", "retry_wait"].includes(job.state)) {
		return {
			state: job.state === "queued" ? "queued" : "retry_wait",
			nextPollAt: Math.max(now + 10_000, job.next_attempt_at),
		};
	}
	return job
		? { state: "unknown" }
		: { state: "unknown", reason: "registration", nextPollAt: now + 10_000 };
}

async function boundedRead<T>(read: Promise<T>, fallback: T): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			read,
			new Promise<T>((resolve) => {
				timer = setTimeout(() => resolve(fallback), 3000);
			}),
		]);
	} catch {
		return fallback;
	} finally {
		clearTimeout(timer);
	}
}

// The only work performed on a public read is cache + durable status lookup.
// Even legacy ?translation=sync callers cannot invoke the model or enqueue work.
export async function translateNewsItems(
	items: NewsItem[],
	lang: TranslationLanguage,
	_mode: TranslationMode = "background",
	_options: TranslationOptions = {}
): Promise<NewsItem[]> {
	const pending = items.filter((item) => needsTranslation(item, lang));
	const [rows, statuses] = pending.length
		? await Promise.all([
				boundedRead(
					readItemTranslations({
						itemIds: pending.map((item) => item.id),
						sourceIds: pending.map((item) => item.sourceId),
						lang,
					}),
					[]
				),
				boundedRead(
					readStatuses(pending, lang),
					new Map<string, TranslationStatus>()
				),
			])
		: ([[], new Map<string, TranslationStatus>()] as const);
	const cached = new Map(
		rows.map((row) => [`${row.sourceId}:${row.itemId}`, row])
	);
	const now = Date.now();
	return items.map((item) => {
		const textHash = translationHash(item.original ?? item);
		const base = { language: lang, textHash, checkedAt: now };
		if (item.original) {
			return {
				...item,
				translation: {
					...base,
					state: "ready",
					updatedAt: item.translation?.updatedAt,
				} as TranslationStatus,
			};
		}
		if (!needsTranslation(item, lang)) {
			return {
				...item,
				translation: { ...base, state: "not_needed" } as TranslationStatus,
			};
		}
		const key = `${item.sourceId}:${item.id}`;
		const row = cached.get(key);
		if (row?.textHash === textHash) {
			return {
				...item,
				title: row.title,
				description: row.description ?? undefined,
				original: { title: item.title, description: item.description },
				translation: {
					...base,
					state: "ready",
					updatedAt: row.updatedAt,
				} as TranslationStatus,
			};
		}
		return {
			...item,
			translation:
				statuses.get(key) ??
				({ ...base, state: "unknown" } as TranslationStatus),
		};
	});
}

export async function translateTrendsPage(
	page: TrendsPageData,
	lang: TranslationLanguage,
	mode: TranslationMode = "background",
	options: TranslationOptions = {}
): Promise<TrendsPageData> {
	const all = page.sections.flatMap((section) =>
		section.sources.flatMap((source) => source.items)
	);
	const translated = await translateNewsItems(all, lang, mode, options);
	let index = 0;
	return {
		...page,
		sections: page.sections.map((section) => ({
			...section,
			sources: section.sources.map((source) => ({
				...source,
				items: source.items.map(() => translated[index++] as NewsItem),
			})),
		})),
	};
}
