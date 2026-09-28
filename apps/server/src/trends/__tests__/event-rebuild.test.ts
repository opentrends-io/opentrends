import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { runWithServerEnv } from "@opentrends/env/server";

import { EVENT_EMBEDDING_DIMENSIONS } from "../services/event-embedding";
import {
	EVENT_RECENT_WINDOW_MS,
	getEventSourceTopics,
	rebuildEvents,
} from "../services/event-rebuild";
import {
	EVENT_EMBEDDING_ITEM_LIMIT,
	EVENT_MAX_TOPICS_PER_SOURCE,
} from "../services/event-work-budget";
import { SqliteD1 } from "./support/d1-sqlite";

const serverEnv = {
	BETTER_AUTH_SECRET: "test".repeat(8),
	BETTER_AUTH_URL: "http://localhost:3000",
	CORS_ORIGIN: "http://localhost:3001",
	SILICONFLOW_API_KEY: "test-key",
	SILICONFLOW_EMBEDDING_MODEL: "test/embedding",
};
const HOUR_MS = 60 * 60_000;
// Each story gets its own direction; reports of one story share it.
const STORIES = ["zorblax", "quibbit", "vandrel", "moxtane", "prellow"];

interface ItemInput {
	generation?: number;
	hoursAgo: number;
	itemId: string;
	lastSeenHoursAgo?: number;
	rank?: number;
	sourceId: string;
	title: string;
}

function storyVector(text: string): number[] {
	const vector = new Array<number>(EVENT_EMBEDDING_DIMENSIONS).fill(0.001);
	const story = STORIES.findIndex((name) => text.toLowerCase().includes(name));
	vector[story >= 0 ? story : STORIES.length + (text.length % 50)] = 1;
	return vector;
}

function mockEmbeddings(calls: string[][]): () => void {
	const original = globalThis.fetch;
	globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
		const body = JSON.parse(String(init?.body)) as {
			dimensions: number;
			input: string[];
		};
		expect(body.dimensions).toBe(EVENT_EMBEDDING_DIMENSIONS);
		calls.push(body.input);
		return Promise.resolve(
			Response.json({
				data: body.input.map((text, index) => ({
					embedding: storyVector(text),
					index,
				})),
			})
		);
	}) as typeof fetch;
	return () => {
		globalThis.fetch = original;
	};
}

describe("event rebuild across topics", () => {
	let d1: SqliteD1;
	let embeddingCalls: string[][];
	let restoreFetch: () => void;
	const now = Date.now();

	function seconds(hoursAgo: number): number {
		return Math.floor((now - hoursAgo * HOUR_MS) / 1000);
	}

	function addSource(sourceId: string, generation = 2): void {
		d1.database
			.query(
				"INSERT OR REPLACE INTO source (source_id, status, generation) VALUES (?, 'ok', ?)"
			)
			.run(sourceId, generation);
	}

	function addItem(item: ItemInput): void {
		d1.database
			.query(
				`INSERT INTO source_item (source_id, item_id, generation, url, title, description, rank,
					published_at, fetched_at, last_seen_at, content_hash, content_status)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed')`
			)
			.run(
				item.sourceId,
				item.itemId,
				item.generation ?? 2,
				`https://${item.sourceId}.example.com/${item.itemId}`,
				item.title,
				`${item.title}. More details on the announcement.`,
				item.rank ?? 1,
				seconds(item.hoursAgo),
				seconds(item.lastSeenHoursAgo ?? 0),
				seconds(item.lastSeenHoursAgo ?? 0),
				`hash-${item.sourceId}-${item.itemId}`
			);
	}

	function rebuild(): Promise<boolean> {
		return runWithServerEnv(serverEnv, () => d1.run(() => rebuildEvents(now)));
	}

	function events() {
		return d1.all<{ event_id: string; source_count: number; title: string }>(
			"SELECT event_id, source_count, title FROM trend_event ORDER BY title"
		);
	}

	function topicsOf(eventId: string): string[] {
		return d1
			.all<{ topic_id: string }>(
				"SELECT topic_id FROM trend_event_topic WHERE event_id = ? ORDER BY topic_id",
				eventId
			)
			.map((row) => row.topic_id);
	}

	function sourcesOf(eventId: string): string[] {
		return d1
			.all<{ source_id: string }>(
				"SELECT source_id FROM trend_event_source_item WHERE event_id = ? ORDER BY source_id",
				eventId
			)
			.map((row) => row.source_id);
	}

	beforeEach(() => {
		d1 = new SqliteD1();
		embeddingCalls = [];
		restoreFetch = mockEmbeddings(embeddingCalls);
		for (const sourceId of ["techcrunch", "gizmodo", "wired", "the-verge"]) {
			addSource(sourceId);
		}
	});

	afterEach(() => {
		restoreFetch();
		d1.close();
	});

	it("merges reports from sources in different topics into one event", async () => {
		// techcrunch is in "featured", gizmodo only in "hardware".
		addItem({
			hoursAgo: 3,
			itemId: "tc-1",
			sourceId: "techcrunch",
			title: "Zorblax launches a new robot vacuum for apartments",
		});
		addItem({
			hoursAgo: 1,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});
		addItem({
			hoursAgo: 2,
			itemId: "wired-1",
			sourceId: "wired",
			title: "Quibbit raises funding to expand its satellite network",
		});

		expect(await rebuild()).toBe(true);

		const stored = events();
		const zorblax = stored.find((row) => row.title.includes("Zorblax"));
		expect(stored).toHaveLength(2);
		expect(zorblax?.source_count).toBe(2);
		expect(sourcesOf(zorblax?.event_id ?? "")).toEqual([
			"gizmodo",
			"techcrunch",
		]);
		expect(topicsOf(zorblax?.event_id ?? "")).toEqual(["featured", "hardware"]);
	});

	it("keeps the event id while later reports join", async () => {
		addItem({
			hoursAgo: 5,
			itemId: "tc-1",
			sourceId: "techcrunch",
			title: "Zorblax launches a new robot vacuum for apartments",
		});
		await rebuild();
		const [first] = events();

		addItem({
			hoursAgo: 1,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});
		await rebuild();

		expect(
			events().map(({ event_id, source_count }) => ({ event_id, source_count }))
		).toEqual([{ event_id: first?.event_id ?? "", source_count: 2 }]);
	});

	it("lets a report join one that has already left its feed", async () => {
		// Previous generation: no longer in the feed, but seen 10 hours ago.
		addItem({
			generation: 1,
			hoursAgo: 20,
			itemId: "verge-old",
			lastSeenHoursAgo: 10,
			sourceId: "the-verge",
			title: "Zorblax launches a new robot vacuum for apartments",
		});
		addItem({
			hoursAgo: 2,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});
		// Left its feed and has no current report: not shown on its own.
		addItem({
			generation: 1,
			hoursAgo: 30,
			itemId: "verge-quibbit",
			lastSeenHoursAgo: 12,
			sourceId: "the-verge",
			title: "Quibbit raises funding to expand its satellite network",
		});
		// Left its feed too long ago to be a candidate.
		addItem({
			generation: 1,
			hoursAgo: 60,
			itemId: "verge-stale",
			lastSeenHoursAgo: EVENT_RECENT_WINDOW_MS / HOUR_MS + 1,
			sourceId: "the-verge",
			title: "Vandrel opens a factory to build electric scooters",
		});

		await rebuild();

		const stored = events();
		expect(stored).toHaveLength(1);
		expect(sourcesOf(stored[0]?.event_id ?? "")).toEqual([
			"gizmodo",
			"the-verge",
		]);
		expect(embeddingCalls.flat().some((text) => text.includes("Vandrel"))).toBe(
			false
		);
	});

	it("does not embed or merge promotional posts", async () => {
		addItem({
			hoursAgo: 2,
			itemId: "tc-ad",
			sourceId: "techcrunch",
			title: "Zorblax founder joins the stage at TechCrunch Disrupt 2026",
		});
		addItem({
			hoursAgo: 1,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});

		await rebuild();

		expect(events().map((row) => row.source_count)).toEqual([1]);
		expect(embeddingCalls.flat().some((text) => text.includes("Disrupt"))).toBe(
			false
		);
	});

	it("removes links to topics that no longer exist and events it no longer makes", async () => {
		const created = Math.floor(now / 1000);
		d1.database.exec(`
			INSERT INTO trend_event (event_id, topic_id, title, score, source_count, first_seen_at, last_seen_at, updated_at)
			VALUES ('featured-legacy', 'featured', 'Old format event', 100, 1, ${created}, ${created}, ${created}),
			       ('event-gone', 'home', 'Event without reports', 100, 1, ${created}, ${created}, ${created});
			INSERT INTO trend_event_topic (event_id, topic_id, created_at)
			VALUES ('featured-legacy', 'featured', ${created}), ('event-gone', 'home', ${created}), ('event-gone', 'all', ${created});
			INSERT INTO trend_event_source_item (event_id, source_id, item_id, is_primary, merge_confidence, created_at)
			VALUES ('featured-legacy', 'techcrunch', 'old', 1, 100, ${created});
		`);
		addItem({
			hoursAgo: 1,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});

		await rebuild();

		const [event] = events();
		expect(events()).toHaveLength(1);
		expect(
			d1.all<{ topic_id: string }>(
				"SELECT DISTINCT topic_id FROM trend_event_topic"
			)
		).toEqual([{ topic_id: "hardware" }]);
		expect(
			d1.all<{ event_id: string }>(
				"SELECT DISTINCT event_id FROM trend_event_source_item"
			)
		).toEqual([{ event_id: event?.event_id ?? "" }]);
	});

	it("drops the links a kept event no longer has", async () => {
		addItem({
			hoursAgo: 5,
			itemId: "tc-1",
			sourceId: "techcrunch",
			title: "Zorblax launches a new robot vacuum for apartments",
		});
		addItem({
			hoursAgo: 1,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});
		await rebuild();
		const [event] = events();
		expect(topicsOf(event?.event_id ?? "")).toEqual(["featured", "hardware"]);

		// The Gizmodo report leaves its feed and the 48-hour window.
		d1.database
			.query(
				"UPDATE source_item SET generation = 1, fetched_at = ? WHERE item_id = 'giz-1'"
			)
			.run(seconds(EVENT_RECENT_WINDOW_MS / HOUR_MS + 1));
		await rebuild();

		expect(events().map((row) => row.event_id)).toEqual([
			event?.event_id ?? "",
		]);
		expect(sourcesOf(event?.event_id ?? "")).toEqual(["techcrunch"]);
		expect(topicsOf(event?.event_id ?? "")).toEqual(["featured"]);
	});

	it("writes nothing when nothing changed", async () => {
		addItem({
			hoursAgo: 1,
			itemId: "giz-1",
			sourceId: "gizmodo",
			title: "Zorblax unveils robot vacuum built for small apartments",
		});
		await rebuild();
		const statementsAfterFirstRun = d1.batchedSql.length;

		expect(await rebuild()).toBe(true);

		expect(d1.batchedSql.length).toBe(statementsAfterFirstRun);
		expect(embeddingCalls).toHaveLength(1);
	});

	it("embeds at most one batch per invocation and asks to continue", async () => {
		for (let index = 0; index < EVENT_EMBEDDING_ITEM_LIMIT + 3; index += 1) {
			addItem({
				hoursAgo: 1 + index / 10,
				itemId: `giz-${index}`,
				rank: 1 + (index % 10),
				sourceId: "gizmodo",
				title: `Gadget report number ${index} about a new laptop`,
			});
		}

		expect(await rebuild()).toBe(false);
		expect(embeddingCalls.flat()).toHaveLength(EVENT_EMBEDDING_ITEM_LIMIT);
		expect(events()).toHaveLength(0);

		expect(await rebuild()).toBe(true);
		expect(embeddingCalls.flat()).toHaveLength(EVENT_EMBEDDING_ITEM_LIMIT + 3);
		expect(events().length).toBeGreaterThan(0);
	});
});

describe("event source topics", () => {
	it("links a source to at most the budgeted number of topics", () => {
		for (const topics of getEventSourceTopics().values()) {
			expect(topics.length).toBeLessThanOrEqual(EVENT_MAX_TOPICS_PER_SOURCE);
		}
	});
});
