import type {
	ArchivedDigestEntry,
	DigestJsonData,
} from "@/components/trends/types";

// What the landing page shows from the live API: today's featured brief,
// how many sources each topic follows, and the sources themselves for the
// logo wall. Every field may be missing; the page reads fine without any
// of them.

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

export const LANDING_DIGEST_LINES = 10;
export const SOURCE_WALL_LIMIT = 72;

export interface LandingSource {
	homeUrl?: string;
	name?: string;
	topics?: readonly string[];
}

export interface WallSource {
	homeUrl: string;
	name: string;
}

export interface LandingData {
	digest: ArchivedDigestEntry[] | null;
	sourceCount: number | null;
	topicSourceCounts: Partial<Record<LandingTopicId, number>>;
	wall: WallSource[];
}

function isLandingTopic(topic: string): topic is LandingTopicId {
	return (LANDING_TOPIC_IDS as readonly string[]).includes(topic);
}

export function countSources(
	sources: readonly LandingSource[] | undefined
): Pick<LandingData, "sourceCount" | "topicSourceCounts"> {
	if (!sources?.length) {
		return { sourceCount: null, topicSourceCounts: {} };
	}
	const topicSourceCounts: Partial<Record<LandingTopicId, number>> = {};
	for (const source of sources) {
		for (const topic of source.topics ?? []) {
			if (isLandingTopic(topic)) {
				topicSourceCounts[topic] = (topicSourceCounts[topic] ?? 0) + 1;
			}
		}
	}
	return { sourceCount: sources.length, topicSourceCounts };
}

function hostOf(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

// One tile per site: "The Verge" and "The Verge · AI" share a logo, so
// only the first is kept.
export function wallSources(
	sources: readonly LandingSource[] | undefined,
	limit = SOURCE_WALL_LIMIT
): WallSource[] {
	const hosts = new Set<string>();
	const wall: WallSource[] = [];
	for (const source of sources ?? []) {
		if (!(source.homeUrl && source.name)) {
			continue;
		}
		const host = hostOf(source.homeUrl);
		if (!host || hosts.has(host)) {
			continue;
		}
		hosts.add(host);
		wall.push({ homeUrl: source.homeUrl, name: source.name });
		if (wall.length === limit) {
			break;
		}
	}
	return wall;
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
export function lineTopic(
	entry: ArchivedDigestEntry
): Exclude<LandingTopicId, "featured"> | null {
	for (const citation of entry.citations ?? []) {
		const topic = citation.topic;
		if (topic && isLandingTopic(topic) && topic !== "featured") {
			return topic;
		}
	}
	return null;
}
