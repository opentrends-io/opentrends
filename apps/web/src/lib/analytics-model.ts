const TOPICS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
	"mine",
];
const LOCALES = [
	"en",
	"zh",
	"zh-Hant",
	"ru",
	"fr-FR",
	"es-ES",
	"de-DE",
	"pt-BR",
];
const SIMPLE_PAGES = [
	"privacy",
	"sources",
	"agents",
	"history",
	"briefings",
	"login",
	"dashboard",
	"calendar",
];

// Only enumerated values can cross the collection boundary. Never accept raw
// titles, URLs, IDs, errors, search terms, preference lists or arbitrary labels.
export const EVENT_VALUES = {
	page_view: [],
	landing_click: ["hero", "brief", "events", "sources", "closing", "returning"],
	navigation_click: ["header", "footer"],
	article_open: ["source", "flow", "event", "citation"],
	summary_expand: [],
	summary_collapse: [],
	summary_retry: [],
	summary_window: ["today", "week", "month"],
	summary_result: ["ready", "empty", "pending", "failed", "stale"],
	summary_share_open: [],
	share_result: ["image_copied", "image_download", "failed"],
	event_open: [],
	event_briefs: ["expanded", "collapsed"],
	event_load_more: [],
	source_follow: ["follow", "unfollow"],
	source_action: [
		"pin",
		"unpin",
		"hide",
		"show",
		"show_all",
		"reorder",
		"expand",
		"collapse",
		"manage",
	],
	layout_change: ["sourceGrid", "sourceSections", "flow"],
	display_change: [
		"showCover",
		"showDescription",
		"showHotValue",
		"showOriginalTitle",
		"showRank",
		"showRelativeTime",
		"summaryCollapsed",
	],
	language_change: [
		"en",
		"zh",
		"zh-Hant",
		"ru",
		"fr-FR",
		"es-ES",
		"de-DE",
		"pt-BR",
	],
	theme_change: ["light", "dark", "system"],
	search_open: [],
	search_result: ["source", "headline"],
	search_completed: ["zero", "1_5", "6_20", "21_plus"],
	login_open: [],
	login_start: ["google", "github"],
	login: ["google", "github"],
	login_failed: ["google", "github"],
	logout: [],
	view_change: ["sources", "events"],
} as const;

export type AnalyticsEvent = keyof typeof EVENT_VALUES;
export type AnalyticsValue<E extends AnalyticsEvent> =
	(typeof EVENT_VALUES)[E][number];

export function sanitizeEvent(
	name: string,
	params: Record<string, unknown>
): { action?: string } | null {
	if (!Object.hasOwn(EVENT_VALUES, name)) {
		return null;
	}
	const values: readonly string[] = EVENT_VALUES[name as AnalyticsEvent];
	if (values.length === 0) {
		return {};
	}
	if (typeof params.value === "string" && values.includes(params.value)) {
		return { action: params.value };
	}
	return null;
}

function safeTopic(value: string | null | undefined) {
	return TOPICS.includes(value ?? "") ? (value ?? "none") : "none";
}

function eventRoute(subpage: string | undefined, queryTopic: string | null) {
	const detail = Boolean(subpage && subpage !== "flow");
	let route = "events";
	if (subpage) {
		route += detail ? "/detail" : "/flow";
	}
	return {
		route,
		page_group: detail ? "event_detail" : "events",
		topic: safeTopic(queryTopic),
	};
}

function classifyRoute(parts: string[], queryTopic: string | null) {
	const [section, subpage, day] = parts;
	if (!section) {
		return { route: "", page_group: "landing", topic: "none" };
	}
	if (section === "trends" || section === "feed") {
		const topic = safeTopic(section === "feed" ? queryTopic : subpage);
		if (day) {
			return {
				route: `${section}/${topic}/${day === "archive" ? "archive" : "day"}`,
				page_group: "archive",
				topic,
			};
		}
		return { route: `${section}/${topic}`, page_group: section, topic };
	}
	if (section === "events") {
		return eventRoute(subpage, queryTopic);
	}

	if (SIMPLE_PAGES.includes(section)) {
		return {
			route: section === "sources" && subpage ? "sources/detail" : section,
			page_group: section,
			topic: "none",
		};
	}
	return { route: "other", page_group: "other", topic: "none" };
}

export function analyticsPage(href: string) {
	const url = new URL(href);
	const parts = url.pathname.split("/").filter(Boolean);
	const language = LOCALES.includes(parts[0] ?? "")
		? (parts.shift() ?? "en")
		: "en";
	const { route, page_group, topic } = classifyRoute(
		parts,
		url.searchParams.get("topic")
	);
	return {
		page_path: `/${language}${route ? `/${route}` : ""}`,
		page_group,
		topic,
		language,
	};
}

export function searchResultBucket(count: number) {
	if (count === 0) {
		return "zero";
	}
	if (count <= 5) {
		return "1_5";
	}
	if (count <= 20) {
		return "6_20";
	}
	return "21_plus";
}

export function summaryOutcome(
	status: string,
	hasText: boolean,
	hasError: boolean
) {
	if (hasError) {
		return hasText ? "stale" : "failed";
	}
	if (status === "done" && hasText) {
		return "ready";
	}
	if (status === "empty" || status === "pending") {
		return status;
	}
	return null;
}

// Keep acquisition useful without exporting an arbitrary referring URL.
export function referralSource(referrer: string) {
	try {
		const host = new URL(referrer).hostname;
		if (["google.com", "www.google.com"].includes(host)) {
			return "google";
		}
		if (["bing.com", "www.bing.com", "cn.bing.com"].includes(host)) {
			return "bing";
		}
		if (["x.com", "twitter.com", "t.co"].includes(host)) {
			return "x";
		}
		if (host === "github.com") {
			return "github";
		}
		if (["opentrends.io", "www.opentrends.io"].includes(host)) {
			return "internal";
		}
		return "other";
	} catch {
		return "direct";
	}
}

export function trackingAllowed(signals: {
	dnt?: string | null;
	gpc?: boolean;
	choice?: string | null;
	storageUnavailable?: boolean;
}) {
	if (signals.dnt === "1" || signals.gpc || signals.storageUnavailable) {
		return false;
	}
	try {
		const choice = JSON.parse(signals.choice ?? "null");
		return (
			choice !== "denied" &&
			choice?.value !== "denied" &&
			choice?.status !== "denied"
		);
	} catch {
		return false;
	}
}
