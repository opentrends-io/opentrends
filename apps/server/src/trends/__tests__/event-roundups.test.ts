import { describe, expect, it } from "bun:test";

import { isRoundupItem } from "../services/event-roundups";

function roundup(title: string, sourceId = "sspai") {
	return isRoundupItem({ sourceId, title });
}

describe("roundup posts", () => {
	it("recognises daily and weekly digests in Chinese", () => {
		expect(roundup("派早报：小米秋季新品发布会、通义千问发布新模型")).toBe(
			true
		);
		expect(roundup("早报 | 小米秋季新品发布会召开", "ifanr")).toBe(true);
		expect(roundup("36氪晚报｜苹果发布新品", "36kr-news")).toBe(true);
		expect(roundup("科技爱好者周刊（第 368 期）", "ruanyifeng")).toBe(true);
	});

	it("recognises newsletter issues in English", () => {
		expect(
			roundup(
				"The Download: AI in the classroom, and a new chip",
				"mit-tech-review"
			)
		).toBe(true);
		expect(roundup("Daily Crunch: OpenAI pauses training", "techcrunch")).toBe(
			true
		);
		expect(
			roundup("[AINews] Claude Opus 5.5, the new default", "latent-space")
		).toBe(true);
		expect(
			roundup("This Week in AI: robots learn to fold laundry", "venturebeat-ai")
		).toBe(true);
		expect(roundup("Last Week in AI #312", "lastweekin-ai")).toBe(true);
	});

	it("keeps ordinary reports", () => {
		expect(
			roundup("OpenAI pauses training of its most capable models", "the-verge")
		).toBe(false);
		expect(roundup("小米发布 17 Ultra，售价 5999 元", "ifanr")).toBe(false);
		expect(
			roundup("The downloadable version of Doom now runs in a PDF", "the-verge")
		).toBe(false);
		expect(
			roundup("Weekly active users of ChatGPT reach 1.5 billion", "techcrunch")
		).toBe(false);
	});
});
