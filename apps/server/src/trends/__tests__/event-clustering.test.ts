import { describe, expect, it } from "bun:test";

import {
	type ClusterCandidate,
	clusterEventCandidates,
	EVENT_TIME_WINDOW_MS,
} from "../services/event-clustering";
import { keywordsForText } from "../services/event-merge-rules";

const HOUR_MS = 60 * 60_000;

function candidate(
	id: string,
	sourceId: string,
	text: string,
	embedding: number[],
	hour: number,
	url = `https://${sourceId}.example.com/${id}`
): ClusterCandidate & { id: string } {
	return {
		contentHash: `hash-${id}`,
		embedding,
		id,
		keywords: keywordsForText(text),
		sourceId,
		time: hour * HOUR_MS,
		url,
	};
}

function ids(clusters: ReturnType<typeof clusterEventCandidates>) {
	return clusters.map((cluster) =>
		cluster.items.map(({ item }) => (item as { id: string }).id)
	);
}

describe("event clustering", () => {
	it("anchors each event on its first report", () => {
		const clusters = clusterEventCandidates([
			candidate(
				"late",
				"gizmodo",
				"Zorblax vacuum launch apartments",
				[1, 0],
				5
			),
			candidate(
				"early",
				"techcrunch",
				"Zorblax vacuum launch apartments",
				[1, 0],
				1
			),
		]);

		expect(ids(clusters)).toEqual([["early", "late"]]);
		expect((clusters[0]?.anchor as { id: string }).id).toBe("early");
	});

	it("compares with the anchor, so a cluster does not drift to a neighbour story", () => {
		// b is close to a, c is close to b but not to a.
		const clusters = clusterEventCandidates([
			candidate(
				"a",
				"techcrunch",
				"Zorblax vacuum launch apartments",
				[1, 0, 0],
				1
			),
			candidate(
				"b",
				"gizmodo",
				"Zorblax vacuum launch apartments",
				[0.8, 0.6, 0],
				2
			),
			candidate(
				"c",
				"wired",
				"Zorblax vacuum launch apartments",
				[0.2, 0.98, 0],
				3
			),
		]);

		expect(ids(clusters)).toEqual([["a", "b"], ["c"]]);
	});

	it("keeps one report per publisher unless it is the same article", () => {
		const clusters = clusterEventCandidates([
			candidate(
				"verge",
				"the-verge",
				"Zorblax vacuum launch apartments",
				[1, 0],
				1,
				"https://theverge.com/a"
			),
			candidate(
				"verge-ai",
				"the-verge-ai",
				"Zorblax vacuum launch apartments",
				[1, 0],
				2,
				"https://www.theverge.com/a?utm_source=rss"
			),
			candidate(
				"verge-2",
				"the-verge-gadgets",
				"Zorblax vacuum launch apartments",
				[1, 0],
				3
			),
		]);

		expect(ids(clusters)).toEqual([["verge", "verge-ai"], ["verge-2"]]);
	});

	it("needs a shared keyword and a close vector", () => {
		const clusters = clusterEventCandidates([
			candidate(
				"a",
				"techcrunch",
				"Zorblax vacuum launch apartments",
				[1, 0],
				1
			),
			candidate("b", "gizmodo", "Quibbit satellite network funding", [1, 0], 2),
			candidate("c", "wired", "Zorblax vacuum launch apartments", [0, 1], 3),
		]);

		expect(ids(clusters)).toEqual([["a"], ["b"], ["c"]]);
	});

	it("does not merge reports further apart than the time window", () => {
		const windowHours = EVENT_TIME_WINDOW_MS / HOUR_MS;
		const clusters = clusterEventCandidates([
			candidate(
				"a",
				"techcrunch",
				"Zorblax vacuum launch apartments",
				[1, 0],
				0
			),
			candidate(
				"b",
				"gizmodo",
				"Zorblax vacuum launch apartments",
				[1, 0],
				windowHours + 1
			),
		]);

		expect(ids(clusters)).toEqual([["a"], ["b"]]);
	});

	it("joins the closest matching event", () => {
		const clusters = clusterEventCandidates([
			candidate(
				"a",
				"techcrunch",
				"Zorblax vacuum launch apartments",
				[1, 0],
				1
			),
			candidate("b", "wired", "Zorblax vacuum launch apartments", [0, 1], 2),
			// Similar enough to both (0.6 and 0.8), closer to b.
			candidate(
				"c",
				"gizmodo",
				"Zorblax vacuum launch apartments",
				[0.6, 0.8],
				3
			),
		]);

		expect(ids(clusters)).toEqual([["a"], ["b", "c"]]);
	});
});
