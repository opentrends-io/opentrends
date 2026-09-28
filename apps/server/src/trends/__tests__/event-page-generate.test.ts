import { describe, expect, it } from "bun:test";
import { runWithServerEnv } from "@opentrends/env/server";

import { eventPageRoutes } from "../../routes/event-pages";
import {
	buildPrompt,
	parseGeneratedPage,
	type Report,
	toContent,
} from "../services/event-page-generate";

const reports: Report[] = [
	{
		publishedAt: "2026-09-26T08:00:00.000Z",
		sourceId: "the-verge",
		title: "Labels sue Suno again",
		url: "https://a.test/1",
	},
	{
		description: "The suit targets v6.",
		sourceId: "techcrunch",
		title: "Sony and UMG file suit",
		url: "https://b.test/1",
	},
];

const EDITION = {
	description: "d",
	divergence: "v",
	faq: [{ answer: "a", question: "q" }],
	headline: "h",
	summary: "s",
	timeline: [{ date: "2026-09-26", reports: ["1", 2], text: "t" }],
	title: "t",
};

describe("parsing the model's answer", () => {
	it("reads JSON wrapped in a code fence and coerces report numbers", () => {
		const text = `Here it is:\n\`\`\`json\n${JSON.stringify({ en: EDITION, zh: EDITION })}\n\`\`\``;
		const parsed = parseGeneratedPage(text);
		expect("page" in parsed && parsed.page.en.timeline[0]?.reports).toEqual([
			1, 2,
		]);
	});

	it("reports what is wrong with a malformed answer", () => {
		const missing = parseGeneratedPage(JSON.stringify({ en: EDITION }));
		expect("error" in missing && missing.error).toContain("zh");
		const garbage = parseGeneratedPage("no json here");
		expect("error" in garbage).toBe(true);
	});
});

describe("event page generation", () => {
	it("turns report numbers into the reports' URLs and drops unknown ones", () => {
		const content = toContent(
			{
				description: " Status. ",
				divergence: "d",
				faq: [
					{ answer: "a", question: "q" },
					{ answer: "", question: "empty answers are dropped" },
				],
				headline: "h",
				summary: "Reviews landed [1][2] on the same day [3, 4].",
				timeline: [
					{ date: "2026-09-27", reports: [2, 2, 9], text: "second [2]" },
					{ date: "2026-09-26", reports: [1], text: "first" },
					{
						date: "last week",
						reports: [1],
						text: "undated entries are dropped",
					},
				],
				title: "t",
			},
			reports
		);
		expect(content.description).toBe("Status.");
		expect(content.summary).toBe("Reviews landed on the same day.");
		expect(content.faq).toEqual([{ answer: "a", question: "q" }]);
		expect(content.timeline).toEqual([
			{ date: "2026-09-26", sourceUrls: ["https://a.test/1"], text: "first" },
			{ date: "2026-09-27", sourceUrls: ["https://b.test/1"], text: "second" },
		]);
	});

	it("numbers the reports and names their publishers", () => {
		const { prompt, system } = buildPrompt("suno lawsuit", reports, (id) =>
			id === "the-verge" ? "The Verge" : "TechCrunch"
		);
		expect(prompt).toContain("Target phrase: suno lawsuit");
		expect(prompt).toContain("[1] The Verge, 2026-09-26T08:00:00.000Z");
		expect(prompt).toContain(
			"[2] TechCrunch\nTitle: Sony and UMG file suit\nSummary: The suit targets v6."
		);
		expect(system).toContain("Never invent");
	});
});

const BASE_ENV = {
	BETTER_AUTH_SECRET: "x".repeat(32),
	BETTER_AUTH_URL: "https://api.example.test",
	CORS_ORIGIN: "https://example.test",
};
const TOKEN = "t".repeat(32);

function request(path: string, init?: RequestInit, withToken = false) {
	return runWithServerEnv(
		withToken ? { ...BASE_ENV, EVENT_PAGES_ADMIN_TOKEN: TOKEN } : BASE_ENV,
		() => eventPageRoutes.request(path, init)
	);
}

describe("event page routes", () => {
	it("keeps the admin API closed without a configured token", async () => {
		expect((await request("/admin/pages")).status).toBe(503);
	});

	it("refuses a missing or wrong token", async () => {
		expect((await request("/admin/pages", undefined, true)).status).toBe(401);
		const wrong = await request(
			"/admin/pages",
			{ headers: { authorization: `Bearer ${"u".repeat(32)}` } },
			true
		);
		expect(wrong.status).toBe(401);
	});

	it("rejects a malformed draft request before doing any work", async () => {
		const response = await request(
			"/admin/pages",
			{
				body: JSON.stringify({ eventIds: [], keyword: "x", slug: "Bad Slug" }),
				headers: {
					authorization: `Bearer ${TOKEN}`,
					"content-type": "application/json",
				},
				method: "POST",
			},
			true
		);
		expect(response.status).toBe(400);
	});

	it("answers 404 for a slug that is not a valid page path", async () => {
		expect((await request("/Not%20A%20Slug")).status).toBe(404);
	});
});
