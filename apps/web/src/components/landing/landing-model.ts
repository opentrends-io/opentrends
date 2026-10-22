import type {
	ArchivedDigestEntry,
	DigestJsonData,
} from "@/components/trends/types";

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

export const LANDING_DIGEST_LINES = 5;
export const CROSS_CHECKED_COUNT = 3;
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

export interface EventSource {
	homeUrl?: string;
	sourceId: string;
	title: string;
}

export interface LandingEventInput {
	eventId: string;
	lastSeenAt?: string;
	primarySource?: { url?: string };
	sources?: EventSource[];
	summary?: string;
	title: string;
	topicIds?: string[];
}

export interface CrossCheckedStory {
	id: string;
	outlets: WallSource[];
	summary: string;
	title: string;
	topic: ContentTopicId | null;
	// When the story was last seen in a source, as a timestamp; null when
	// the API did not say.
	updatedAt: number | null;
	url: string | null;
}

export interface LandingBrief {
	degraded: boolean;
	generatedAt: number | null;
	lines: ArchivedDigestEntry[];
}

export interface LandingData {
	digest: LandingBrief | null;
	sourceCount: number | null;
	stories: CrossCheckedStory[];
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
	return wall;
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

export function digestPreview(
	digest: DigestJsonData | null | undefined
): LandingBrief | null {
	if (!(Array.isArray(digest?.entries) && digest.entries.length > 0)) {
		return null;
	}
	return {
		degraded: digest.degraded === true,
		generatedAt:
			typeof digest.generatedAt === "number" ? digest.generatedAt : null,
		lines: digest.entries.slice(0, LANDING_DIGEST_LINES),
	};
}

// The topic a featured line came from, for its tag: the first cited topic
// that is not the featured mix itself.
export function lineTopic(entry: ArchivedDigestEntry): ContentTopicId | null {
	for (const citation of entry.citations ?? []) {
		const topic = citation.topic;
		if (topic && isContentTopic(topic)) {
			return topic;
		}
	}
	return null;
}

// One outlet per site that carried the event.
function eventOutlets(
	event: LandingEventInput,
	kinds: ReadonlyMap<string | undefined, SourceKind | null>
): WallSource[] {
	const hosts = new Set<string>();
	const outlets: WallSource[] = [];
	for (const source of event.sources ?? []) {
		const host = hostOf(source.homeUrl);
		if (!(host && source.homeUrl) || hosts.has(host)) {
			continue;
		}
		hosts.add(host);
		outlets.push({
			homeUrl: source.homeUrl,
			id: source.sourceId,
			kind: kinds.get(source.sourceId) ?? null,
			name: source.title,
			topics: [],
		});
	}
	return outlets;
}

function kindRank(kind: SourceKind | null): number {
	const index = kind ? SOURCE_KIND_ORDER.indexOf(kind) : -1;
	return index === -1 ? SOURCE_KIND_ORDER.length : index;
}

// The stories the most outlets are reporting right now: distinct sites
// per event, most sites first.
export function crossCheckedStories(
	events: readonly LandingEventInput[] | undefined,
	sources: readonly LandingSource[] | undefined,
	limit = CROSS_CHECKED_COUNT
): CrossCheckedStory[] {
	const kinds = new Map(
		(sources ?? []).map((source) => [source.sourceId, sourceKind(source)])
	);
	const stories: CrossCheckedStory[] = [];
	for (const event of events ?? []) {
		const outlets = eventOutlets(event, kinds);
		if (outlets.length < 2) {
			continue;
		}
		// Official channels first, then the press, so a reader sees at a
		// glance whether the story started with the organisation itself.
		outlets.sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
		const updatedAt = event.lastSeenAt
			? Date.parse(event.lastSeenAt)
			: Number.NaN;
		stories.push({
			id: event.eventId,
			outlets,
			summary: event.summary ?? "",
			title: event.title,
			topic: event.topicIds?.find(isContentTopic) ?? null,
			updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
			url: event.primarySource?.url ?? null,
		});
	}
	return stories
		.sort((a, b) => b.outlets.length - a.outlets.length)
		.slice(0, limit);
}
