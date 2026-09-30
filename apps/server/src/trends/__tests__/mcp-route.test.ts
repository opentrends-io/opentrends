import { expect, test } from "bun:test";
import { Hono } from "hono";

import { createMcpRoutes } from "../../routes/mcp";

const MCP_URL = "https://api.opentrends.io/mcp";

test("MCP tools read the API within the Worker instead of fetching their own domain", async () => {
	const app = new Hono();
	const requestedPaths: string[] = [];
	app.get("/api/trends/:topic/summary", (context) => {
		requestedPaths.push(new URL(context.req.url).pathname);
		return context.json({
			entries: [{ citations: [], n: 1, takeaway: "Test digest" }],
			lang: "en",
			markdown: "Test digest",
			topic: context.req.param("topic"),
			window: "today",
		});
	});
	app.get("/api/trends/:topic/sources/:sourceId", (context) => {
		requestedPaths.push(new URL(context.req.url).pathname);
		return context.json({
			items: [
				{
					id: "item-1",
					title: "AI test item",
					url: "https://example.com/item",
				},
			],
			sourceId: context.req.param("sourceId"),
			title: "Test source",
		});
	});
	app.get("/api/trends/:topic", (context) => {
		requestedPaths.push(new URL(context.req.url).pathname);
		return context.json({
			id: context.req.param("topic"),
			sections: [
				{
					id: "section-1",
					sources: [
						{
							items: [
								{
									id: "item-1",
									title: "AI test item",
									url: "https://example.com/item",
								},
							],
							sourceId: "source-1",
							status: "ok",
							title: "Test source",
						},
					],
					title: "Test section",
				},
			],
			title: "AI",
			updatedAt: Date.now(),
		});
	});
	app.route(
		"/mcp",
		createMcpRoutes((request) => app.fetch(request))
	);

	const originalFetch = globalThis.fetch;
	const backgroundTasks: Promise<unknown>[] = [];
	const executionCtx = {
		passThroughOnException() {
			throw new Error("Unexpected pass-through");
		},
		waitUntil(promise: Promise<unknown>) {
			backgroundTasks.push(promise);
		},
	} as ExecutionContext;
	globalThis.fetch = () =>
		Promise.reject(new Error("MCP attempted an external fetch"));
	try {
		for (const [name, args] of [
			["get_digest", { topic: "ai" }],
			["get_topic", { topic: "ai", itemsPerSource: 1 }],
			["get_source", { topic: "ai", sourceId: "source-1" }],
			["search", { topic: "ai", query: "test" }],
		] as const) {
			const response = await app.request(
				MCP_URL,
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
			);
			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.result.isError).not.toBe(true);
			expect(result.result.content[0].type).toBe("text");
		}
	} finally {
		globalThis.fetch = originalFetch;
	}
	await Promise.all(backgroundTasks);

	expect(requestedPaths).toEqual([
		"/api/trends/ai/summary",
		"/api/trends/ai",
		"/api/trends/ai/sources/source-1",
		"/api/trends/ai",
	]);
});
