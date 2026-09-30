import { env } from "@opentrends/env/web";

import type { Locale } from "@/lib/i18n";
import { TRENDS_FULL_ITEMS_PER_SOURCE } from "./trends-limits";
import type {
	ArchivedDigestData,
	EventDetailData,
	EventFeedData,
	EventFeedView,
	EventPageSummary,
	EventPageView,
	SourceCardData,
	SourceDetailData,
	TrendsPageData,
} from "./types";

const TRENDS_FETCH_TIMEOUT_MS = 25_000;

export class TrendsTopicNotFoundError extends Error {
	constructor(topic: string) {
		super(`Unknown trends topic: ${topic}`);
		this.name = "TrendsTopicNotFoundError";
	}
}

export class TrendEventsEmbeddingNotConfiguredError extends Error {
	constructor() {
		super("Event embedding is not configured.");
		this.name = "TrendEventsEmbeddingNotConfiguredError";
	}
}

// The exact address the page data comes from; the feed route preloads it
// from the HTML head so the request starts before the scripts arrive.
export function trendsPageUrl(
	topic: string | undefined,
	locale: Locale,
	itemsPerSource = TRENDS_FULL_ITEMS_PER_SOURCE,
	sourceIds?: readonly string[]
): string {
	const path = topic
		? `/api/trends/${encodeURIComponent(topic)}`
		: "/api/trends";
	const search = new URLSearchParams({
		items: String(itemsPerSource),
		lang: locale,
		translations: "background",
	});
	if (sourceIds) {
		search.set("sources", sourceIds.join(","));
	}
	return `${env.VITE_SERVER_URL}${path}?${search}`;
}

export async function loadTrends(
	topic?: string,
	locale: Locale = "en",
	itemsPerSource = TRENDS_FULL_ITEMS_PER_SOURCE,
	sourceIds?: readonly string[]
): Promise<TrendsPageData> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TRENDS_FETCH_TIMEOUT_MS);
	let response: Response;
	try {
		// "same-origin" sends nothing cross-site, like "omit", but matches a
		// <link rel="preload" crossorigin> the page may have issued for the
		// same URL, so the preloaded bytes are reused.
		response = await fetch(
			trendsPageUrl(topic, locale, itemsPerSource, sourceIds),
			{
				credentials: "same-origin",
				signal: controller.signal,
			}
		);
	} finally {
		clearTimeout(timeout);
	}
	if (response.status === 404) {
		throw new TrendsTopicNotFoundError(topic ?? "ai");
	}
	if (!response.ok) {
		throw new Error(`Failed to load trends page (${response.status})`);
	}
	return (await response.json()) as TrendsPageData;
}

export async function loadTrendSource(
	topic: string,
	sourceId: string,
	locale: Locale = "en",
	itemsPerSource = TRENDS_FULL_ITEMS_PER_SOURCE
): Promise<SourceCardData> {
	const search = new URLSearchParams({
		items: String(itemsPerSource),
		lang: locale,
		translations: "background",
	});
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TRENDS_FETCH_TIMEOUT_MS);
	let response: Response;
	try {
		response = await fetch(
			`${env.VITE_SERVER_URL}/api/trends/${encodeURIComponent(topic)}/sources/${encodeURIComponent(sourceId)}?${search}`,
			{
				credentials: "omit",
				signal: controller.signal,
			}
		);
	} finally {
		clearTimeout(timeout);
	}
	if (!response.ok) {
		throw new Error(`Failed to load trend source (${response.status})`);
	}
	return (await response.json()) as SourceCardData;
}

export async function loadTrendEvents(
	topic?: string,
	offset = 0,
	limit = 30,
	locale: Locale = "en",
	view?: EventFeedView
): Promise<EventFeedData> {
	const search = new URLSearchParams();
	if (topic) {
		search.set("topic", topic);
	}
	if (view) {
		search.set("view", view);
	}
	search.set("offset", String(offset));
	search.set("limit", String(limit));
	search.set("lang", locale);
	search.set("translations", "background");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TRENDS_FETCH_TIMEOUT_MS);
	let response: Response;
	try {
		const suffix = search.size > 0 ? `?${search}` : "";
		response = await fetch(`${env.VITE_SERVER_URL}/api/events${suffix}`, {
			credentials: "omit",
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
	if (response.status === 404) {
		throw new TrendsTopicNotFoundError(topic ?? "events");
	}
	if (response.status === 503) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		if (payload?.error === "embedding_not_configured") {
			throw new TrendEventsEmbeddingNotConfiguredError();
		}
	}
	if (!response.ok) {
		throw new Error(`Failed to load trend events (${response.status})`);
	}
	return (await response.json()) as EventFeedData;
}

export async function loadTrendEventDetail(
	eventId: string,
	topic?: string,
	locale: Locale = "en"
): Promise<EventDetailData> {
	const search = new URLSearchParams();
	if (topic) {
		search.set("topic", topic);
	}
	search.set("lang", locale);
	search.set("translations", "background");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TRENDS_FETCH_TIMEOUT_MS);
	let response: Response;
	try {
		const suffix = search.size > 0 ? `?${search}` : "";
		response = await fetch(
			`${env.VITE_SERVER_URL}/api/events/${encodeURIComponent(eventId)}${suffix}`,
			{
				credentials: "omit",
				signal: controller.signal,
			}
		);
	} finally {
		clearTimeout(timeout);
	}
	if (response.status === 503) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		if (payload?.error === "embedding_not_configured") {
			throw new TrendEventsEmbeddingNotConfiguredError();
		}
	}
	if (!response.ok) {
		throw new Error(`Failed to load trend event (${response.status})`);
	}
	return (await response.json()) as EventDetailData;
}

export async function loadDigestDays(
	topic: string,
	locale: Locale
): Promise<string[]> {
	const search = new URLSearchParams({ lang: locale });
	const response = await fetch(
		`${env.VITE_SERVER_URL}/api/trends/${encodeURIComponent(topic)}/digest-days?${search}`,
		{ credentials: "omit" }
	);
	if (!response.ok) {
		throw new Error(`Failed to load digest days (${response.status})`);
	}
	const body = (await response.json()) as { days?: string[] };
	return body.days ?? [];
}

export class ArchivedDigestNotFoundError extends Error {
	constructor(topic: string, day: string) {
		super(`No digest archived for ${topic} on ${day}`);
		this.name = "ArchivedDigestNotFoundError";
	}
}

export async function loadArchivedDigest(
	topic: string,
	day: string,
	locale: Locale
): Promise<ArchivedDigestData> {
	const search = new URLSearchParams({ lang: locale });
	const response = await fetch(
		`${env.VITE_SERVER_URL}/api/trends/${encodeURIComponent(topic)}/digest/${encodeURIComponent(day)}?${search}`,
		{ credentials: "omit" }
	);
	if (response.status === 404) {
		throw new ArchivedDigestNotFoundError(topic, day);
	}
	if (!response.ok) {
		throw new Error(`Failed to load archived digest (${response.status})`);
	}
	return (await response.json()) as ArchivedDigestData;
}

export class SourceNotFoundError extends Error {
	constructor(sourceId: string) {
		super(`Unknown source ${sourceId}`);
		this.name = "SourceNotFoundError";
	}
}

export async function loadSourceDetail(
	sourceId: string,
	locale: Locale
): Promise<SourceDetailData> {
	const search = new URLSearchParams({ lang: locale });
	const response = await fetch(
		`${env.VITE_SERVER_URL}/api/sources/${encodeURIComponent(sourceId)}?${search}`,
		{ credentials: "omit" }
	);
	if (response.status === 404) {
		throw new SourceNotFoundError(sourceId);
	}
	if (!response.ok) {
		throw new Error(`Failed to load source (${response.status})`);
	}
	return (await response.json()) as SourceDetailData;
}

export class EventPageNotFoundError extends Error {
	constructor(slug: string) {
		super(`No event page ${slug}`);
		this.name = "EventPageNotFoundError";
	}
}

export async function loadEventPage(slug: string): Promise<EventPageView> {
	const response = await fetch(
		`${env.VITE_SERVER_URL}/api/event-pages/${encodeURIComponent(slug)}`,
		{ credentials: "omit" }
	);
	if (response.status === 404) {
		throw new EventPageNotFoundError(slug);
	}
	if (!response.ok) {
		throw new Error(`Failed to load event page (${response.status})`);
	}
	return (await response.json()) as EventPageView;
}

export async function loadEventPages(): Promise<EventPageSummary[]> {
	const response = await fetch(`${env.VITE_SERVER_URL}/api/event-pages`, {
		credentials: "omit",
	});
	if (!response.ok) {
		throw new Error(`Failed to load event pages (${response.status})`);
	}
	const body = (await response.json()) as { pages?: EventPageSummary[] };
	return body.pages ?? [];
}
