import { independentSourceCount, sourceFamilyId } from "./event-source-family";

// An event page: a permanent, hand-picked page for one story that several
// publishers covered. Events themselves live seven days and their ids change
// when clustering changes, so a page keeps its own snapshot of the reports
// and the text generated from them. Pages are made in two steps: a draft is
// generated and reviewed, then published. Updates work the same way.

export const EVENT_PAGE_LANGS = ["en", "zh"] as const;
export type EventPageLang = (typeof EVENT_PAGE_LANGS)[number];

export interface EventPageSource {
	publishedAt?: string;
	/** Publisher family id: section feeds of one outlet share it. */
	publisher: string;
	publisherName: string;
	sourceId: string;
	/** The headline as the publisher wrote it. */
	title: string;
	url: string;
}

export interface EventPageTimelineEntry {
	/** ISO date or date-time of the development. */
	date: string;
	/** Reports this entry rests on; each must be one of the page's sources. */
	sourceUrls: string[];
	text: string;
}

export interface EventPageFaq {
	answer: string;
	question: string;
}

export interface EventPageContent {
	/** One line on where the story stands; the meta description. */
	description: string;
	/** How the publishers' accounts differ: who reported first, what each stressed. */
	divergence: string;
	faq: EventPageFaq[];
	/** The page heading. */
	headline: string;
	summary: string;
	timeline: EventPageTimelineEntry[];
	/** The document title, led by the target keyword. */
	title: string;
}

export interface EventPageRevision {
	content: Record<EventPageLang, EventPageContent>;
	eventIds: string[];
	firstReportedAt: string;
	generatedAt: string;
	lastReportedAt: string;
	sources: EventPageSource[];
	topicIds: string[];
}

export interface EventPageDoc {
	createdAt: string;
	/** The revision being reviewed; published by the publish step. */
	draft?: EventPageRevision;
	/** The search phrase the page is written for, e.g. "suno lawsuit". */
	keyword: string;
	/** What readers and crawlers see. Absent until first published. */
	published?: EventPageRevision;
	/** When the page first went public. */
	publishedAt?: string;
	schemaVersion: 1;
	slug: string;
	updatedAt: string;
}

export interface EventPageSummary {
	description: Record<EventPageLang, string>;
	keyword: string;
	publishedAt: string;
	slug: string;
	title: Record<EventPageLang, string>;
	topicIds: string[];
	updatedAt: string;
}

// Two to ten lowercase words, e.g. "sony-umg-sue-suno-v6".
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){1,9}$/;
const SLUG_MAX_LENGTH = 80;
const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const HAN_RE = /\p{Script=Han}/gu;

export const MIN_INDEPENDENT_SOURCES = 3;
const MIN_TIMELINE_ENTRIES = 2;
const MIN_FAQ_ENTRIES = 3;
// The prose a page needs before it is worth indexing: about 600 English
// words, or the Chinese equivalent in characters.
const MIN_WORDS: Record<EventPageLang, number> = { en: 600, zh: 900 };
const TITLE_WARN_LENGTH = 70;
const DESCRIPTION_WARN_LENGTH = 200;

export function isValidSlug(slug: string): boolean {
	return slug.length <= SLUG_MAX_LENGTH && SLUG_RE.test(slug);
}

function countText(text: string, lang: EventPageLang): number {
	if (lang === "zh") {
		return text.match(HAN_RE)?.length ?? 0;
	}
	return text.match(WORD_RE)?.length ?? 0;
}

// The prose of one edition: summary, divergence, FAQ answers and timeline.
export function contentWordCount(
	content: EventPageContent,
	lang: EventPageLang
): number {
	return [
		content.summary,
		content.divergence,
		...content.faq.map((entry) => entry.answer),
		...content.timeline.map((entry) => entry.text),
	].reduce((total, text) => total + countText(text, lang), 0);
}

export interface RevisionCheck {
	/** Anything here blocks publishing. */
	errors: string[];
	/** Worth a look before publishing, but allowed. */
	warnings: string[];
	wordCount: Record<EventPageLang, number>;
}

function checkEdition(
	content: EventPageContent,
	lang: EventPageLang,
	sourceUrls: ReadonlySet<string>,
	keyword: string
): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	if (content.timeline.length < MIN_TIMELINE_ENTRIES) {
		errors.push(`${lang}_timeline`);
	}
	const cited = content.timeline.flatMap((entry) => entry.sourceUrls);
	if (cited.some((url) => !sourceUrls.has(url))) {
		errors.push(`${lang}_timeline_citations`);
	}
	if (contentWordCount(content, lang) < MIN_WORDS[lang]) {
		errors.push(`${lang}_word_count`);
	}
	if (content.faq.length < MIN_FAQ_ENTRIES) {
		errors.push(`${lang}_faq`);
	}
	if (!(content.title.trim() && content.headline.trim())) {
		errors.push(`${lang}_title`);
	}
	if (
		lang === "en" &&
		!content.title.toLowerCase().includes(keyword.toLowerCase())
	) {
		errors.push("en_keyword_in_title");
	}
	if (content.title.length > TITLE_WARN_LENGTH) {
		warnings.push(`${lang}_title_long`);
	}
	if (content.description.length > DESCRIPTION_WARN_LENGTH) {
		warnings.push(`${lang}_description_long`);
	}
	return { errors, warnings };
}

// The publish gate. A page with fewer than three independent publishers, a
// timeline under two entries, thin text, no FAQ, a title without its keyword
// or a citation to a report it does not list is not published.
export function validateRevision(
	revision: EventPageRevision,
	keyword: string
): RevisionCheck {
	const errors: string[] = [];
	const warnings: string[] = [];
	if (independentSourceCount(revision.sources) < MIN_INDEPENDENT_SOURCES) {
		errors.push("independent_sources");
	}
	const sourceUrls = new Set(revision.sources.map((source) => source.url));
	for (const lang of EVENT_PAGE_LANGS) {
		const check = checkEdition(
			revision.content[lang],
			lang,
			sourceUrls,
			keyword
		);
		errors.push(...check.errors);
		warnings.push(...check.warnings);
	}
	return {
		errors,
		warnings,
		wordCount: {
			en: contentWordCount(revision.content.en, "en"),
			zh: contentWordCount(revision.content.zh, "zh"),
		},
	};
}

interface ReportItem {
	publishedAt?: string;
	sourceId: string;
	title: string;
	url: string;
}

// The reports behind a page, one per URL (a story often appears in several
// section feeds of one outlet), each tagged with its publisher.
export function sourcesFromItems(
	items: readonly ReportItem[],
	publisherName: (publisher: string, sourceId: string) => string
): EventPageSource[] {
	const seen = new Set<string>();
	const sources: EventPageSource[] = [];
	for (const item of items) {
		if (seen.has(item.url)) {
			continue;
		}
		seen.add(item.url);
		const publisher = sourceFamilyId(item.sourceId);
		sources.push({
			...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
			publisher,
			publisherName: publisherName(publisher, item.sourceId),
			sourceId: item.sourceId,
			title: item.title,
			url: item.url,
		});
	}
	return sources;
}

export interface CandidateEvent {
	eventId: string;
	sources: ReadonlyArray<{ sourceId: string }>;
	title: string;
}

// Events worth a page: reported by at least three publishers, not already
// behind a page, the most widely reported first.
export function selectCandidates<T extends CandidateEvent>(
	events: readonly T[],
	pagedEventIds: ReadonlySet<string>
): Array<T & { publishers: number }> {
	return events
		.filter((event) => !pagedEventIds.has(event.eventId))
		.map((event) => ({
			...event,
			publishers: independentSourceCount(event.sources),
		}))
		.filter((event) => event.publishers >= MIN_INDEPENDENT_SOURCES)
		.sort((a, b) => b.publishers - a.publishers);
}

// Constant-time comparison for the admin token; an empty token never matches.
// Every byte is compared whatever the earlier ones were, so the time taken
// does not reveal how much of a guess was right.
export function safeTokenEqual(given: string, expected: string): boolean {
	if (!(given && expected)) {
		return false;
	}
	const a = new TextEncoder().encode(given);
	const b = new TextEncoder().encode(expected);
	let same = a.length === b.length;
	for (let index = 0; index < b.length; index += 1) {
		// Evaluated for every byte: no early exit.
		same = a[index] === b[index] && same;
	}
	return same;
}

export function summarizePage(doc: EventPageDoc): EventPageSummary | null {
	const revision = doc.published;
	if (!(revision && doc.publishedAt)) {
		return null;
	}
	return {
		description: {
			en: revision.content.en.description,
			zh: revision.content.zh.description,
		},
		keyword: doc.keyword,
		publishedAt: doc.publishedAt,
		slug: doc.slug,
		title: {
			en: revision.content.en.title,
			zh: revision.content.zh.title,
		},
		topicIds: revision.topicIds,
		updatedAt: revision.generatedAt,
	};
}
