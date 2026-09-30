import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Hono } from "hono";

import { createMcpRoutes } from "../../routes/mcp";
import { trendsRoutes } from "../../routes/trends";
import { getArticleContent } from "../services/article-content";
import { SqliteD1 } from "./support/d1-sqlite";

const fixture = readFileSync(
	new URL("fixtures/article-page.html", import.meta.url),
	"utf8"
);
const SOURCE_ID = "hackernews";
const ITEM_ID = "story-1";
const ARTICLE_URL = "https://news.example.com/story-1";
const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function database(status = "pending", generation = 1): SqliteD1 {
	const d1 = new SqliteD1();
	d1.database
		.query(
			"insert into source (source_id, status, generation) values (?, 'ok', 1)"
		)
		.run(SOURCE_ID);
	d1.database
		.query(
			`insert into source_item
			 (source_id, item_id, generation, url, title, rank, fetched_at,
			  last_seen_at, content_hash, content_status)
			 values (?, ?, ?, ?, 'Test article', 1, unixepoch(), unixepoch(), 'hash', ?)`
		)
		.run(SOURCE_ID, ITEM_ID, generation, ARTICLE_URL, status);
	return d1;
}

const ref = { topic: "featured", sourceId: SOURCE_ID, itemId: ITEM_ID };

test("reads existing article text without fetching upstream", async () => {
	const d1 = database("ok");
	d1.database
		.query("update source_item set content_text = ? where item_id = ?")
		.run("Already extracted body", ITEM_ID);
	let fetches = 0;
	const result = await d1.run(() =>
		getArticleContent(ref, {
			fetchImpl: () => {
				fetches += 1;
				return Promise.reject(new Error("unexpected fetch"));
			},
		})
	);
	expect(result).toMatchObject({
		status: "ok",
		text: "Already extracted body",
	});
	expect(fetches).toBe(0);
});

test("does not expose an already cached body for a private destination", async () => {
	const d1 = database("ok");
	d1.database
		.query("update source_item set url = ?, content_text = ? where item_id = ?")
		.run("http://127.0.0.1/private", "private response", ITEM_ID);
	expect(await d1.run(() => getArticleContent(ref))).toBeNull();
});

test("fetches only a known current article and caches the extracted text", async () => {
	const d1 = database();
	let fetches = 0;
	const options = {
		fetchImpl: () => {
			fetches += 1;
			return Promise.resolve(
				new Response(fixture, { headers: { "content-type": "text/html" } })
			);
		},
	};
	const first = await d1.run(() => getArticleContent(ref, options));
	const second = await d1.run(() => getArticleContent(ref, options));
	expect(first).toMatchObject({ status: "ok", source: "fetched" });
	expect(first?.text).toContain("battery-powered boats");
	expect(second).toMatchObject({ status: "ok", source: "cache" });
	expect(fetches).toBe(1);
});

test("does not fetch items outside the topic or current source generation", async () => {
	const d1 = database("pending", 0);
	let fetches = 0;
	const options = {
		fetchImpl: () => {
			fetches += 1;
			return Promise.reject(new Error("unexpected fetch"));
		},
	};
	expect(await d1.run(() => getArticleContent(ref, options))).toBeNull();
	expect(
		await d1.run(() => getArticleContent({ ...ref, topic: "biotech" }, options))
	).toBeNull();
	expect(fetches).toBe(0);
});

test("records restricted pages and does not retry them on every request", async () => {
	const d1 = database();
	let fetches = 0;
	const options = {
		fetchImpl: () => {
			fetches += 1;
			return Promise.resolve(new Response("Forbidden", { status: 403 }));
		},
	};
	expect(await d1.run(() => getArticleContent(ref, options))).toMatchObject({
		status: "restricted",
	});
	expect(await d1.run(() => getArticleContent(ref, options))).toMatchObject({
		status: "restricted",
	});
	expect(fetches).toBe(1);
});

test("concurrent requests claim one fetch and leave the other pending", async () => {
	const d1 = database();
	let releaseFetch = () => undefined;
	const fetchGate = new Promise<void>((resolve) => {
		releaseFetch = resolve;
	});
	let reportStarted = () => undefined;
	const started = new Promise<void>((resolve) => {
		reportStarted = resolve;
	});
	let fetches = 0;
	const options = {
		fetchImpl: async () => {
			fetches += 1;
			reportStarted();
			await fetchGate;
			return new Response(fixture, {
				headers: { "content-type": "text/html" },
			});
		},
	};
	const first = d1.run(() => getArticleContent(ref, options));
	await started;
	expect(await d1.run(() => getArticleContent(ref, options))).toMatchObject({
		status: "pending",
	});
	releaseFetch();
	expect(await first).toMatchObject({ status: "ok" });
	expect(fetches).toBe(1);
});

test("MCP reads an article through the real API route and D1-backed service", async () => {
	const d1 = database();
	const app = new Hono();
	app.route("/api/trends", trendsRoutes);
	app.route(
		"/mcp",
		createMcpRoutes((request) => app.fetch(request))
	);
	let fetches = 0;
	globalThis.fetch = () => {
		fetches += 1;
		return Promise.resolve(
			new Response(fixture, { headers: { "content-type": "text/html" } })
		);
	};
	const backgroundTasks: Promise<unknown>[] = [];
	const executionCtx = {
		passThroughOnException() {
			throw new Error("Unexpected pass-through");
		},
		waitUntil(promise: Promise<unknown>) {
			backgroundTasks.push(promise);
		},
	} as ExecutionContext;
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
					id: "article",
					method: "tools/call",
					params: { name: "get_article", arguments: ref },
				}),
			},
			{},
			executionCtx
		)
	);
	expect(response.status).toBe(200);
	const payload = await response.json();
	expect(payload.result.isError).not.toBe(true);
	expect(JSON.parse(payload.result.content[0].text)).toMatchObject({
		itemId: ITEM_ID,
		status: "ok",
		textLimitChars: 12_000,
	});
	expect(fetches).toBe(1);
	await Promise.all(backgroundTasks);
});
