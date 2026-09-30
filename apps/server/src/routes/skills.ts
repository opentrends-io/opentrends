import { Hono } from "hono";

const OPENTRENDS_SKILL_MANIFEST = {
	name: "opentrends",
	version: "2026.09.30.2",
	updatedAt: "2026-09-30T07:40:00Z",
	baseUrl: "https://api.opentrends.io",
	installUrl: "https://opentrends.io/agents",
	skillUrl: "https://opentrends.io/skills/opentrends/SKILL.md",
	llmsTxtUrl: "https://opentrends.io/llms.txt",
	topics: [
		"featured",
		"ai",
		"programming",
		"hardware",
		"biotech",
		"embodied",
		"cn",
	],
	endpoints: {
		search: "/api/trends/search",
		article: "/api/trends/:topic/sources/:sourceId/article",
		topic: "/api/trends/:topic",
		source: "/api/trends/:topic/sources/:sourceId",
		summary: "/api/trends/:topic/summary",
		events: "/api/trends/:topic/events",
		sources: "/api/sources",
		itemsFeed: "/api/trends/:topic/feed.xml",
		digestFeed: "/api/trends/:topic/summary.xml",
	},
	mcp: {
		url: "https://api.opentrends.io/mcp",
		transport: "streamable-http",
		tools: ["get_digest", "get_topic", "get_source", "get_article", "search"],
	},
	query: {
		search: {
			parameters: ["query", "topic", "since", "until", "limit", "cursor"],
			dateRange:
				"ISO timestamps with timezone or UTC dates; since inclusive, until exclusive; max 31 days",
			coverage:
				"Retained original titles/descriptions; publication date, falling back to labeled fetch date",
			pagination: "Repeat with nextCursor and the same query/topic",
		},
		article: {
			parameters: ["itemId", "cursor"],
			pagination:
				"12,000 UTF-16 units per page; repeat with nextCursor while hasMore; HTTP 409 means restart",
			extractionLimit:
				"200,000 UTF-16 units and 3 MiB HTML; contentTruncated reports extraction limits",
		},
		lang: ["zh", "en", "zh-Hant", "ru", "fr-FR", "es-ES", "de-DE", "pt-BR"],
		items: "preview | 1..defaultMax",
		translations: ["background"],
		summary: {
			format: ["json", "markdown"],
			window: ["today", "week", "month"],
			pending: "HTTP 202 while generating; retry after Retry-After seconds",
		},
	},
} as const;

const SKILL_MANIFEST_CACHE_CONTROL =
	"public, max-age=600, s-maxage=1800, stale-while-revalidate=3600";

export const skillsRoutes = new Hono().get("/opentrends", (c) => {
	const response = c.json(OPENTRENDS_SKILL_MANIFEST);
	response.headers.set("Cache-Control", SKILL_MANIFEST_CACHE_CONTROL);
	return response;
});
