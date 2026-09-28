import { db, schema } from "@opentrends/db";
import { env } from "@opentrends/env/server";
import { generateText } from "ai";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { getSourcePreset } from "../config/sources";
import type { SourceId } from "../types";
import { getEventDetail } from "./event-feed";
import {
	EVENT_PAGE_LANGS,
	type EventPageContent,
	type EventPageLang,
	type EventPageRevision,
	type EventPageSource,
	sourcesFromItems,
} from "./event-page-model";
import { llmModel, llmProviderOptions } from "./llm";

// Builds a draft revision of an event page: gathers every report of the
// story from the current events, reads what article text is available, and
// asks the model for both editions in one structured answer. The model sees
// reports by number and cites them by number; the numbers are mapped back to
// URLs here, so it cannot cite a link that is not in the snapshot.

const MAX_REPORTS = 24;
const EXCERPT_CHARS = 1200;
const GENERATION_TIMEOUT_MS = 150_000;

export interface Report {
	description?: string;
	excerpt?: string;
	publishedAt?: string;
	sourceId: string;
	title: string;
	url: string;
}

const EDITION_SCHEMA = z.object({
	description: z.string(),
	divergence: z.string(),
	faq: z.array(z.object({ answer: z.string(), question: z.string() })),
	headline: z.string(),
	summary: z.string(),
	timeline: z.array(
		z.object({
			date: z.string(),
			reports: z.array(z.coerce.number().int()),
			text: z.string(),
		})
	),
	title: z.string(),
});

const PAGE_SCHEMA = z.object({ en: EDITION_SCHEMA, zh: EDITION_SCHEMA });

export type GeneratedPage = z.infer<typeof PAGE_SCHEMA>;

// The shape the model is asked for, spelled out: the configured model does
// not support schema-constrained output, so the answer is parsed and
// checked here instead.
const JSON_SHAPE = JSON.stringify({
	en: {
		description: "string",
		divergence: "string",
		faq: [{ answer: "string", question: "string" }],
		headline: "string",
		summary: "string",
		timeline: [{ date: "YYYY-MM-DD", reports: [1], text: "string" }],
		title: "string",
	},
	zh: "same shape as en",
});

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/;

// The model's answer as a page, or what is wrong with it (fed back to the
// model on the retry).
export function parseGeneratedPage(
	text: string
): { page: GeneratedPage } | { error: string } {
	const fenced = FENCE_RE.exec(text)?.[1];
	const body = fenced ?? text;
	const start = body.indexOf("{");
	const end = body.lastIndexOf("}");
	if (start < 0 || end <= start) {
		return { error: "The answer contained no JSON object." };
	}
	let value: unknown;
	try {
		value = JSON.parse(body.slice(start, end + 1));
	} catch (error) {
		return {
			error: `The JSON did not parse: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
	const parsed = PAGE_SCHEMA.safeParse(value);
	if (!parsed.success) {
		return {
			error: parsed.error.issues
				.slice(0, 8)
				.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
				.join("; "),
		};
	}
	return { page: parsed.data };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const CITATION_MARK_RE = /\s*\[\d+(?:\s*,\s*\d+)*\]/g;

// Report numbers belong in the timeline's reports array; any the model left
// in the prose are removed.
function prose(text: string): string {
	return text.replace(CITATION_MARK_RE, "").trim();
}

// The model's edition with report numbers turned into the reports' URLs;
// numbers that do not point at a report are dropped.
export function toContent(
	edition: GeneratedPage[EventPageLang],
	reports: readonly Report[]
): EventPageContent {
	return {
		description: prose(edition.description),
		divergence: prose(edition.divergence),
		faq: edition.faq
			.map((entry) => ({
				answer: prose(entry.answer),
				question: prose(entry.question),
			}))
			.filter((entry) => entry.question && entry.answer),
		headline: prose(edition.headline),
		summary: prose(edition.summary),
		timeline: edition.timeline
			.filter((entry) => ISO_DATE_RE.test(entry.date) && entry.text.trim())
			.map((entry) => ({
				date: entry.date.trim(),
				sourceUrls: [
					...new Set(
						entry.reports.flatMap((n) => {
							const report = reports[n - 1];
							return report ? [report.url] : [];
						})
					),
				],
				text: prose(entry.text),
			}))
			.sort((a, b) => a.date.localeCompare(b.date)),
		title: edition.title.trim(),
	};
}

export function buildPrompt(
	keyword: string,
	reports: readonly Report[],
	publisherName: (sourceId: string) => string
): { prompt: string; system: string } {
	const system = [
		"You write event pages for OpenTrends, a site that follows how several publishers report the same story.",
		"Use only facts stated in the numbered reports. Never invent names, numbers, dates, quotes or outcomes; if the reports do not say something, do not say it. Where reports disagree or one adds a detail the others lack, say so and name the publisher.",
		"Cite reports only through the reports array of each timeline entry; never write [1] or report numbers in the prose. Do not mention the reports, excerpts, summaries, this prompt or timestamps finer than a day; write about the story itself. Write for readers who searched the target phrase: answer what happened, where it stands, and what is still unknown.",
		"Length follows the material: use the upper end of each range only when the reports support it. A short page is better than a padded one; never repeat yourself or fill space.",
		"Return two editions with the same facts: en in English, zh in Simplified Chinese (keep product, company and person names in their usual form).",
		`Answer with one JSON object and nothing else, in this shape: ${JSON_SHAPE}`,
		"Lengths: title under 65 characters and starting with the target phrase (natural capitalisation) followed by a colon and the current state; headline one sentence; description one sentence under 160 characters; summary 200-320 words (zh: 350-550 characters); timeline 3-8 entries of 30-55 words each (zh: 50-90 characters), dated YYYY-MM-DD from the reports; divergence 180-260 words (zh: 300-450 characters) comparing how the publishers told the story and what each stressed or added; faq 4-5 questions phrased the way people search, answers 70-110 words each (zh: 120-180 characters).",
	].join("\n");
	const lines = reports.map((report, index) =>
		[
			`[${index + 1}] ${publisherName(report.sourceId)}${report.publishedAt ? `, ${report.publishedAt}` : ""}`,
			`Title: ${report.title}`,
			report.description ? `Summary: ${report.description}` : "",
			report.excerpt ? `Excerpt: ${report.excerpt}` : "",
		]
			.filter(Boolean)
			.join("\n")
	);
	return {
		prompt: [`Target phrase: ${keyword}`, "", "Reports:", ...lines].join(
			"\n\n"
		),
		system,
	};
}

function sourceName(sourceId: string): string {
	return getSourcePreset(sourceId as SourceId)?.name ?? sourceId;
}

// The outlet's own name for a publisher family ("the-verge" → "The Verge"),
// falling back to the section feed's name without its section.
function publisherName(publisher: string, sourceId?: string): string {
	const own = getSourcePreset(publisher as SourceId)?.name;
	if (own) {
		return own;
	}
	return (
		(sourceId ? sourceName(sourceId) : publisher).split(" · ")[0] ?? publisher
	);
}

async function reportsFromEvents(eventIds: readonly string[]): Promise<{
	firstSeenAt?: string;
	lastSeenAt?: string;
	reports: Report[];
	topicIds: string[];
}> {
	const reports: Report[] = [];
	const topicIds = new Set<string>();
	let firstSeenAt: string | undefined;
	let lastSeenAt: string | undefined;
	for (const eventId of eventIds) {
		const detail = await getEventDetail(eventId, undefined, { lang: "en" });
		if (!detail) {
			continue;
		}
		topicIds.add(detail.topicId);
		firstSeenAt =
			!firstSeenAt || detail.firstSeenAt < firstSeenAt
				? detail.firstSeenAt
				: firstSeenAt;
		lastSeenAt =
			!lastSeenAt || detail.lastSeenAt > lastSeenAt
				? detail.lastSeenAt
				: lastSeenAt;
		for (const item of detail.sourceItems) {
			reports.push({
				description: item.original?.description ?? item.description,
				publishedAt: item.publishedAt,
				sourceId: item.sourceId,
				title: item.original?.title ?? item.title,
				url: item.url,
			});
		}
	}
	return { firstSeenAt, lastSeenAt, reports, topicIds: [...topicIds] };
}

// Article text for the reports that have it; extraction may have failed for
// many, in which case the model works from titles and summaries.
async function withExcerpts(reports: Report[]): Promise<Report[]> {
	if (reports.length === 0) {
		return reports;
	}
	const rows = await db
		.select({
			contentText: schema.sourceItem.contentText,
			sourceId: schema.sourceItem.sourceId,
			url: schema.sourceItem.url,
		})
		.from(schema.sourceItem)
		.where(
			or(
				...reports.map((report) =>
					and(
						eq(schema.sourceItem.sourceId, report.sourceId),
						eq(schema.sourceItem.url, report.url)
					)
				)
			)
		);
	const text = new Map(
		rows.map((row) => [`${row.sourceId}\n${row.url}`, row.contentText])
	);
	return reports.map((report) => {
		const body = text.get(`${report.sourceId}\n${report.url}`);
		return body
			? {
					...report,
					excerpt: body.replace(/\s+/g, " ").slice(0, EXCERPT_CHARS),
				}
			: report;
	});
}

// The events that currently hold any of these report URLs; used to refresh
// a page whose original events have been re-clustered or have expired.
export async function eventIdsForUrls(
	urls: readonly string[]
): Promise<string[]> {
	if (urls.length === 0) {
		return [];
	}
	const rows = await db
		.selectDistinct({ eventId: schema.trendEventSourceItem.eventId })
		.from(schema.trendEventSourceItem)
		.where(inArray(schema.trendEventSourceItem.itemId, [...urls]));
	return rows.map((row) => row.eventId);
}

function mergeSources(
	previous: readonly EventPageSource[],
	next: readonly EventPageSource[]
): EventPageSource[] {
	const byUrl = new Map(previous.map((source) => [source.url, source]));
	for (const source of next) {
		byUrl.set(source.url, source);
	}
	return [...byUrl.values()].sort((a, b) =>
		(a.publishedAt ?? "").localeCompare(b.publishedAt ?? "")
	);
}

const GENERATION_ATTEMPTS = 2;

// Asks for the page, and once more with the problem named if the first
// answer was not the JSON asked for.
async function askForPage(
	prompt: string,
	system: string
): Promise<GeneratedPage> {
	const signal = AbortSignal.timeout(GENERATION_TIMEOUT_MS);
	let request = prompt;
	let problem = "";
	for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt += 1) {
		const { text } = await generateText({
			abortSignal: signal,
			model: llmModel("summary"),
			prompt: request,
			providerOptions: llmProviderOptions(),
			system,
		});
		const parsed = parseGeneratedPage(text);
		if ("page" in parsed) {
			return parsed.page;
		}
		problem = parsed.error;
		request = `${prompt}\n\nYour previous answer could not be used (${problem}). Answer again with only the JSON object.`;
	}
	throw new EventPageGenerationError(
		`The model did not return a usable page: ${problem}`
	);
}

export class EventPageGenerationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "EventPageGenerationError";
	}
}

export async function generateRevision(params: {
	eventIds: readonly string[];
	keyword: string;
	/** Reports kept from an earlier revision; a refresh never drops them. */
	previousSources?: readonly EventPageSource[];
}): Promise<EventPageRevision> {
	if (!env.LLM_API_KEY) {
		throw new EventPageGenerationError("The language model is not configured.");
	}
	const gathered = await reportsFromEvents(params.eventIds);
	const fresh = sourcesFromItems(gathered.reports, publisherName);
	const sources = mergeSources(params.previousSources ?? [], fresh);
	if (sources.length === 0) {
		throw new EventPageGenerationError("No reports found for these events.");
	}
	const byUrl = new Map(gathered.reports.map((report) => [report.url, report]));
	const reports = await withExcerpts(
		sources.slice(0, MAX_REPORTS).map(
			(source) =>
				byUrl.get(source.url) ?? {
					publishedAt: source.publishedAt,
					sourceId: source.sourceId,
					title: source.title,
					url: source.url,
				}
		)
	);
	const nameBySourceId = new Map(
		sources.map((source) => [source.sourceId, source.publisherName])
	);
	const { prompt, system } = buildPrompt(
		params.keyword,
		reports,
		(sourceId) => nameBySourceId.get(sourceId) ?? sourceName(sourceId)
	);
	const output = await askForPage(prompt, system);
	const content = Object.fromEntries(
		EVENT_PAGE_LANGS.map((lang) => [lang, toContent(output[lang], reports)])
	) as Record<EventPageLang, EventPageContent>;
	const dates = sources
		.map((source) => source.publishedAt)
		.filter((value): value is string => Boolean(value))
		.sort();
	const now = new Date().toISOString();
	return {
		content,
		eventIds: [...new Set(params.eventIds)],
		firstReportedAt: dates[0] ?? gathered.firstSeenAt ?? now,
		generatedAt: now,
		lastReportedAt: dates.at(-1) ?? gathered.lastSeenAt ?? now,
		sources,
		topicIds: gathered.topicIds,
	};
}
