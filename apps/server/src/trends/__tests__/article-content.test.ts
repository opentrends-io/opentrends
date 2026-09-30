import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Hono } from "hono";

import { createMcpRoutes } from "../../routes/mcp";
import { trendsRoutes } from "../../routes/trends";
import {
	getArticleContent,
	MAX_ARTICLE_BODY_LENGTH,
} from "../services/article-content";
import {
	ArticleContentChangedError,
	encodeCursor,
	ResearchInputError,
} from "../services/research-cursor";
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

test("body pages reconstruct Unicode and whitespace exactly and reject wrong versions", async () => {
	const d1 = database("ok");
	const body = `${"x".repeat(11_999)}🧪${" ".repeat(13_000)}the end`;
	const version = "a".repeat(64);
	d1.database
		.query(
			"UPDATE source_item SET article_text = ?, article_version = ?, article_content_hash = 'hash', article_truncated = 0"
		)
		.run(body, version);
	let cursor: string | undefined;
	let reconstructed = "";
	let firstCursor: string | undefined;
	for (let page = 0; page < 4; page += 1) {
		const result = await d1.run(() => getArticleContent({ ...ref, cursor }));
		expect(result?.offset).toBe(reconstructed.length);
		expect(result?.contentTruncated).toBe(false);
		expect(result?.text?.length).toBeGreaterThan(0);
		expect(result?.text?.length).toBeLessThanOrEqual(12_000);
		reconstructed += result?.text;
		cursor = result?.nextCursor;
		firstCursor ??= cursor;
		if (!result?.hasMore) {
			break;
		}
	}
	expect(reconstructed).toBe(body);
	expect(cursor).toBeUndefined();
	await expect(
		d1.run(() =>
			getArticleContent({
				...ref,
				cursor: encodeCursor({
					v: 1,
					sourceId: SOURCE_ID,
					itemId: "other",
					version,
					offset: 12_000,
				}),
			})
		)
	).rejects.toBeInstanceOf(ResearchInputError);
	await expect(
		d1.run(() =>
			getArticleContent({
				...ref,
				cursor: encodeCursor({
					v: 1,
					sourceId: SOURCE_ID,
					itemId: ITEM_ID,
					version,
					offset: 12_000,
				}),
			})
		)
	).rejects.toBeInstanceOf(ResearchInputError);
	d1.database.exec("UPDATE source_item SET content_hash = 'changed'");
	await expect(
		d1.run(() => getArticleContent({ ...ref, cursor: firstCursor }))
	).rejects.toBeInstanceOf(ArticleContentChangedError);
	d1.close();
});

test("upgrades legacy excerpts once while preserving the short summary field", async () => {
	const d1 = database("ok");
	d1.database.exec("UPDATE source_item SET content_text = 'old excerpt'");
	let fetches = 0;
	const html = `<html><body><article>${Array.from({ length: 80 }, (_, i) => `<p>${i} ${"Engineering advances help readers understand new research. ".repeat(10)}</p>`).join("")}</article></body></html>`;
	const options = {
		fetchImpl: () => {
			fetches += 1;
			return Promise.resolve(new Response(html));
		},
	};
	const result = await d1.run(() => getArticleContent(ref, options));
	expect(result?.hasMore).toBe(true);
	expect(result?.totalChars).toBeGreaterThan(12_000);
	const next = await d1.run(() =>
		getArticleContent({ ...ref, cursor: result?.nextCursor }, options)
	);
	expect(next?.source).toBe("cache");
	expect(fetches).toBe(1);
	expect(
		d1.all<{ size: number }>(
			"SELECT length(content_text) AS size FROM source_item"
		)[0]?.size
	).toBeLessThanOrEqual(12_000);
	d1.close();
});

test("extraction limits remain distinct from pagination", async () => {
	const d1 = database();
	const html = `<html><body><article><p>${"A detailed scientific report with original findings and meaningful supporting evidence. ".repeat(2600)}</p></article></body></html>`;
	const result = await d1.run(() =>
		getArticleContent(ref, {
			fetchImpl: () => Promise.resolve(new Response(html)),
		})
	);
	expect(result?.status).toBe("ok");
	expect(result?.hasMore).toBe(true);
	expect(result?.contentTruncated).toBe(true);
	expect(result?.totalChars).toBeLessThanOrEqual(MAX_ARTICLE_BODY_LENGTH);
	const last = await d1.run(() =>
		getArticleContent({
			...ref,
			cursor: encodeCursor({
				v: 1,
				sourceId: SOURCE_ID,
				itemId: ITEM_ID,
				offset: 192_000,
				version: result?.contentVersion,
			}),
		})
	);
	expect(last?.hasMore).toBe(false);
	expect(last?.contentTruncated).toBe(true);
	expect(last?.nextCursor).toBeUndefined();
	d1.close();
});

test("a refresh or deletion during extraction cannot overwrite or resurrect an article", async () => {
	for (const change of [
		"UPDATE source_item SET content_hash = 'new', content_status = 'pending'",
		"DELETE FROM source_item",
	]) {
		const d1 = database();
		await expect(
			d1.run(() =>
				getArticleContent(ref, {
					fetchImpl: () => {
						d1.database.exec(change);
						return Promise.resolve(new Response(fixture));
					},
				})
			)
		).rejects.toBeInstanceOf(ArticleContentChangedError);
		expect(
			d1.all("SELECT item_id FROM source_item WHERE article_text IS NOT NULL")
		).toEqual([]);
		d1.close();
	}
});

test("retained article bodies can continue past the old excerpt limit", async () => {
	const d1 = database("pending", 0);
	const paragraphs = Array.from(
		{ length: 100 },
		(_, i) =>
			`<p>Section ${i}: ${"A long article about useful research and engineering. ".repeat(8)}🧪</p>`
	).join("");
	const result = await d1.run(() =>
		getArticleContent(ref, {
			fetchImpl: () =>
				Promise.resolve(
					new Response(
						`<html><body><article>${paragraphs}</article></body></html>`,
						{
							headers: { "content-type": "text/html" },
						}
					)
				),
		})
	);
	expect(result).toMatchObject({ status: "ok", hasMore: true });
	expect(result).toHaveProperty("nextCursor");
	d1.close();
});

test("reads a versioned article body without fetching upstream", async () => {
	const d1 = database("ok");
	d1.database
		.query(
			"update source_item set article_text = ?, article_version = ?, article_content_hash = 'hash', article_truncated = 0 where item_id = ?"
		)
		.run("Already extracted body", "a".repeat(64), ITEM_ID);
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

test("does not fetch items outside the configured topic or missing items", async () => {
	const d1 = database("pending", 0);
	let fetches = 0;
	const options = {
		fetchImpl: () => {
			fetches += 1;
			return Promise.reject(new Error("unexpected fetch"));
		},
	};
	expect(
		await d1.run(() =>
			getArticleContent({ ...ref, itemId: "missing" }, options)
		)
	).toBeNull();
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
