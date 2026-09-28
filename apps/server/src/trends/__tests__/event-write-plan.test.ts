import { describe, expect, it } from "bun:test";

import {
	type EventRow,
	type EventState,
	planEventWrites,
	sourceLinkKey,
	topicLinkKey,
} from "../services/event-write-plan";

const TOPICS = ["featured", "ai", "hardware"];

function eventRow(
	eventId: string,
	overrides: Partial<EventRow> = {}
): EventRow {
	return {
		eventId,
		firstSeenAt: 1000,
		lastSeenAt: 2000,
		primaryItemId: "item-1",
		primarySourceId: "techcrunch",
		score: 120,
		sourceCount: 1,
		summary: "Summary",
		title: "A title",
		topicId: "featured",
		...overrides,
	};
}

function state(
	events: EventRow[],
	topicLinks: [string, string][],
	sourceLinks: [string, string, string][]
): EventState {
	return {
		events,
		sourceLinks: sourceLinks.map(([eventId, sourceId, itemId]) => ({
			eventId,
			isPrimary: 1,
			itemId,
			mergeConfidence: 100,
			sourceId,
		})),
		topicLinks: topicLinks.map(([eventId, topicId]) => ({ eventId, topicId })),
	};
}

describe("event write plan", () => {
	it("writes nothing when the stored events already match", () => {
		const current = state(
			[eventRow("event-a")],
			[["event-a", "featured"]],
			[["event-a", "techcrunch", "item-1"]]
		);

		expect(planEventWrites(current, current, TOPICS)).toEqual({
			deleteEventsOutside: null,
			deleteSourceLinkKeys: [],
			deleteSourceLinksOutside: null,
			deleteTopicLinkKeys: [],
			deleteTopicLinksOutside: null,
			insertTopicLinks: [],
			upsertEvents: [],
			upsertSourceLinks: [],
		});
	});

	it("deletes links to topics that no longer exist and events no longer made", () => {
		const desired = state(
			[eventRow("event-a")],
			[["event-a", "featured"]],
			[["event-a", "techcrunch", "item-1"]]
		);
		const stored = state(
			[eventRow("event-a"), eventRow("featured-legacy")],
			[
				["event-a", "featured"],
				["event-a", "home"],
				["featured-legacy", "featured"],
			],
			[
				["event-a", "techcrunch", "item-1"],
				["featured-legacy", "techcrunch", "old"],
			]
		);

		const plan = planEventWrites(desired, stored, TOPICS);

		expect(plan.deleteEventsOutside).toEqual(["event-a"]);
		expect(plan.deleteTopicLinksOutside).toEqual({
			eventIds: ["event-a"],
			topicIds: TOPICS,
		});
		expect(plan.deleteSourceLinksOutside).toEqual(["event-a"]);
		expect(plan.upsertEvents).toEqual([]);
	});

	it("removes the links a kept event no longer has and adds new ones", () => {
		const desired = state(
			[eventRow("event-a", { sourceCount: 2 })],
			[
				["event-a", "featured"],
				["event-a", "hardware"],
			],
			[
				["event-a", "techcrunch", "item-1"],
				["event-a", "gizmodo", "item-9"],
			]
		);
		const stored = state(
			[eventRow("event-a")],
			[
				["event-a", "featured"],
				["event-a", "ai"],
			],
			[
				["event-a", "techcrunch", "item-1"],
				["event-a", "the-verge-ai", "item-5"],
			]
		);

		const plan = planEventWrites(desired, stored, TOPICS);

		expect(plan.deleteTopicLinkKeys).toEqual([
			topicLinkKey({ eventId: "event-a", topicId: "ai" }),
		]);
		expect(plan.insertTopicLinks).toEqual([
			{ eventId: "event-a", topicId: "hardware" },
		]);
		expect(plan.deleteSourceLinkKeys).toEqual([
			sourceLinkKey({
				eventId: "event-a",
				itemId: "item-5",
				sourceId: "the-verge-ai",
			}),
		]);
		expect(plan.upsertSourceLinks.map((link) => link.sourceId)).toEqual([
			"gizmodo",
		]);
		expect(plan.upsertEvents.map((row) => row.sourceCount)).toEqual([2]);
		expect(plan.deleteEventsOutside).toBeNull();
	});

	it("keeps the highest score and the widest time span", () => {
		const desired = state(
			[eventRow("event-a", { firstSeenAt: 1500, lastSeenAt: 3000, score: 90 })],
			[],
			[]
		);
		const stored = state([eventRow("event-a", { score: 150 })], [], []);

		expect(planEventWrites(desired, stored, TOPICS).upsertEvents).toEqual([
			eventRow("event-a", { firstSeenAt: 1000, lastSeenAt: 3000, score: 150 }),
		]);
	});
});
