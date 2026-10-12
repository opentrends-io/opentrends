import type {
	ArchivedDigestEntry,
	DigestJsonData,
} from "@/components/trends/types";

// What the landing page shows from the live API: the first lines of today's
// featured brief and how many sources each topic follows. Every field may be
// missing; the page reads fine without any of them.

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

export const LANDING_DIGEST_LINES = 5;
const MAX_CITATION_HOSTS = 3;
const WWW_PREFIX_RE = /^www\./;

export interface LandingSource {
	topics?: readonly string[];
}

export interface LandingData {
	digest: ArchivedDigestEntry[] | null;
	sourceCount: number | null;
	topicSourceCounts: Partial<Record<LandingTopicId, number>>;
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

export function digestPreview(
	digest: DigestJsonData | null | undefined
): ArchivedDigestEntry[] | null {
	if (!(Array.isArray(digest?.entries) && digest.entries.length > 0)) {
		return null;
	}
	return digest.entries.slice(0, LANDING_DIGEST_LINES);
}

// The sites a line was drawn from, shown under it as proof of where it
// came from.
export function citationHosts(entry: ArchivedDigestEntry): string[] {
	const hosts: string[] = [];
	for (const citation of entry.citations ?? []) {
		let host: string;
		try {
			host = new URL(citation.url).hostname.replace(WWW_PREFIX_RE, "");
		} catch {
			continue;
		}
		if (!hosts.includes(host)) {
			hosts.push(host);
		}
		if (hosts.length === MAX_CITATION_HOSTS) {
			break;
		}
	}
	return hosts;
}
