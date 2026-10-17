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

export interface LandingSource {
	homeUrl?: string;
	name?: string;
	sourceId?: string;
	topics?: readonly string[];
}

export interface WallSource {
	homeUrl: string;
	id: string;
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
	url: string | null;
}

export interface LandingData {
	digest: ArchivedDigestEntry[] | null;
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

function asWallSource(source: LandingSource): WallSource | null {
	if (!(source.homeUrl && source.name && source.sourceId)) {
		return null;
	}
	return {
		homeUrl: source.homeUrl,
		id: source.sourceId,
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
): ArchivedDigestEntry[] | null {
	if (!(Array.isArray(digest?.entries) && digest.entries.length > 0)) {
		return null;
	}
	return digest.entries.slice(0, LANDING_DIGEST_LINES);
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

// The stories the most outlets are reporting right now: distinct sites
// per event, most sites first.
export function crossCheckedStories(
	events: readonly LandingEventInput[] | undefined,
	limit = CROSS_CHECKED_COUNT
): CrossCheckedStory[] {
	const stories: CrossCheckedStory[] = [];
	for (const event of events ?? []) {
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
				name: source.title,
				topics: [],
			});
		}
		if (outlets.length < 2) {
			continue;
		}
		stories.push({
			id: event.eventId,
			outlets,
			summary: event.summary ?? "",
			title: event.title,
			topic: event.topicIds?.find(isContentTopic) ?? null,
			url: event.primarySource?.url ?? null,
		});
	}
	return stories
		.sort((a, b) => b.outlets.length - a.outlets.length)
		.slice(0, limit);
}
