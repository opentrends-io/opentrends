// Article body extraction that runs inside workerd.
//
// jsdom cannot be used here: once bundled for Workers its module init reads
// `__dirname` and a stylesheet from disk, and unenv swaps its `whatwg-url`
// dependency for a stub, so every extraction threw before parsing anything.
// linkedom is a pure-JS DOM that Defuddle supports, and the Markdown step is
// skipped because Turndown's browser build needs a global DOMParser.
import { DefuddleClass } from "defuddle/node";
import { parseHTML } from "linkedom";

export const MIN_ARTICLE_TEXT_LENGTH = 280;
export const MAX_ARTICLE_TEXT_LENGTH = 12_000;

export interface ArticleTextResult {
	status: "ok" | "too_short";
	text: string;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const HIGH_SURROGATE_MIN = 0xd8_00;
const HIGH_SURROGATE_MAX = 0xdb_ff;

const BLOCK_TAGS = new Set([
	"address",
	"article",
	"aside",
	"blockquote",
	"dd",
	"details",
	"div",
	"dl",
	"dt",
	"figcaption",
	"figure",
	"footer",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hr",
	"li",
	"main",
	"ol",
	"p",
	"pre",
	"section",
	"summary",
	"table",
	"tr",
	"ul",
]);
const SKIPPED_TAGS = new Set([
	"audio",
	"button",
	"canvas",
	"iframe",
	"img",
	"noscript",
	"picture",
	"script",
	"select",
	"source",
	"style",
	"svg",
	"template",
	"video",
]);
const CELL_TAGS = new Set(["td", "th"]);
const BODY_TAG = /<body[\s>]/i;

const INLINE_WHITESPACE = /[ \t\f\v\r\n ]+/g;
const SPACE_BEFORE_NEWLINE = /[ \t]+\n/g;
const SPACE_AFTER_NEWLINE = /\n[ \t]+/g;
const EXCESS_NEWLINES = /\n{3,}/g;
// A list item whose first child is a block (<li><p>…) would otherwise leave
// its bullet on a line of its own.
const DETACHED_BULLET = /(^|\n)- *\n+/g;

interface DomNode {
	childNodes: ArrayLike<DomNode>;
	localName?: string;
	nodeType: number;
	textContent: string | null;
}

interface TextBuffer {
	parts: string[];
}

function breakBlock(buffer: TextBuffer): void {
	buffer.parts.push("\n\n");
}

function appendElement(element: DomNode, buffer: TextBuffer): void {
	const tag = element.localName ?? "";
	if (SKIPPED_TAGS.has(tag)) {
		return;
	}
	if (tag === "br") {
		buffer.parts.push("\n");
		return;
	}
	const isBlock = BLOCK_TAGS.has(tag);
	if (isBlock) {
		breakBlock(buffer);
	}
	if (tag === "li") {
		buffer.parts.push("- ");
	}
	if (tag === "pre") {
		buffer.parts.push(element.textContent ?? "");
	} else {
		appendChildren(element, buffer);
	}
	if (CELL_TAGS.has(tag)) {
		buffer.parts.push(" ");
	}
	if (isBlock) {
		breakBlock(buffer);
	}
}

function appendChildren(node: DomNode, buffer: TextBuffer): void {
	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === TEXT_NODE) {
			buffer.parts.push(
				(child.textContent ?? "").replace(INLINE_WHITESPACE, " ")
			);
		} else if (child.nodeType === ELEMENT_NODE) {
			appendElement(child, buffer);
		}
	}
}

function normalizeText(raw: string): string {
	return raw
		.replace(SPACE_BEFORE_NEWLINE, "\n")
		.replace(SPACE_AFTER_NEWLINE, "\n")
		.replace(EXCESS_NEWLINES, "\n\n")
		.replace(DETACHED_BULLET, "$1- ")
		.trim();
}

/**
 * Cuts text to at most `maxLength` UTF-16 units without leaving half of a
 * surrogate pair at the end.
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	const cut = text.slice(0, maxLength);
	const last = cut.charCodeAt(cut.length - 1);
	const endsInsidePair =
		last >= HIGH_SURROGATE_MIN && last <= HIGH_SURROGATE_MAX;
	return (endsInsidePair ? cut.slice(0, -1) : cut).trimEnd();
}

/**
 * Flattens an HTML fragment into readable plain text: one blank line between
 * blocks, "- " before list items, entities decoded, and no markup left over.
 */
export function htmlToPlainText(html: string): string {
	const { document } = parseHTML(
		`<!doctype html><html><body>${html}</body></html>`
	);
	const body = document.body as unknown as DomNode | null;
	if (!body) {
		return "";
	}
	const buffer: TextBuffer = { parts: [] };
	appendChildren(body, buffer);
	return normalizeText(buffer.parts.join(""));
}

function parseDocument(html: string, url: string) {
	let { document } = parseHTML(html);
	// linkedom only builds <html>/<body> when the markup has them; an empty
	// body or a bare fragment would otherwise crash Defuddle's body lookup.
	if (document.documentElement?.localName !== "html") {
		const wrapped = BODY_TAG.test(html)
			? `<!doctype html><html>${html}</html>`
			: `<!doctype html><html><body>${html}</body></html>`;
		({ document } = parseHTML(wrapped));
	}
	// The same shims defuddle's own linkedom helper applies: Defuddle reads
	// stylesheets and computed styles, which linkedom does not implement.
	const shimmed = document as unknown as {
		defaultView?: { getComputedStyle?: unknown } | null;
		styleSheets?: unknown[];
		URL: string;
	};
	shimmed.styleSheets ??= [];
	if (shimmed.defaultView && !shimmed.defaultView.getComputedStyle) {
		shimmed.defaultView.getComputedStyle = () => ({ display: "" });
	}
	shimmed.URL = url;
	return document;
}

/**
 * Extracts the readable body of an article page as bounded plain text.
 * Never touches the network: Defuddle's async extractors stay disabled.
 */
export function extractArticleText(
	html: string,
	url: string
): ArticleTextResult {
	const document = parseDocument(html, url);
	const result = new DefuddleClass(document as never, {
		url,
		useAsync: false,
	}).parse();
	const text = truncateText(
		htmlToPlainText(result.content ?? ""),
		MAX_ARTICLE_TEXT_LENGTH
	);
	return {
		status: text.length >= MIN_ARTICLE_TEXT_LENGTH ? "ok" : "too_short",
		text,
	};
}
