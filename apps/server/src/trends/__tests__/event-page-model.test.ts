import { describe, expect, it } from "bun:test";

import {
	contentWordCount,
	type EventPageContent,
	type EventPageRevision,
	isValidSlug,
	safeTokenEqual,
	selectCandidates,
	sourcesFromItems,
	validateRevision,
} from "../services/event-page-model";

const WORDS = (n: number) => Array.from({ length: n }, () => "word").join(" ");
const HAN = (n: number) => "字".repeat(n);

function content(overrides: Partial<EventPageContent> = {}): EventPageContent {
	return {
		description: "Sony and UMG sued Suno again over its v6 model.",
		divergence: WORDS(200),
		faq: [
			{ answer: WORDS(80), question: "Is UMG suing Suno?" },
			{ answer: WORDS(80), question: "Did Sony lose the lawsuit?" },
			{ answer: WORDS(80), question: "Is Suno music copyright free?" },
		],
		headline: "Suno lawsuit: Sony and UMG sue over Suno v6",
		summary: WORDS(200),
		timeline: [
			{ date: "2026-09-26", sourceUrls: ["https://a.test/1"], text: WORDS(20) },
			{ date: "2026-09-27", sourceUrls: ["https://b.test/1"], text: WORDS(20) },
		],
		title: "Suno lawsuit: Sony and UMG sue over Suno v6",
		...overrides,
	};
}

function zhContent(): EventPageContent {
	return content({
		description: "索尼和环球再次起诉 Suno。",
		divergence: HAN(300),
		faq: [
			{ answer: HAN(120), question: "环球在起诉 Suno 吗？" },
			{ answer: HAN(120), question: "索尼输了官司吗？" },
			{ answer: HAN(120), question: "Suno 生成的音乐有版权吗？" },
		],
		headline: "Suno lawsuit：索尼与环球起诉 Suno v6",
		summary: HAN(300),
		timeline: [
			{ date: "2026-09-26", sourceUrls: ["https://a.test/1"], text: HAN(40) },
			{ date: "2026-09-27", sourceUrls: ["https://b.test/1"], text: HAN(40) },
		],
		title: "Suno lawsuit：索尼与环球起诉 Suno v6",
	});
}

function revision(
	overrides: Partial<EventPageRevision> = {}
): EventPageRevision {
	return {
		content: { en: content(), zh: zhContent() },
		eventIds: ["event-1"],
		firstReportedAt: "2026-09-26T10:00:00.000Z",
		generatedAt: "2026-09-28T10:00:00.000Z",
		lastReportedAt: "2026-09-27T10:00:00.000Z",
		sources: [
			{
				publisher: "the-verge",
				publisherName: "The Verge",
				sourceId: "the-verge",
				title: "a",
				url: "https://a.test/1",
			},
			{
				publisher: "techcrunch",
				publisherName: "TechCrunch",
				sourceId: "techcrunch-ai",
				title: "b",
				url: "https://b.test/1",
			},
			{
				publisher: "wired",
				publisherName: "Wired",
				sourceId: "wired-science",
				title: "c",
				url: "https://c.test/1",
			},
		],
		topicIds: ["ai"],
		...overrides,
	};
}

describe("event page slugs", () => {
	it("accepts short lowercase words joined by hyphens", () => {
		expect(isValidSlug("sony-umg-sue-suno-v6")).toBe(true);
		expect(isValidSlug("openai-security-breach")).toBe(true);
	});

	it("rejects anything that is not a clean path segment", () => {
		expect(isValidSlug("suno")).toBe(false);
		expect(isValidSlug("Suno-Lawsuit")).toBe(false);
		expect(isValidSlug("suno--lawsuit")).toBe(false);
		expect(isValidSlug("suno lawsuit")).toBe(false);
		expect(isValidSlug("suno-lawsuit?topic=ai")).toBe(false);
		expect(isValidSlug(`${"a-".repeat(50)}b`)).toBe(false);
	});
});

describe("event page word count", () => {
	it("counts English words across the prose sections", () => {
		expect(contentWordCount(content(), "en")).toBe(200 + 200 + 240 + 40);
	});

	it("counts Chinese characters for the Chinese edition", () => {
		expect(contentWordCount(zhContent(), "zh")).toBe(300 + 300 + 360 + 80);
	});
});

describe("event page publish gate", () => {
	it("passes a complete revision", () => {
		expect(validateRevision(revision(), "suno lawsuit").errors).toEqual([]);
	});

	it("needs three independent publishers", () => {
		const twoPublishers = revision({
			sources: [
				{
					publisher: "the-verge",
					publisherName: "The Verge",
					sourceId: "the-verge",
					title: "a",
					url: "https://a.test/1",
				},
				{
					publisher: "the-verge",
					publisherName: "The Verge",
					sourceId: "the-verge-ai",
					title: "a2",
					url: "https://a.test/2",
				},
				{
					publisher: "techcrunch",
					publisherName: "TechCrunch",
					sourceId: "techcrunch",
					title: "b",
					url: "https://b.test/1",
				},
			],
		});
		expect(validateRevision(twoPublishers, "suno lawsuit").errors).toContain(
			"independent_sources"
		);
	});

	it("needs a timeline, enough text, FAQ and the keyword in the title", () => {
		const thin = revision({
			content: {
				en: content({
					description: "Something happened.",
					faq: [],
					summary: WORDS(10),
					timeline: [{ date: "2026-09-27", sourceUrls: [], text: "x" }],
					title: "Music labels sue an AI company",
				}),
				zh: zhContent(),
			},
		});
		const { errors } = validateRevision(thin, "suno lawsuit");
		expect(errors).toEqual(
			expect.arrayContaining([
				"en_timeline",
				"en_word_count",
				"en_faq",
				"en_keyword_in_title",
			])
		);
	});

	it("checks the Chinese edition on its own", () => {
		const shortZh = revision({
			content: {
				en: content(),
				zh: { ...zhContent(), divergence: HAN(10), summary: HAN(10) },
			},
		});
		expect(validateRevision(shortZh, "suno lawsuit").errors).toContain(
			"zh_word_count"
		);
	});

	it("only cites URLs that are among the sources", () => {
		const invented = revision({
			content: {
				en: content({
					timeline: [
						{
							date: "2026-09-26",
							sourceUrls: ["https://nowhere.test/"],
							text: WORDS(20),
						},
						{
							date: "2026-09-27",
							sourceUrls: ["https://b.test/1"],
							text: WORDS(20),
						},
					],
				}),
				zh: zhContent(),
			},
		});
		expect(validateRevision(invented, "suno lawsuit").errors).toContain(
			"en_timeline_citations"
		);
	});
});

describe("event page sources", () => {
	it("groups section feeds under one publisher and keeps one entry per URL", () => {
		const sources = sourcesFromItems(
			[
				{
					publishedAt: "2026-09-27T01:00:00.000Z",
					sourceId: "the-verge-ai",
					title: "A",
					url: "https://a.test/1",
				},
				{
					publishedAt: "2026-09-27T01:00:00.000Z",
					sourceId: "the-verge",
					title: "A",
					url: "https://a.test/1",
				},
				{ sourceId: "techcrunch", title: "B", url: "https://b.test/1" },
			],
			(sourceId) =>
				({ "the-verge": "The Verge", techcrunch: "TechCrunch" })[sourceId] ??
				sourceId
		);
		expect(sources).toEqual([
			{
				publishedAt: "2026-09-27T01:00:00.000Z",
				publisher: "the-verge",
				publisherName: "The Verge",
				sourceId: "the-verge-ai",
				title: "A",
				url: "https://a.test/1",
			},
			{
				publisher: "techcrunch",
				publisherName: "TechCrunch",
				sourceId: "techcrunch",
				title: "B",
				url: "https://b.test/1",
			},
		]);
	});
});

describe("event page candidates", () => {
	it("keeps events that three publishers reported, most publishers first", () => {
		const candidates = selectCandidates(
			[
				{
					eventId: "e1",
					sources: [
						{ sourceId: "the-verge" },
						{ sourceId: "the-verge-ai" },
						{ sourceId: "wired" },
					],
					title: "two publishers",
				},
				{
					eventId: "e2",
					sources: [
						{ sourceId: "the-verge" },
						{ sourceId: "wired" },
						{ sourceId: "techcrunch" },
					],
					title: "three",
				},
				{
					eventId: "e3",
					sources: [
						{ sourceId: "a" },
						{ sourceId: "b" },
						{ sourceId: "c" },
						{ sourceId: "d" },
					],
					title: "four",
				},
			],
			new Set(["e3-published-elsewhere"])
		);
		expect(candidates.map((c) => [c.eventId, c.publishers])).toEqual([
			["e3", 4],
			["e2", 3],
		]);
	});
});

describe("admin token", () => {
	it("compares tokens exactly", () => {
		expect(safeTokenEqual("abc123", "abc123")).toBe(true);
		expect(safeTokenEqual("abc123", "abc124")).toBe(false);
		expect(safeTokenEqual("abc123", "abc12")).toBe(false);
		expect(safeTokenEqual("", "")).toBe(false);
	});
});
