import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { FetchLike } from "../services/article-fetch";
import { extractContentText } from "../services/event-content-enrichment";

const fixturePath = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"fixtures/article-page.html"
);
const PAGE_URL = "https://news.example.com/2026/09/27/electric-ferries";

function serve(response: () => Response): FetchLike {
	return () => Promise.resolve(response());
}

describe("extractContentText", () => {
	test("returns the article text for a readable page", async () => {
		const html = await readFile(fixturePath, "utf8");

		const result = await extractContentText(PAGE_URL, {
			fetchImpl: serve(
				() =>
					new Response(html, {
						headers: { "Content-Type": "text/html; charset=utf-8" },
					})
			),
		});

		expect(result.status).toBe("ok");
		expect(result.error).toBeUndefined();
		expect(result.text).toContain("battery-powered boats");
	});

	test("keeps restricted pages restricted", async () => {
		const result = await extractContentText(PAGE_URL, {
			fetchImpl: serve(() => new Response("Forbidden", { status: 403 })),
		});

		expect(result).toEqual({ status: "restricted", error: "restricted" });
	});

	test("records which stage failed", async () => {
		const httpError = await extractContentText(PAGE_URL, {
			fetchImpl: serve(() => new Response("Oops", { status: 503 })),
		});
		const networkError = await extractContentText(PAGE_URL, {
			fetchImpl: () =>
				Promise.reject(new TypeError("Network connection lost.")),
		});

		expect(httpError).toEqual({ status: "failed", error: "fetch: HTTP 503" });
		expect(networkError).toEqual({
			status: "failed",
			error: "fetch: TypeError: Network connection lost.",
		});
	});

	test("never throws for a malformed URL", async () => {
		const result = await extractContentText("not a url");

		expect(result.status).toBe("failed");
		expect(result.error).toStartWith("fetch: TypeError");
	});
});
