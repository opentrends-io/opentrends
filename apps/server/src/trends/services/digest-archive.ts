import { getWorkerBindings } from "../../runtime";
import { type CacheEnvelope, hotCache } from "../cache/hot-cache";
import type { Citation } from "./get-trends-summary";
import type { TranslationLanguage } from "./translate-news-items";

// The last "today" digest written on each calendar day, kept for over a
// year, so the calendar and the archive pages can show past days.
// Days are UTC; a reader's local day maps to the UTC day its noon falls in.
export interface ArchivedDigest {
	at: number;
	citations: Citation[];
	text: string;
}

// Day pages are indexed, so they must not vanish: kept for 400 days.
const ARCHIVE_TTL_SECONDS = 400 * 24 * 60 * 60;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isArchiveDay(value: string): boolean {
	return DAY_RE.test(value);
}
const ARCHIVE_SCHEMA_VERSION = 1;

export function utcDay(timestamp: number): string {
	return new Date(timestamp).toISOString().slice(0, 10);
}

// The UTC day that holds the middle of a reader's local day.
export function archiveDayFor(
	localDay: string,
	tzOffsetMinutes: number
): string {
	const noonLocal =
		Date.parse(`${localDay}T12:00:00Z`) - tzOffsetMinutes * 60_000;
	return utcDay(noonLocal);
}

function archiveKey(
	topicId: string,
	lang: TranslationLanguage,
	day: string
): string {
	return `trends:v1:digest-archive:${topicId}:${lang}:${day}`;
}

export async function archiveDigest(params: {
	citations: Citation[];
	lang: TranslationLanguage;
	text: string;
	topicId: string;
}): Promise<void> {
	const now = Date.now();
	const envelope: CacheEnvelope<ArchivedDigest> = {
		createdAt: now,
		freshUntil: now + ARCHIVE_TTL_SECONDS * 1000,
		schemaVersion: ARCHIVE_SCHEMA_VERSION,
		staleUntil: now + ARCHIVE_TTL_SECONDS * 1000,
		value: { at: now, citations: params.citations, text: params.text },
	};
	await hotCache.put(
		archiveKey(params.topicId, params.lang, utcDay(now)),
		envelope,
		ARCHIVE_TTL_SECONDS
	);
}

export async function readArchivedDigest(
	topicId: string,
	lang: TranslationLanguage,
	day: string
): Promise<ArchivedDigest | null> {
	const envelope = await hotCache.get<ArchivedDigest>(
		archiveKey(topicId, lang, day)
	);
	return envelope?.schemaVersion === ARCHIVE_SCHEMA_VERSION
		? envelope.value
		: null;
}

// The days a topic has a digest archived for, newest first. Backed by a KV
// key listing, so a digest written seconds ago may take a minute to show.
export async function listArchivedDays(
	topicId: string,
	lang: TranslationLanguage,
	limit = 90
): Promise<string[]> {
	const kv = getWorkerBindings()?.HOT_CACHE;
	if (!kv) {
		return [];
	}
	const prefix = archiveKey(topicId, lang, "");
	const days: string[] = [];
	let cursor: string | undefined;
	do {
		const page = await kv.list({ cursor, prefix });
		for (const entry of page.keys) {
			const day = entry.name.slice(prefix.length);
			if (isArchiveDay(day)) {
				days.push(day);
			}
		}
		cursor = page.list_complete ? undefined : page.cursor;
	} while (cursor);
	return days.sort().reverse().slice(0, limit);
}
