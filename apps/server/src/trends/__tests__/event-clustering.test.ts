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

	// The cases below come from real splits on 2026-09-29 (Dots, GPT-6.1
	// Astra, Anthropic's prospectus); the vectors reproduce the similarities
	// measured between those reports.
	const TEXT = "Zorblax vacuum launch apartments";

	it("joins the event whose reports are closest, not only its first", () => {
		// i matches both first reports (0.56 and 0.54), but y's later report
		// is far closer to it (0.83): it belongs with y.
		const clusters = clusterEventCandidates([
			candidate("x0", "engadget", TEXT, [1, 0, 0], 1),
			candidate("y0", "the-decoder", TEXT, [0, 1, 0], 2),
			candidate("y1", "the-verge", TEXT, [0, 0.7, 0.714], 3),
			candidate("i", "wired", TEXT, [0.56, 0.54, 0.6283], 4),
		]);

		expect(ids(clusters)).toEqual([["x0"], ["y0", "y1", "i"]]);
	});

	it("joins through a later report that is a strong match", () => {
		// c is 0.43 from the first report (below the bar) but 0.76 from b.
		const clusters = clusterEventCandidates([
			candidate("a", "techcrunch", TEXT, [1, 0, 0], 1),
			candidate("b", "engadget", TEXT, [0.8, 0.6, 0], 2),
			candidate("c", "the-decoder", TEXT, [0.43, 0.7, 0.5701], 3),
		]);

		expect(ids(clusters)).toEqual([["a", "b", "c"]]);
	});

	it("does not join through a later report on a middling match", () => {
		// 0.55 to b is enough against a first report, not against a member.
		const clusters = clusterEventCandidates([
			candidate("a", "techcrunch", TEXT, [1, 0, 0], 1),
			candidate("b", "engadget", TEXT, [0.8, 0.6, 0], 2),
			candidate("c", "the-decoder", TEXT, [0.43, 0.3433, 0.835], 3),
		]);

		expect(ids(clusters)).toEqual([["a", "b"], ["c"]]);
	});

	it("merges two events one report matches when their first reports are close", () => {
		// a and b (0.47 apart) each started an event; c matches both.
		const clusters = clusterEventCandidates([
			candidate("a", "techcrunch", TEXT, [1, 0], 1),
			candidate("b", "the-verge", TEXT, [0.47, 0.8827], 7),
			candidate("c", "ars-technica", TEXT, [0.857, 0.5153], 9),
		]);

		expect(ids(clusters)).toEqual([["a", "b", "c"]]);
		expect((clusters[0]?.anchor as { id: string }).id).toBe("a");
	});

	it("keeps two events apart when their first reports are days apart", () => {
		const clusters = clusterEventCandidates([
			candidate("a", "techcrunch", TEXT, [1, 0], 0),
			candidate("b", "the-verge", TEXT, [0.47, 0.8827], 50),
			candidate("c", "ars-technica", TEXT, [0.8, 0.6], 51),
		]);

		expect(ids(clusters)).toEqual([["a"], ["b", "c"]]);
	});
});
