import { describe, expect, test } from "bun:test";

import { eventTopicIds } from "../services/event-topics";

const ORDER = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
];
const TOPICS = new Map<string, readonly string[]>([
	["engadget", ["hardware"]],
	["wired", ["hardware"]],
	["singularity-hub", ["biotech"]],
	["mit-tech-review-bio", ["biotech"]],
	["the-verge", ["featured"]],
	["the-verge-ai", ["ai"]],
	["solidot", ["cn"]],
	["liliputing", ["hardware"]],
]);

function topics(items: [string, string][]) {
	return eventTopicIds(
		items.map(([sourceId, title]) => ({ description: null, sourceId, title })),
		TOPICS,
		ORDER
	);
}

describe("eventTopicIds", () => {
	test("a general outlet's topic needs the story to be about it", () => {
		expect(
			topics([["engadget", "OpenAI sued over the Hugging Face breach"]])
		).toEqual(["ai"]);
		expect(
			topics([
				["singularity-hub", "This robot dog ran a marathon without recharging"],
			])
		).toEqual(["embodied"]);
		expect(
			topics([
				[
					"engadget",
					"Sony starts a lottery for scarce PS5 Pro consoles in Japan",
				],
			])
		).toEqual(["hardware"]);
	});

	test("vertical sources keep their topic", () => {
		expect(
			topics([["the-verge-ai", "Protesters gather at a developer conference"]])
		).toEqual(["ai"]);
		expect(topics([["liliputing", "A jellyfish-shaped dumbphone"]])).toEqual([
			"hardware",
		]);
	});

	test("featured and Chinese follow the source", () => {
		expect(
			topics([
				[
					"the-verge",
					"The most powerful weight-loss drug yet: up to 25% in trials",
				],
				["wired", "The most powerful weight-loss drug yet"],
			])
		).toEqual(["featured", "biotech"]);
		expect(topics([["solidot", "谷歌将在 2034 年停止支持 ChromeOS"]])).toEqual([
			"cn",
		]);
	});

	test("a general outlet's story about nothing it knows keeps the outlet's topic", () => {
		expect(
			topics([["wired", "Away's new luggage keeps its safe style"]])
		).toEqual(["hardware"]);
	});
});
