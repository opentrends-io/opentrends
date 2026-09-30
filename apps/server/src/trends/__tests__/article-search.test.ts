import { expect, test } from "bun:test";
import { Hono } from "hono";
import { createMcpRoutes } from "../../routes/mcp";
import { trendsRoutes } from "../../routes/trends";
import { searchArticles } from "../services/article-search";
import { ResearchInputError } from "../services/research-cursor";
import { SqliteD1 } from "./support/d1-sqlite";

const since = "2026-09-23T00:00:00Z";
const until = "2026-09-30T00:00:00Z";

function database(): SqliteD1 {
	const d1 = new SqliteD1();
	d1.database.exec(
		"INSERT INTO source (source_id, generation) VALUES ('anthropic-news', 2)"
	);
	for (const [id, date, title, description] of [
		["early", "2026-09-22T23:59:59Z", "Opus 5.5", ""],
		["a", since, "Pricing update", "Opus 5.5 costs less"],
		["b", "2026-09-25T00:00:00Z", "Opus 5.5 research", ""],
		["c", "2026-09-25T00:00:00Z", "Opus 5.5 release", ""],
		["late", until, "Opus 5.5", ""],
	]) {
		const time = Date.parse(date ?? "") / 1000;
		d1.database
			.query(
				`INSERT INTO source_item (source_id,item_id,generation,url,title,description,rank,published_at,fetched_at,last_seen_at,content_hash) VALUES ('anthropic-news',?,1,?,?,?,1,?,?,?,'hash')`
			)
			.run(
				id ?? "",
				`https://example.com/${id}`,
				title ?? "",
				description ?? "",
				time,
				time,
				time
			);
	}
	return d1;
}

test("history search filters the time range before paginating old generations", async () => {
	const d1 = database();
	const args = { query: "Opus 5.5", topic: "ai", since, until, limit: 2 };
	const first = await d1.run(() => searchArticles(args));
	expect(first.total).toBe(3);
	expect(first.hits.map((hit) => hit.itemId)).toEqual(["b", "c"]);
	expect(first.hasMore).toBe(true);
	const second = await d1.run(() =>
		searchArticles({ ...args, cursor: first.nextCursor })
	);
	expect(second.hits.map((hit) => hit.itemId)).toEqual(["a"]);
	expect(second.hasMore).toBe(false);
	d1.close();
});

test("missing publication dates are explicitly labeled; keywords are literal and source-scoped", async () => {
	const d1 = database();
	d1.database.exec(
		"UPDATE source_item SET published_at = NULL WHERE item_id = 'b'"
	);
	const result = await d1.run(() =>
		searchArticles({ query: "Opus 5.5", since, until, topic: "ai" })
	);
	expect(result.hits[0]).toMatchObject({
		itemId: "b",
		dateBasis: "fetchedAt",
		publishedAt: undefined,
	});
	expect(result.hits[1]?.dateBasis).toBe("publishedAt");
	expect(
		(await d1.run(() => searchArticles({ query: "%", since, until }))).total
	).toBe(0);
	expect(
		(
			await d1.run(() =>
				searchArticles({ query: "Opus 5.5", since, until, topic: "biotech" })
			)
		).total
	).toBe(0);
	expect(
		(await d1.run(() => searchArticles({ query: "Opus 5.5", since, until })))
			.total
	).toBe(3);
	d1.close();
});

test("subsecond and timezone boundaries preserve inclusive start and exclusive end", async () => {
	const d1 = database();
	const result = await d1.run(() =>
		searchArticles({
			query: "Opus",
			since: "2026-09-23T08:00:00.001+08:00",
			until: "2026-09-25T00:00:00.001Z",
		})
	);
	expect(result.hits.map((hit) => hit.itemId)).toEqual(["b", "c"]);
	d1.close();
});

test("invalid ranges, cursors and changed search parameters fail before a query", async () => {
	const d1 = database();
	for (const input of [
		{ since: until, until: since },
		{ since: "2026-08-01", until },
		{ since: "2026-02-30", until },
		{ query: " " },
		{ cursor: "garbage" },
		{ topic: "not-a-topic" },
		{ limit: 101 },
	]) {
		await expect(
			d1.run(() => searchArticles({ query: "Opus", ...input }))
		).rejects.toBeInstanceOf(ResearchInputError);
	}
	const first = await d1.run(() =>
		searchArticles({ query: "Opus", since, until, limit: 1 })
	);
	await expect(
		d1.run(() =>
			searchArticles({ query: "different", cursor: first.nextCursor })
		)
	).rejects.toBeInstanceOf(ResearchInputError);
	const next = await d1.run(() =>
		searchArticles({ query: "Opus", cursor: first.nextCursor })
	);
	expect(next.since).toBe(first.since);
	expect(next.until).toBe(first.until);
	d1.close();
});

test("real MCP history search leads to a historical article and continuation without self-fetch", async () => {
	const d1 = database();
	const body = "Synthetic research article. ".repeat(1000);
	d1.database
		.query(
			"UPDATE source_item SET article_text = ?, article_version = ?, article_content_hash = 'hash', article_truncated = 0"
		)
		.run(body, "b".repeat(64));
	const app = new Hono();
	app.route("/api/trends", trendsRoutes);
	app.route(
		"/mcp",
		createMcpRoutes((request) => app.fetch(request))
	);
	const backgroundTasks: Promise<unknown>[] = [];
	const executionCtx = {
		waitUntil(promise: Promise<unknown>) {
			backgroundTasks.push(promise);
		},
		passThroughOnException() {
			throw new Error("Unexpected pass-through");
		},
	} as ExecutionContext;
	const call = async (name: string, args: Record<string, unknown>) => {
		const response = await d1.run(() =>
			app.request(
				"https://api.opentrends.io/mcp",
				{
					method: "POST",
					headers: {
						accept: "application/json, text/event-stream",
						"content-type": "application/json",
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: name,
						method: "tools/call",
						params: { name, arguments: args },
					}),
				},
				{},
				executionCtx
			)
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.result.isError).not.toBe(true);
		return JSON.parse(payload.result.content[0].text);
	};
	const result = await call("search", {
		query: "Opus 5.5",
		topic: "ai",
		since,
		until,
		limit: 1,
	});
	expect(result.total).toBe(3);
	expect(result.hits[0].itemId).toBe("b");
	const articleRef = {
		topic: result.hits[0].topic,
		sourceId: result.hits[0].sourceId,
		itemId: result.hits[0].itemId,
	};
	const first = await call("get_article", articleRef);
	expect(first.text).toBe(body.slice(0, 12_000));
	const next = await call("get_article", {
		...articleRef,
		cursor: first.nextCursor,
	});
	expect(next.text).toBe(body.slice(12_000, 24_000));
	const invalid = await d1.run(() =>
		app.request("/api/trends/search?query=test&since=not-a-date")
	);
	expect(invalid.status).toBe(400);
	const stale = await d1.run(() => {
		d1.database.exec("UPDATE source_item SET content_hash = 'new'");
		return app.request(
			`/api/trends/ai/sources/anthropic-news/article?itemId=b&cursor=${first.nextCursor}`
		);
	});
	expect(stale.status).toBe(409);
	await Promise.all(backgroundTasks);
	d1.close();
});
