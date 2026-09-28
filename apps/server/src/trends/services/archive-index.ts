import { type CacheEnvelope, hotCache } from "../cache/hot-cache";
import { topicPresets } from "../config/topics";
import { listArchivedDays } from "./digest-archive";
import type { TranslationLanguage } from "./translate-news-items";

// Every archived digest day, per topic and language, in one small document.
// The archive sitemap and the day lists on topic pages read this instead of
// listing KV on every request: a list is slow, and the free plan allows a
// thousand a day. A copy older than three hours is still served at once
// while a rebuild runs in the background; if the rebuild fails or comes back
// suspiciously short, the last good copy stays.

export interface ArchiveIndex {
	generatedAt: number;
	/** topic → language → days, newest first. Empty entries are left out. */
	topics: Record<string, Record<string, string[]>>;
}

export type ArchiveIndexSource = "stored" | "built" | "stale";

export interface ResolvedArchiveIndex {
	index: ArchiveIndex;
	source: ArchiveIndexSource;
}

// Digests archived every day by the scheduler. Other languages are archived
// only when a reader asks, and are not listed here.
export const ARCHIVE_INDEX_LANGS = [
	"en",
	"zh",
] as const satisfies readonly TranslationLanguage[];
// Archives gain one day per topic per day, so three hours is plenty fresh:
// eight rebuilds of fourteen listings a day.
export const ARCHIVE_INDEX_FRESH_MS = 3 * 60 * 60_000;
// Archived digests live 400 days, so the index never needs more.
const ARCHIVE_INDEX_DAY_LIMIT = 400;
// A rebuild with fewer than half the stored days is treated as a short
// listing (eventual consistency, a missing binding), not as lost archives.
const SHORT_REBUILD_RATIO = 0.5;
const INDEX_KEY = "trends:v1:digest-archive-index";
const INDEX_SCHEMA_VERSION = 1;
const INDEX_KEEP_SECONDS = 30 * 24 * 60 * 60;

export function countArchiveDays(index: ArchiveIndex): number {
	let total = 0;
	for (const langs of Object.values(index.topics)) {
		for (const days of Object.values(langs)) {
			total += days.length;
		}
	}
	return total;
}

export async function buildArchiveIndex(options: {
	langs: readonly string[];
	listDays: (topic: string, lang: string) => Promise<string[]>;
	now: () => number;
	topics: readonly string[];
}): Promise<ArchiveIndex> {
	const pairs = options.topics.flatMap((topic) =>
		options.langs.map((lang) => ({ lang, topic }))
	);
	const lists = await Promise.all(
		pairs.map(async ({ lang, topic }) => ({
			days: await options.listDays(topic, lang),
			lang,
			topic,
		}))
	);
	const topics: ArchiveIndex["topics"] = {};
	for (const { days, lang, topic } of lists) {
		if (days.length === 0) {
			continue;
		}
		topics[topic] = { ...topics[topic], [lang]: days };
	}
	return { generatedAt: options.now(), topics };
}

export interface ArchiveIndexDeps {
	build: () => Promise<ArchiveIndex>;
	/** Keeps a background rebuild alive past the response (waitUntil). When
	 * absent, a stale copy is rebuilt before answering. */
	defer?: (task: Promise<unknown>) => void;
	now: () => number;
	readStored: () => Promise<ArchiveIndex | null>;
	writeStored: (index: ArchiveIndex) => Promise<void>;
}

// Builds a new index and stores it, unless it came back far shorter than
// the copy it would replace. Returns the index to serve.
async function rebuild(
	deps: ArchiveIndexDeps,
	stored: ArchiveIndex | null
): Promise<ResolvedArchiveIndex> {
	const built = await deps.build();
	if (
		stored &&
		countArchiveDays(built) < countArchiveDays(stored) * SHORT_REBUILD_RATIO
	) {
		return { index: stored, source: "stale" };
	}
	await deps.writeStored(built).catch(() => undefined);
	return { index: built, source: "built" };
}

export async function resolveArchiveIndex(
	deps: ArchiveIndexDeps
): Promise<ResolvedArchiveIndex> {
	const stored = await deps.readStored().catch(() => null);
	if (stored && deps.now() - stored.generatedAt < ARCHIVE_INDEX_FRESH_MS) {
		return { index: stored, source: "stored" };
	}
	if (stored && deps.defer) {
		deps.defer(
			rebuild(deps, stored).catch((error) => {
				console.warn("[archive-index] background rebuild failed", error);
			})
		);
		return { index: stored, source: "stale" };
	}
	try {
		return await rebuild(deps, stored);
	} catch (error) {
		if (stored) {
			return { index: stored, source: "stale" };
		}
		throw error;
	}
}

// One copy per isolate in front of KV, so a warm worker answers without I/O.
let memory: ArchiveIndex | null = null;

async function readStoredIndex(): Promise<ArchiveIndex | null> {
	if (memory && Date.now() - memory.generatedAt < ARCHIVE_INDEX_FRESH_MS) {
		return memory;
	}
	const envelope = await hotCache.get<ArchiveIndex>(INDEX_KEY);
	const fromKv =
		envelope?.schemaVersion === INDEX_SCHEMA_VERSION ? envelope.value : null;
	// Another isolate may have written a newer copy than the one held here.
	const newest =
		fromKv && (!memory || fromKv.generatedAt > memory.generatedAt)
			? fromKv
			: memory;
	memory = newest;
	return newest;
}

async function writeStoredIndex(index: ArchiveIndex): Promise<void> {
	// Requests that shared one rebuild all try to store it; once is enough.
	if (memory?.generatedAt === index.generatedAt) {
		return;
	}
	memory = index;
	const envelope: CacheEnvelope<ArchiveIndex> = {
		createdAt: index.generatedAt,
		freshUntil: index.generatedAt + ARCHIVE_INDEX_FRESH_MS,
		schemaVersion: INDEX_SCHEMA_VERSION,
		staleUntil: index.generatedAt + INDEX_KEEP_SECONDS * 1000,
		value: index,
	};
	await hotCache.put(INDEX_KEY, envelope, INDEX_KEEP_SECONDS);
}

// One rebuild at a time per isolate; concurrent requests share it.
let inFlight: Promise<ArchiveIndex> | null = null;

function buildShared(): Promise<ArchiveIndex> {
	if (!inFlight) {
		inFlight = buildLive().finally(() => {
			inFlight = null;
		});
	}
	return inFlight;
}

function buildLive(): Promise<ArchiveIndex> {
	return buildArchiveIndex({
		langs: ARCHIVE_INDEX_LANGS,
		listDays: (topic, lang) =>
			listArchivedDays(
				topic,
				lang as TranslationLanguage,
				ARCHIVE_INDEX_DAY_LIMIT
			),
		now: () => Date.now(),
		topics: Object.keys(topicPresets),
	});
}

export function getArchiveIndex(
	waitUntil?: (task: Promise<unknown>) => void
): Promise<ResolvedArchiveIndex> {
	return resolveArchiveIndex({
		build: buildShared,
		defer: waitUntil,
		now: () => Date.now(),
		readStored: readStoredIndex,
		writeStored: writeStoredIndex,
	});
}

// The archived days of one topic in one language: from the index for the
// languages it covers, from a KV listing for the rest.
export async function archivedDaysFor(
	topic: string,
	lang: TranslationLanguage,
	waitUntil?: (task: Promise<unknown>) => void
): Promise<string[]> {
	if ((ARCHIVE_INDEX_LANGS as readonly string[]).includes(lang)) {
		try {
			const { index } = await getArchiveIndex(waitUntil);
			return index.topics[topic]?.[lang] ?? [];
		} catch {
			// Fall through to a direct listing.
		}
	}
	return listArchivedDays(topic, lang);
}
