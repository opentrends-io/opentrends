// What the landing page shows from the live API: the sources, today's
// featured brief and one event several outlets reported. Every field may
// be missing; the page then falls back to its fixed examples.

export const LANDING_TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

export type LandingTopicId = (typeof LANDING_TOPIC_IDS)[number];
export type ContentTopicId = Exclude<LandingTopicId, "featured">;

const WWW_PREFIX_RE = /^www\./;

export const SOURCE_WALL_TILES = 32;
// An event is worth showing live when this many different sites reported it.
const LIVE_EVENT_MIN_SITES = 3;

// What kind of place a source is, as the API reports it (`role`); older
// API builds only had the refresh class, which gives a coarser answer.
export type SourceKind =
	| "author"
	| "community"
	| "hot"
	| "journal"
	| "official"
	| "press";

export const SOURCE_KIND_ORDER: readonly SourceKind[] = [
	"official",
	"press",
	"author",
	"journal",
	"community",
	"hot",
];

export interface LandingSource {
	homeUrl?: string;
	name?: string;
	refresh?: string;
	role?: string;
	sourceId?: string;
	topics?: readonly string[];
}

export interface WallSource {
	homeUrl: string;
	id: string;
	kind: SourceKind | null;
	name: string;
	topics: ContentTopicId[];
}

export interface LandingDigestEntry {
	citations?: readonly { n: number; topic?: string; url: string }[];
	n: number;
	reason?: string;
	takeaway: string;
}

export interface LandingDigest {
	degraded?: boolean;
	entries: LandingDigestEntry[];
	generatedAt?: number;
}

export interface LandingEventSource {
	homeUrl?: string;
	// Filled from the source list, which the event feed does not carry.
	kind?: SourceKind | null;
	name?: string;
	sourceId: string;
	title: string;
}

// One event as the API lists it, kept only with what the page shows.
export interface LandingEvent {
	eventId: string;
	firstSeenAt: string;
	lastSeenAt: string;
	original?: { title: string };
	primarySource?: { sourceId: string; title: string };
	sources: LandingEventSource[];
	summary?: string;
	title: string;
	topicId: string;
}

export interface LandingData {
	digest: LandingDigest | null;
	event: LandingEvent | null;
	sourceCount: number | null;
	wall: WallSource[];
}

function isLandingTopic(topic: string): topic is LandingTopicId {
	return (LANDING_TOPIC_IDS as readonly string[]).includes(topic);
}

function isContentTopic(topic: string): topic is ContentTopicId {
	return isLandingTopic(topic) && topic !== "featured";
}

function hostOf(url: string | undefined): string | null {
	if (!url) {
		return null;
	}
	try {
		return new URL(url).hostname.replace(WWW_PREFIX_RE, "");
	} catch {
		return null;
	}
}

function isSourceKind(value: string | undefined): value is SourceKind {
	return (SOURCE_KIND_ORDER as readonly string[]).includes(value ?? "");
}

export function sourceKind(source: {
	refresh?: string;
	role?: string;
}): SourceKind | null {
	if (isSourceKind(source.role)) {
		return source.role;
	}
	switch (source.refresh) {
		case "community":
			return "community";
		case "hot":
			return "hot";
		case "slow":
			return "journal";
		case "rss":
		case "daily":
			return "press";
		default:
			return null;
	}
}

function asWallSource(source: LandingSource): WallSource | null {
	if (!(source.homeUrl && source.name && source.sourceId)) {
		return null;
	}
	return {
		homeUrl: source.homeUrl,
		id: source.sourceId,
		kind: sourceKind(source),
		name: source.name,
		topics: (source.topics ?? []).filter(isContentTopic),
	};
}

// One tile per site: "The Verge" and "The Verge · AI" share a logo, so
// only the first is kept, carrying every topic the site appears in.
export function wallSources(
	sources: readonly LandingSource[] | undefined,
	limit = Number.POSITIVE_INFINITY
): WallSource[] {
	const hosts = new Map<string, string>();
	const wall: WallSource[] = [];
	for (const source of sources ?? []) {
		const tile = asWallSource(source);
		const host = hostOf(source.homeUrl);
		if (!(tile && host)) {
			continue;
		}
		const seen = wall.find((entry) => hosts.get(entry.id) === host);
		if (seen) {
			for (const topic of tile.topics) {
				if (!seen.topics.includes(topic)) {
					seen.topics.push(topic);
				}
			}
			continue;
		}
		if (wall.length === limit) {
			continue;
		}
		hosts.set(tile.id, host);
		wall.push(tile);
	}
	// Own channels first, hot lists last, so the first screen shows the
	// first-hand sources and the rankings sit at the end.
	return wall
		.map((tile, index) => ({ index, tile }))
		.sort(
			(a, b) =>
				kindRank(a.tile.kind) - kindRank(b.tile.kind) || a.index - b.index
		)
		.map((entry) => entry.tile);
}

function kindRank(kind: SourceKind | null): number {
	return kind ? SOURCE_KIND_ORDER.indexOf(kind) : SOURCE_KIND_ORDER.length;
}

// The first event that several different sites reported, with a title
// and at least that many sources to show; none means the fixed example.
export function pickLandingEvent(
	events: readonly LandingEvent[] | undefined,
	minSites = LIVE_EVENT_MIN_SITES
): LandingEvent | null {
	for (const event of events ?? []) {
		const sites = new Set(
			event.sources.map((source) => hostOf(source.homeUrl) ?? source.sourceId)
		);
		if (
			event.title &&
			event.sources.length >= minSites &&
			sites.size >= minSites
		) {
			return event;
		}
	}
	return null;
}

// The outlets of an event, one per site, so the same newsroom's sections
// count once.
export function eventOutlets(event: LandingEvent): LandingEventSource[] {
	const seen = new Set<string>();
	const outlets: LandingEventSource[] = [];
	for (const source of event.sources) {
		const key = hostOf(source.homeUrl) ?? source.sourceId;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		outlets.push(source);
	}
	return outlets;
}

// Whole hours between the first and the last report, at least one.
export function eventSpanHours(event: LandingEvent): number {
	const span = Date.parse(event.lastSeenAt) - Date.parse(event.firstSeenAt);
	return Number.isFinite(span) ? Math.max(1, Math.ceil(span / 3_600_000)) : 1;
}

// A brief is live when it has lines and the model wrote them.
export function liveDigest(digest: LandingDigest | null): LandingDigest | null {
	return digest && digest.entries.length > 0 && !digest.degraded
		? digest
		: null;
}
