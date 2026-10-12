// When two reports belong to one event. The similarity thresholds are
// calibrated for 1024-dimension Qwen/Qwen3-VL-Embedding-8B vectors of the text
// that buildCanonicalEmbeddingText() produces (metadata first, then title and
// description). On 2026-09-28 production items, reports of one story from two
// publishers scored 0.47-0.81, while 99% of unrelated cross-publisher pairs
// inside the 72 h window scored below 0.42 (max 0.59). The closer a pair is to
// that overlap, the more shared keywords it needs. Changing the model, the
// dimensions or the embedding text means measuring these again.
export const EVENT_SIMILARITY_THRESHOLD = 0.5;
export const EVENT_RELATED_SIMILARITY_THRESHOLD = 0.46;
export const EVENT_STRONG_SIMILARITY_THRESHOLD = 0.62;

// A report can join an event through one of its later reports, not only
// its first, but only on a strong match, and only when the first report is
// not unrelated: middling matches through members (0.50-0.55) joined
// different stories as often as the same one on 2026-09-29 data.
export const EVENT_MEMBER_ANCHOR_FLOOR = 0.4;
// Two events a report matches are one story when their first reports are
// this close, share this many keywords and came out within two days.
export const EVENT_BRIDGE_ANCHOR_SIMILARITY = 0.45;
export const EVENT_BRIDGE_MIN_KEYWORDS = 3;
export const EVENT_BRIDGE_MAX_GAP_MS = 48 * 60 * 60_000;

const EVENT_MIN_KEYWORD_MATCHES = 3;
const EVENT_RELATED_MIN_KEYWORD_MATCHES = 5;

const KEYWORD_TOKEN_RE = /[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu;
const HAN_TEXT_RE = /\p{Script=Han}{2,}/gu;
const MAX_WORD_KEYWORDS = 28;
const MAX_KEYWORDS = 80;

// Function words say nothing about which story a report covers; two reports
// that only share "you", "can" and "your" are not about the same thing.
const KEYWORD_STOP_WORDS = new Set([
	"about",
	"after",
	"all",
	"also",
	"and",
	"any",
	"are",
	"been",
	"being",
	"but",
	"can",
	"could",
	"did",
	"does",
	"each",
	"for",
	"from",
	"get",
	"gets",
	"got",
	"had",
	"has",
	"have",
	"her",
	"here",
	"his",
	"how",
	"into",
	"its",
	"just",
	"like",
	"may",
	"might",
	"more",
	"most",
	"much",
	"new",
	"news",
	"not",
	"now",
	"one",
	"only",
	"our",
	"out",
	"over",
	"should",
	"some",
	"than",
	"that",
	"the",
	"their",
	"them",
	"then",
	"there",
	"these",
	"they",
	"this",
	"those",
	"too",
	"very",
	"via",
	"was",
	"were",
	"what",
	"when",
	"where",
	"which",
	"while",
	"who",
	"why",
	"will",
	"with",
	"would",
	"you",
	"your",
]);

export interface EventMergeSignal {
	keywordMatches: number;
	similarity: number;
}

export function keywordsForText(text: string): Set<string> {
	const words = text.toLowerCase().match(KEYWORD_TOKEN_RE) ?? [];
	const keywords = new Set(
		words
			.filter((word) => !KEYWORD_STOP_WORDS.has(word))
			.slice(0, MAX_WORD_KEYWORDS)
	);
	const hanChunks = text.match(HAN_TEXT_RE) ?? [];
	for (const chunk of hanChunks) {
		for (let index = 0; index < chunk.length - 1; index += 1) {
			keywords.add(chunk.slice(index, index + 2));
			if (keywords.size >= MAX_KEYWORDS) {
				return keywords;
			}
		}
	}
	return keywords;
}

export function keywordOverlapCount(
	a: ReadonlySet<string>,
	b: ReadonlySet<string>
): number {
	let count = 0;
	for (const word of a) {
		if (b.has(word)) {
			count += 1;
		}
	}
	return count;
}

export function isSameEventSignal({
	keywordMatches,
	similarity,
}: EventMergeSignal): boolean {
	if (similarity >= EVENT_STRONG_SIMILARITY_THRESHOLD) {
		return keywordMatches >= 1;
	}
	if (similarity >= EVENT_SIMILARITY_THRESHOLD) {
		return keywordMatches >= EVENT_MIN_KEYWORD_MATCHES;
	}
	return (
		similarity >= EVENT_RELATED_SIMILARITY_THRESHOLD &&
		keywordMatches >= EVENT_RELATED_MIN_KEYWORD_MATCHES
	);
}

export function isStrongEventSignal({
	keywordMatches,
	similarity,
}: EventMergeSignal): boolean {
	return similarity >= EVENT_STRONG_SIMILARITY_THRESHOLD && keywordMatches >= 1;
}
