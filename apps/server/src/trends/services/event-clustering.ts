import { isSameEventSignal, keywordOverlapCount } from "./event-merge-rules";
import { sourceFamilyId } from "./event-source-family";

export const EVENT_TIME_WINDOW_MS = 72 * 60 * 60_000;
const EXACT_MATCH_CONFIDENCE = 100;
const MAX_SIMILARITY_CONFIDENCE = 99;
const LEADING_WWW_RE = /^www\./;
const TRAILING_SLASH_RE = /\/$/;
const TRACKING_PARAMETERS = new Set(["fbclid", "gclid", "ref"]);

export interface ClusterCandidate {
	contentHash: string;
	embedding: readonly number[] | null;
	keywords: ReadonlySet<string>;
	sourceId: string;
	/** Publication time (or first fetch) in epoch milliseconds. */
	time: number;
	url: string;
}

export interface CandidateCluster<T extends ClusterCandidate> {
	/** The earliest report; later reports are compared with it. */
	anchor: T;
	firstSeenAt: number;
	items: Array<{ confidence: number; item: T }>;
	lastSeenAt: number;
}

interface ClusterState<T extends ClusterCandidate> extends CandidateCluster<T> {
	contentHashes: Set<string>;
	families: Set<string>;
	sourceIds: Set<string>;
	urls: Set<string>;
}

export function normalizeUrl(value: string): string {
	try {
		const url = new URL(value);
		url.hash = "";
		for (const key of [...url.searchParams.keys()]) {
			if (key.startsWith("utm_") || TRACKING_PARAMETERS.has(key)) {
				url.searchParams.delete(key);
			}
		}
		url.searchParams.sort();
		// The query stays: many sites identify articles by it (?sid=, ?p=).
		const query = url.searchParams.toString();
		const path =
			`${url.hostname.replace(LEADING_WWW_RE, "")}${url.pathname}`.replace(
				TRAILING_SLASH_RE,
				""
			);
		return query ? `${path}?${query}` : path;
	} catch {
		return value.trim().toLowerCase();
	}
}

export function cosineSimilarity(
	a: readonly number[],
	b: readonly number[]
): number {
	const length = Math.min(a.length, b.length);
	let dot = 0;
	let aNorm = 0;
	let bNorm = 0;
	for (let i = 0; i < length; i += 1) {
		const av = a[i] ?? 0;
		const bv = b[i] ?? 0;
		dot += av * bv;
		aNorm += av * av;
		bNorm += bv * bv;
	}
	return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm) || 1);
}

function isInTimeWindow<T extends ClusterCandidate>(
	item: T,
	cluster: ClusterState<T>
): boolean {
	return (
		item.time >= cluster.firstSeenAt - EVENT_TIME_WINDOW_MS &&
		item.time <= cluster.lastSeenAt + EVENT_TIME_WINDOW_MS
	);
}

function isExactDuplicate<T extends ClusterCandidate>(
	item: T,
	url: string,
	cluster: ClusterState<T>
): boolean {
	return cluster.urls.has(url) || cluster.contentHashes.has(item.contentHash);
}

// Similarity to the cluster's first report, or null when the two are not the
// same event. Comparing with a fixed report (not a running average of all
// members) keeps a cluster from drifting towards a neighbouring story.
function similarityToAnchor<T extends ClusterCandidate>(
	item: T,
	cluster: ClusterState<T>
): number | null {
	const anchor = cluster.anchor;
	if (!(item.embedding && anchor.embedding)) {
		return null;
	}
	const keywordMatches = keywordOverlapCount(item.keywords, anchor.keywords);
	if (keywordMatches === 0) {
		return null;
	}
	const similarity = cosineSimilarity(item.embedding, anchor.embedding);
	return isSameEventSignal({ keywordMatches, similarity }) ? similarity : null;
}

function findCluster<T extends ClusterCandidate>(
	item: T,
	clusters: ClusterState<T>[]
): { cluster: ClusterState<T>; confidence: number } | null {
	const url = normalizeUrl(item.url);
	const family = sourceFamilyId(item.sourceId);
	let best: { cluster: ClusterState<T>; similarity: number } | null = null;
	for (const cluster of clusters) {
		// Two items of one feed are two articles, whatever their links say.
		if (cluster.sourceIds.has(item.sourceId)) {
			continue;
		}
		if (isExactDuplicate(item, url, cluster)) {
			return { cluster, confidence: EXACT_MATCH_CONFIDENCE };
		}
		// One report per publisher: a second article from the same site is a
		// different story unless it is the same URL.
		if (cluster.families.has(family) || !isInTimeWindow(item, cluster)) {
			continue;
		}
		const similarity = similarityToAnchor(item, cluster);
		if (similarity !== null && (!best || similarity > best.similarity)) {
			best = { cluster, similarity };
		}
	}
	if (!best) {
		return null;
	}
	return {
		cluster: best.cluster,
		confidence: Math.round(
			Math.min(MAX_SIMILARITY_CONFIDENCE, best.similarity * 100)
		),
	};
}

function addToCluster<T extends ClusterCandidate>(
	cluster: ClusterState<T>,
	item: T,
	confidence: number
): void {
	cluster.items.push({ confidence, item });
	cluster.urls.add(normalizeUrl(item.url));
	cluster.contentHashes.add(item.contentHash);
	cluster.families.add(sourceFamilyId(item.sourceId));
	cluster.sourceIds.add(item.sourceId);
	cluster.firstSeenAt = Math.min(cluster.firstSeenAt, item.time);
	cluster.lastSeenAt = Math.max(cluster.lastSeenAt, item.time);
}

// Groups reports of one story from different publishers. Reports are taken
// oldest first, so every cluster is anchored on the first report of its story
// and keeps that anchor (and its event id) while later reports join.
export function clusterEventCandidates<T extends ClusterCandidate>(
	items: readonly T[]
): CandidateCluster<T>[] {
	const clusters: ClusterState<T>[] = [];
	const ordered = [...items].sort((a, b) => a.time - b.time);
	for (const item of ordered) {
		const found = findCluster(item, clusters);
		if (found) {
			addToCluster(found.cluster, item, found.confidence);
			continue;
		}
		clusters.push({
			anchor: item,
			contentHashes: new Set([item.contentHash]),
			families: new Set([sourceFamilyId(item.sourceId)]),
			firstSeenAt: item.time,
			items: [{ confidence: EXACT_MATCH_CONFIDENCE, item }],
			lastSeenAt: item.time,
			sourceIds: new Set([item.sourceId]),
			urls: new Set([normalizeUrl(item.url)]),
		});
	}
	return clusters.map(
		({ anchor, firstSeenAt, items: members, lastSeenAt }) => ({
			anchor,
			firstSeenAt,
			items: members,
			lastSeenAt,
		})
	);
}
