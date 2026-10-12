import { describe, expect, test } from "bun:test";

import { eventHeat, publisherName } from "../services/event-heat";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 8, 30, 12);

describe("eventHeat", () => {
	test("each publisher counts once, at its latest report", () => {
		const { heat, publishers } = eventHeat(
			[
				{ sourceId: "techcrunch", time: NOW - 30 * HOUR },
				{ sourceId: "techcrunch-ai", time: NOW - 6 * HOUR },
				{ sourceId: "the-verge", time: NOW - 24 * HOUR },
			],
			NOW
		);
		expect(publishers.map((publisher) => publisher.id)).toEqual([
			"techcrunch",
			"the-verge",
		]);
		expect(publishers[0]?.firstAt).toBe(NOW - 30 * HOUR);
		expect(publishers[0]?.latestAt).toBe(NOW - 6 * HOUR);
		// 0.5^(6/24) + 0.5^(24/24)
		expect(heat).toBeCloseTo(2 ** -0.25 + 0.5, 5);
	});

	test("a new publisher following up lifts an older story above a fresh one", () => {
		const older = eventHeat(
			[
				{ sourceId: "wired", time: NOW - 20 * HOUR },
				{ sourceId: "engadget", time: NOW - 18 * HOUR },
				{ sourceId: "ars-technica", time: NOW - 1 * HOUR },
			],
			NOW
		);
		const fresh = eventHeat(
			[
				{ sourceId: "wired", time: NOW - 1 * HOUR },
				{ sourceId: "engadget", time: NOW - 1 * HOUR },
			],
			NOW
		);
		expect(older.heat).toBeGreaterThan(fresh.heat);
	});

	test("reports dated in the future count as now", () => {
		const { heat } = eventHeat(
			[{ sourceId: "wired", time: NOW + 5 * HOUR }],
			NOW
		);
		expect(heat).toBe(1);
	});

	test("publishers are ordered by who reported first", () => {
		const { publishers } = eventHeat(
			[
				{ sourceId: "wired", time: NOW - 2 * HOUR },
				{ sourceId: "the-decoder", time: NOW - 9 * HOUR },
			],
			NOW
		);
		expect(publishers.map((publisher) => publisher.id)).toEqual([
			"the-decoder",
			"wired",
		]);
	});
});

describe("publisherName", () => {
	test("drops the section after the dot", () => {
		expect(publisherName("TechCrunch · AI")).toBe("TechCrunch");
		expect(publisherName("The Verge")).toBe("The Verge");
	});
});
