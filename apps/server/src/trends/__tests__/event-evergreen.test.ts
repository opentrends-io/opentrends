import { describe, expect, test } from "bun:test";

import { isEvergreenText } from "../services/event-evergreen";

describe("isEvergreenText", () => {
	test("guides, how-tos and explainers are not events", () => {
		for (const title of [
			"Don't throw away your old router — Do this instead",
			"How to prepare your Samsung Galaxy for the One UI 9 update",
			"How do translation earbuds actually work?",
			"Gemini and Find Hub can help you locate your important documents — here's how",
			"The 6 Best Laptop Docking Stations to Unlock a Full Desktop Experience (2026)",
			"如何为三星 One UI 9 更新做好准备",
			"2026 年最值得买的 5 款耳机盘点",
		]) {
			expect(isEvergreenText(title)).toBe(true);
		}
	});

	test("news stays", () => {
		for (const title of [
			"OpenAI launches Dots, its Muse competitor",
			"AMD will acquire Fei-Fei Li's World Labs for $8.2 billion",
			"How OpenAI's board decided to pause training",
			"Apple Pay finally launches in India after years in limbo",
			"苏姿丰550亿元买下李飞飞世界模型",
		]) {
			expect(isEvergreenText(title)).toBe(false);
		}
	});
});
