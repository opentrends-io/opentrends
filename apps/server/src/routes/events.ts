import { Hono } from "hono";

import { EventEmbeddingNotConfiguredError } from "../trends/services/event-embedding";
import {
	type EventFeedResponse,
	type EventFeedView,
	getEventDetail,
	getEventFeed,
} from "../trends/services/event-feed";
import { getEventStories } from "../trends/services/event-stories";
import {
	TopicNotFoundError,
	TrendsSnapshotsUnavailableError,
} from "../trends/services/get-trends-page";
import {
	normalizeTranslationLanguage,
	type TranslationMode,
} from "../trends/services/translate-news-items";

interface WaitUntilContext {
	executionCtx?: {
		waitUntil?: (promise: Promise<unknown>) => void;
	};
}

// Events are rebuilt every few minutes and a story's rank moves as
// publishers follow it up, so copies are kept for minutes, not half hours.
const PUBLIC_EVENTS_CACHE_CONTROL =
	"public, max-age=120, s-maxage=300, stale-while-revalidate=600";
// workers.dev has no edge cache: keep recent lists in the isolate too.
const MEMORY_TTL_MS = 180_000;
const MEMORY_PENDING_TTL_MS = 30_000;
const MEMORY_MAX_ENTRIES = 200;
const feedMemory = new Map<
	string,
	{ expires: number; feed: EventFeedResponse }
>();

function rememberFeed(key: string, feed: EventFeedResponse): void {
	if (feedMemory.size >= MEMORY_MAX_ENTRIES) {
		const oldest = feedMemory.keys().next().value;
		if (oldest !== undefined) {
			feedMemory.delete(oldest);
		}
	}
	feedMemory.set(key, {
		expires:
			Date.now() +
			(feed.translationsPending ? MEMORY_PENDING_TTL_MS : MEMORY_TTL_MS),
		feed,
	});
}
// While titles are still being translated, a cached page would keep showing
// them in the original language long after the translations are in.
const PENDING_EVENTS_CACHE_CONTROL = "public, max-age=30, s-maxage=60";

function parseView(value: string | undefined): EventFeedView | undefined {
	return value === "stories" || value === "briefs" ? value : undefined;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOffset(value: string | undefined): number | undefined {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseTranslationMode(_value: string | undefined): TranslationMode {
	return "background";
}

function getWaitUntil(c: WaitUntilContext) {
	if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") {
		return;
	}
	const waitUntil = c.executionCtx?.waitUntil;
	return typeof waitUntil === "function"
		? (promise: Promise<unknown>) => waitUntil.call(c.executionCtx, promise)
		: undefined;
}

function withEventsCacheHeaders(response: Response, pending = false): Response {
	response.headers.set(
		"Cache-Control",
		pending ? PENDING_EVENTS_CACHE_CONTROL : PUBLIC_EVENTS_CACHE_CONTROL
	);
	return response;
}

export const eventsRoutes = new Hono()
	.get("/", async (c) => {
		const topic = c.req.query("topic");
		const limit = parsePositiveInteger(c.req.query("limit"));
		const offset = parseOffset(c.req.query("offset"));
		const lang = normalizeTranslationLanguage(c.req.query("lang"));
		const translationMode = parseTranslationMode(c.req.query("translations"));
		const view = parseView(c.req.query("view"));
		try {
			const options = {
				lang,
				limit,
				offset,
				translationMode,
				waitUntil: getWaitUntil(c),
			};
			const memoryKey = JSON.stringify([topic, limit, offset, lang, view]);
			const remembered = feedMemory.get(memoryKey);
			if (remembered && remembered.expires > Date.now()) {
				return withEventsCacheHeaders(
					c.json(remembered.feed),
					remembered.feed.translationsPending
				);
			}
			const feed =
				view === "stories"
					? await getEventStories(topic, options)
					: await getEventFeed(topic, { ...options, view });
			rememberFeed(memoryKey, feed);
			return withEventsCacheHeaders(c.json(feed), feed.translationsPending);
		} catch (error) {
			if (error instanceof TopicNotFoundError) {
				return c.json({ error: "topic_not_found", topic }, 404);
			}
			if (error instanceof TrendsSnapshotsUnavailableError) {
				return c.json({ error: "snapshots_unavailable" }, 503, {
					"Retry-After": "1",
				});
			}
			if (error instanceof EventEmbeddingNotConfiguredError) {
				return c.json({ error: "embedding_not_configured" }, 503);
			}
			throw error;
		}
	})
	.get("/:eventId", async (c) => {
		const eventId = c.req.param("eventId");
		const topic = c.req.query("topic");
		const lang = normalizeTranslationLanguage(c.req.query("lang"));
		const translationMode = parseTranslationMode(c.req.query("translations"));
		try {
			const event = await getEventDetail(eventId, topic, {
				lang,
				translationMode,
				waitUntil: getWaitUntil(c),
			});
			if (!event) {
				return c.json({ error: "event_not_found", eventId, topic }, 404);
			}
			return withEventsCacheHeaders(c.json(event));
		} catch (error) {
			if (error instanceof TopicNotFoundError) {
				return c.json({ error: "topic_not_found", topic }, 404);
			}
			if (error instanceof TrendsSnapshotsUnavailableError) {
				return c.json({ error: "snapshots_unavailable" }, 503, {
					"Retry-After": "1",
				});
			}
			if (error instanceof EventEmbeddingNotConfiguredError) {
				return c.json({ error: "embedding_not_configured" }, 503);
			}
			throw error;
		}
	});
