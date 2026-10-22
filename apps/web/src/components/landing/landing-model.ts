// What the landing page shows from the live API: today's featured brief,
// the stories most outlets are reporting, and the sources by topic. Every
// field may be missing; the page reads fine without any of them.

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

export const SOURCE_WALL_TILES = 48;
export const SOURCES_PER_TOPIC = 8;

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

export interface TopicSources {
	count: number;
	sources: WallSource[];
	topic: ContentTopicId;
}

export interface LandingData {
	sourceCount: number | null;
	topics: TopicSources[];
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

// Each topic's first few sources, in the order the API lists them, plus
// how many it follows in all.
export function sourcesByTopic(
	sources: readonly LandingSource[] | undefined,
	perTopic = SOURCES_PER_TOPIC
): TopicSources[] {
	const groups: TopicSources[] = [];
	for (const topic of LANDING_TOPIC_IDS) {
		if (!isContentTopic(topic)) {
			continue;
		}
		const inTopic = (sources ?? []).filter((source) =>
			source.topics?.includes(topic)
		);
		if (inTopic.length === 0) {
			continue;
		}
		const picked: WallSource[] = [];
		for (const source of inTopic) {
			const tile = asWallSource(source);
			if (tile) {
				picked.push(tile);
			}
			if (picked.length === perTopic) {
				break;
			}
		}
		groups.push({ count: inTopic.length, sources: picked, topic });
	}
	return groups;
}
