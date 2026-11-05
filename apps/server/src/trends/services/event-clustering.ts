import {
	EVENT_BRIDGE_ANCHOR_SIMILARITY,
	EVENT_BRIDGE_MAX_GAP_MS,
	EVENT_BRIDGE_MIN_KEYWORDS,
	EVENT_MEMBER_ANCHOR_FLOOR,
	isSameEventSignal,
	isStrongEventSignal,
	keywordOverlapCount,
} from "./event-merge-rules";
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
// members) keeps a cluster from drifting towards a neighbour story.
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

// How close the report is to the event's nearest report. Among events whose
// first report matches, the report joins the one it is closest to: a Dots
// report that also names Meta's Muse belongs with the other Dots reports,
// not with a Muse story whose first report happens to be a little closer.
function closestMemberSimilarity<T extends ClusterCandidate>(
	item: T,
	cluster: ClusterState<T>,
	anchorSimilarity: number
): number {
	let closest = anchorSimilarity;
	for (const { item: member } of cluster.items) {
		if (member !== cluster.anchor && item.embedding && member.embedding) {
			closest = Math.max(
				closest,
				cosineSimilarity(item.embedding, member.embedding)
			);
		}
	}
	return closest;
}

// When the first report does not match, a strong match with a later report
// still joins, provided the first report is not unrelated. Astra reports
// scored 0.43 against the first one and 0.72 against another.
function strongMemberSimilarity<T extends ClusterCandidate>(
	item: T,
	cluster: ClusterState<T>
): number | null {
	const anchor = cluster.anchor;
	if (
		!(item.embedding && anchor.embedding) ||
		cosineSimilarity(item.embedding, anchor.embedding) <
			EVENT_MEMBER_ANCHOR_FLOOR
	) {
		return null;
	}
	let best: number | null = null;
	for (const { item: member } of cluster.items) {
		if (member === anchor || !member.embedding) {
			continue;
		}
		const similarity = cosineSimilarity(item.embedding, member.embedding);
		const keywordMatches = keywordOverlapCount(item.keywords, member.keywords);
		if (
			isStrongEventSignal({ keywordMatches, similarity }) &&
			(best === null || similarity > best)
		) {
			best = similarity;
		}
	}
	return best;
}

interface ClusterMatch<T extends ClusterCandidate> {
	/** Other events whose first report also matched: the same story, maybe. */
	alsoMatched: ClusterState<T>[];
	cluster: ClusterState<T>;
	confidence: number;
}

function toMatch<T extends ClusterCandidate>(
	cluster: ClusterState<T>,
	similarity: number,
	alsoMatched: ClusterState<T>[] = []
): ClusterMatch<T> {
	return {
		alsoMatched,
		cluster,
		confidence: Math.round(
			Math.min(MAX_SIMILARITY_CONFIDENCE, similarity * 100)
		),
	};
}

function findCluster<T extends ClusterCandidate>(
	item: T,
	clusters: ClusterState<T>[]
): ClusterMatch<T> | null {
	const url = normalizeUrl(item.url);
	const family = sourceFamilyId(item.sourceId);
	const anchorMatches: Array<{
		cluster: ClusterState<T>;
		closest: number;
		similarity: number;
	}> = [];
	let memberMatch: { cluster: ClusterState<T>; similarity: number } | null =
		null;
	for (const cluster of clusters) {
		// Two items of one feed are two articles, whatever their links say.
		if (cluster.sourceIds.has(item.sourceId)) {
			continue;
		}
		if (isExactDuplicate(item, url, cluster)) {
			return {
				alsoMatched: [],
				cluster,
				confidence: EXACT_MATCH_CONFIDENCE,
			};
		}
		// One report per publisher: a second article from the same site is a
		// different story unless it is the same URL.
		if (cluster.families.has(family) || !isInTimeWindow(item, cluster)) {
			continue;
		}
		const similarity = similarityToAnchor(item, cluster);
		if (similarity !== null) {
			anchorMatches.push({
				closest: closestMemberSimilarity(item, cluster, similarity),
				cluster,
				similarity,
			});
			continue;
		}
		const member = strongMemberSimilarity(item, cluster);
		if (member !== null && (!memberMatch || member > memberMatch.similarity)) {
			memberMatch = { cluster, similarity: member };
		}
	}
	if (anchorMatches.length > 0) {
		const [best, ...others] = [...anchorMatches].sort(
			(a, b) => b.closest - a.closest
		);
		if (best) {
			return toMatch(
				best.cluster,
				best.similarity,
				others.map((other) => other.cluster)
			);
		}
	}
	return memberMatch
		? toMatch(memberMatch.cluster, memberMatch.similarity)
		: null;
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

// Whether two events that one report matched are the same story: their
// first reports are close, share keywords and came out within two days.
function isSameStory<T extends ClusterCandidate>(
	a: ClusterState<T>,
	b: ClusterState<T>
): boolean {
	if (!(a.anchor.embedding && b.anchor.embedding)) {
		return false;
	}
	return (
		Math.abs(a.anchor.time - b.anchor.time) <= EVENT_BRIDGE_MAX_GAP_MS &&
		keywordOverlapCount(a.anchor.keywords, b.anchor.keywords) >=
			EVENT_BRIDGE_MIN_KEYWORDS &&
		cosineSimilarity(a.anchor.embedding, b.anchor.embedding) >=
			EVENT_BRIDGE_ANCHOR_SIMILARITY
	);
}

// Joins events that reports bridged: when a report matched two events whose
// first reports are close, a publisher that came out between them made the
// second one start on its own (The Verge before Ars on Anthropic's
// prospectus). The earlier event keeps its anchor and id.
function mergeBridgedClusters<T extends ClusterCandidate>(
	clusters: ClusterState<T>[],
	bridges: readonly [ClusterState<T>, ClusterState<T>][]
): ClusterState<T>[] {
	const parent = new Map<ClusterState<T>, ClusterState<T>>(
		clusters.map((cluster) => [cluster, cluster])
	);
	const root = (cluster: ClusterState<T>): ClusterState<T> => {
		let current = cluster;
		let next = parent.get(current);
		while (next && next !== current) {
			current = next;
			next = parent.get(current);
		}
		return current;
	};
	for (const [a, b] of bridges) {
		const rootA = root(a);
		const rootB = root(b);
		if (rootA === rootB || !isSameStory(rootA, rootB)) {
			continue;
		}
		const [keep, drop] =
			rootA.anchor.time <= rootB.anchor.time ? [rootA, rootB] : [rootB, rootA];
		parent.set(drop, keep);
	}
	const merged = new Map<ClusterState<T>, ClusterState<T>>();
	for (const cluster of clusters) {
		const target = root(cluster);
		const into = merged.get(target);
		if (!into) {
			merged.set(target, { ...target, items: [...cluster.items] });
			continue;
		}
		merged.set(target, {
			...into,
			firstSeenAt: Math.min(into.firstSeenAt, cluster.firstSeenAt),
			items: [...into.items, ...cluster.items],
			lastSeenAt: Math.max(into.lastSeenAt, cluster.lastSeenAt),
		});
	}
	return [...merged.values()].map((cluster) => ({
		...cluster,
		items: [...cluster.items].sort((a, b) => a.item.time - b.item.time),
	}));
}

// Groups reports of one story from different publishers. Reports are taken
// oldest first, so every cluster is anchored on the first report of its story
// and keeps that anchor (and its event id) while later reports join.
export function clusterEventCandidates<T extends ClusterCandidate>(
	items: readonly T[]
): CandidateCluster<T>[] {
	const clusters: ClusterState<T>[] = [];
	const bridges: [ClusterState<T>, ClusterState<T>][] = [];
	const ordered = [...items].sort((a, b) => a.time - b.time);
	for (const item of ordered) {
		const found = findCluster(item, clusters);
		if (found) {
			addToCluster(found.cluster, item, found.confidence);
			for (const other of found.alsoMatched) {
				bridges.push([found.cluster, other]);
			}
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
	return mergeBridgedClusters(clusters, bridges).map(
		({ anchor, firstSeenAt, items: members, lastSeenAt }) => ({
			anchor,
			firstSeenAt,
			items: members,
			lastSeenAt,
		})
	);
}
