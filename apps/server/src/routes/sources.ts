import { Hono } from "hono";
import { getSourcePreset, sourceNotes } from "../trends/config/sources";
import { topicPresets } from "../trends/config/topics";
import {
	getSourcesConfigStatus,
	getSourcesStatusWithCacheInfo,
	type SourcesStatusCacheStatus,
} from "../trends/services/get-sources-status";
import { getTrendSourceCard } from "../trends/services/get-trends-page";
import { normalizeTranslationLanguage } from "../trends/services/translate-news-items";
import type { SourceId, TopicId } from "../trends/types";
import { shouldReturnConfigStatus } from "./sources-mode";

function topicsForSource(
	sourceId: string
): Array<{ id: TopicId; title: string }> {
	const hits: Array<{ id: TopicId; title: string }> = [];
	for (const [id, topic] of Object.entries(topicPresets) as [
		TopicId,
		(typeof topicPresets)[TopicId],
	][]) {
		if (
			topic.sections.some((section) =>
				(section.sourceIds as readonly string[]).includes(sourceId)
			)
		) {
			hits.push({ id, title: topic.title });
		}
	}
	return hits;
}

const SOURCES_STATUS_CACHE_KEY = "https://opentrends.internal/api/sources";

function getDefaultEdgeCache(): Cache | null {
	const maybeCaches = (
		globalThis as {
			caches?: CacheStorage & { default?: Cache };
		}
	).caches;
	return maybeCaches?.default ?? null;
}

export const sourcesRoutes = new Hono()
	// One source: what it is, which topics carry it, and its latest items,
	// for the source's own page.
	.get("/:id", async (c) => {
		const sourceId = c.req.param("id");
		const preset = getSourcePreset(sourceId as SourceId);
		if (!preset) {
			return c.json({ error: "source_not_found", sourceId }, 404);
		}
		const lang = normalizeTranslationLanguage(c.req.query("lang"));
		const topics = topicsForSource(sourceId);
		const topicId = topics[0]?.id;
		const card = topicId
			? await getTrendSourceCard(topicId, sourceId, lang).catch(() => null)
			: null;
		return c.json(
			{
				card,
				homeUrl: "homeUrl" in preset ? preset.homeUrl : undefined,
				lang,
				name: preset.name,
				note: sourceNotes[sourceId as keyof typeof sourceNotes],
				provider: preset.provider,
				refresh: preset.refresh,
				sourceId,
				topics,
			},
			200,
			{ "Cache-Control": "public, max-age=300, s-maxage=600" }
		);
	})
	.get("/", async (c) => {
		if (shouldReturnConfigStatus(c.req.query("mode"))) {
			return withSourcesCacheHeaders(
				c.json(getSourcesConfigStatus()),
				"config"
			);
		}

		const cached = await readSourcesStatusFromEdgeCache();
		if (cached) {
			return withSourcesCacheHeaders(cached, "edge");
		}

		const { cacheStatus, status } = await getSourcesStatusWithCacheInfo();
		const response = withSourcesCacheHeaders(c.json(status), cacheStatus);
		if (getDefaultEdgeCache()) {
			c.executionCtx.waitUntil(writeSourcesStatusToEdgeCache(response.clone()));
		}
		return response;
	});

async function readSourcesStatusFromEdgeCache(): Promise<Response | null> {
	const edgeCache = getDefaultEdgeCache();
	if (!edgeCache) {
		return null;
	}
	try {
		return (await edgeCache.match(SOURCES_STATUS_CACHE_KEY)) ?? null;
	} catch (error) {
		console.warn("[sources] failed to read edge cache", error);
		return null;
	}
}

async function writeSourcesStatusToEdgeCache(
	response: Response
): Promise<void> {
	const edgeCache = getDefaultEdgeCache();
	if (!edgeCache) {
		return;
	}
	try {
		await edgeCache.put(SOURCES_STATUS_CACHE_KEY, response);
	} catch (error) {
		console.warn("[sources] failed to write edge cache", error);
	}
}

export function withSourcesCacheHeaders(
	response: Response,
	cacheStatus: SourcesStatusCacheStatus
): Response {
	const responseWithMutableHeaders = new Response(response.body, response);
	responseWithMutableHeaders.headers.set(
		"Cache-Control",
		"public, max-age=60, s-maxage=300, stale-while-revalidate=600"
	);
	responseWithMutableHeaders.headers.set("X-Sources-Cache", cacheStatus);
	const exposedHeaders =
		responseWithMutableHeaders.headers
			.get("Access-Control-Expose-Headers")
			?.split(",")
			.map((header) => header.trim())
			.filter(
				(header) =>
					header.length > 0 && header.toLowerCase() !== "x-sources-cache"
			) ?? [];
	responseWithMutableHeaders.headers.set(
		"Access-Control-Expose-Headers",
		[...exposedHeaders, "X-Sources-Cache"].join(", ")
	);
	return responseWithMutableHeaders;
}
