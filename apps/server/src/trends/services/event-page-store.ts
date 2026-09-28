import { getWorkerBindings } from "../../runtime";
import {
	type EventPageDoc,
	type EventPageSummary,
	summarizePage,
} from "./event-page-model";

// Event pages live in KV without an expiry: a published page is a permanent
// URL. One document per page, plus a small index for listing them, so no
// KV list call is needed (the free plan allows a thousand a day).

const DOC_PREFIX = "event-page:v1:doc:";
const INDEX_KEY = "event-page:v1:index";
const INDEX_MEMORY_MS = 60_000;

export interface EventPageIndexEntry {
	eventIds: string[];
	keyword: string;
	slug: string;
	/** Present only while the page is published. */
	summary?: EventPageSummary;
	updatedAt: string;
}

interface EventPageIndex {
	pages: EventPageIndexEntry[];
}

function kv(): KVNamespace {
	const namespace = getWorkerBindings()?.HOT_CACHE;
	if (!namespace) {
		throw new Error("KV is not bound; event pages are unavailable.");
	}
	return namespace;
}

let indexMemory: { at: number; index: EventPageIndex } | null = null;

export async function readEventPageIndex(): Promise<EventPageIndexEntry[]> {
	if (indexMemory && Date.now() - indexMemory.at < INDEX_MEMORY_MS) {
		return indexMemory.index.pages;
	}
	const index = (await kv().get<EventPageIndex>(INDEX_KEY, "json")) ?? {
		pages: [],
	};
	indexMemory = { at: Date.now(), index };
	return index.pages;
}

async function writeIndexEntry(doc: EventPageDoc): Promise<void> {
	const pages = (await readEventPageIndexFresh()).filter(
		(entry) => entry.slug !== doc.slug
	);
	const summary = summarizePage(doc);
	pages.push({
		eventIds: [
			...new Set([
				...(doc.draft?.eventIds ?? []),
				...(doc.published?.eventIds ?? []),
			]),
		],
		keyword: doc.keyword,
		slug: doc.slug,
		...(summary ? { summary } : {}),
		updatedAt: doc.updatedAt,
	});
	await putIndex(pages);
}

function readEventPageIndexFresh(): Promise<EventPageIndexEntry[]> {
	indexMemory = null;
	return readEventPageIndex();
}

async function putIndex(pages: EventPageIndexEntry[]): Promise<void> {
	const index = { pages };
	await kv().put(INDEX_KEY, JSON.stringify(index));
	indexMemory = { at: Date.now(), index };
}

export function readEventPage(slug: string): Promise<EventPageDoc | null> {
	return kv().get<EventPageDoc>(`${DOC_PREFIX}${slug}`, "json");
}

export async function writeEventPage(doc: EventPageDoc): Promise<void> {
	await kv().put(`${DOC_PREFIX}${doc.slug}`, JSON.stringify(doc));
	await writeIndexEntry(doc);
}

export async function deleteEventPage(slug: string): Promise<void> {
	await kv().delete(`${DOC_PREFIX}${slug}`);
	await putIndex(
		(await readEventPageIndexFresh()).filter((entry) => entry.slug !== slug)
	);
}

export async function listPublishedEventPages(): Promise<EventPageSummary[]> {
	return (await readEventPageIndex())
		.flatMap((entry) => (entry.summary ? [entry.summary] : []))
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
