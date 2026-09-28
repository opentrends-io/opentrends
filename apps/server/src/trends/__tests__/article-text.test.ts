import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	extractArticleText,
	htmlToPlainText,
	MAX_ARTICLE_TEXT_LENGTH,
	MIN_ARTICLE_TEXT_LENGTH,
	truncateText,
} from "../services/article-text";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");
const ARTICLE_URL = "https://news.example.com/2026/09/27/electric-ferries";
const MARKUP = /<\/?[a-z][^>]*>/i;
const BLANK_RUN = /\n{3,}/;

function readFixture(name: string): Promise<string> {
	return readFile(resolve(fixtureDir, name), "utf8");
}

describe("extractArticleText", () => {
	test("keeps the article body and drops page chrome", async () => {
		const result = extractArticleText(
			await readFixture("article-page.html"),
			ARTICLE_URL
		);

		expect(result.status).toBe("ok");
		expect(result.text).toContain(
			"The harbor authority replaced two diesel ferries"
		);
		expect(result.text).toContain("Neighbouring ports are watching closely.");
		expect(result.text).toContain("What riders will notice");
		for (const chrome of [
			"Newsletters",
			"Related stories",
			"Get the morning briefing",
			"All rights reserved",
			"Script payload",
			"font-family",
		]) {
			expect(result.text).not.toContain(chrome);
		}
	});

	test("returns plain text, not HTML or a Markdown error dump", async () => {
		const { text } = extractArticleText(
			await readFixture("article-page.html"),
			ARTICLE_URL
		);

		expect(text).not.toMatch(MARKUP);
		expect(text).not.toContain("Partial conversion");
		expect(text).toContain("quieter on deck & noticeably smoother");
		expect(text).toContain("during the trial.");
		expect(text).toContain("won’t buy another diesel hull");
		expect(text).toContain(
			"- Crossings still leave every twenty minutes at peak hours."
		);
		expect(text).not.toMatch(BLANK_RUN);
	});

	test("marks a paywall teaser as too short", async () => {
		const result = extractArticleText(
			await readFixture("article-teaser.html"),
			ARTICLE_URL
		);

		expect(result.status).toBe("too_short");
		expect(result.text.length).toBeLessThan(MIN_ARTICLE_TEXT_LENGTH);
		expect(result.text).toContain("pushed back its expansion");
	});

	test("bounds very long articles", () => {
		const paragraph =
			"<p>Long reporting keeps going with detail after detail about the story. </p>";
		const html = `<html><body><article><h1>Long read</h1>${paragraph.repeat(
			600
		)}</article></body></html>`;

		const result = extractArticleText(html, ARTICLE_URL);

		expect(result.status).toBe("ok");
		expect(result.text.length).toBeLessThanOrEqual(MAX_ARTICLE_TEXT_LENGTH);
		expect(result.text.length).toBeGreaterThan(MAX_ARTICLE_TEXT_LENGTH - 100);
	});

	test("copes with empty and bodiless responses", () => {
		for (const html of ["", "   ", "<!-- nothing here -->", "plain words"]) {
			expect(extractArticleText(html, ARTICLE_URL).status).toBe("too_short");
		}
	});

	test("reads markup that lacks <html> and <body>", () => {
		const sentence = "A bare fragment still carries a readable story body. ";
		const result = extractArticleText(
			`<article><h1>Fragment</h1><p>${sentence.repeat(8)}</p></article>`,
			ARTICLE_URL
		);

		expect(result.status).toBe("ok");
		expect(result.text).toContain("A bare fragment still carries");
	});
});

describe("htmlToPlainText", () => {
	test("separates blocks and keeps line breaks", () => {
		expect(
			htmlToPlainText("<h2>Title</h2><p>One<br>Two</p><div>Three</div>")
		).toBe("Title\n\nOne\nTwo\n\nThree");
	});

	test("skips media, scripts and controls", () => {
		expect(
			htmlToPlainText(
				'<p>Kept</p><script>var x = 1;</script><style>p{}</style><svg><text>icon</text></svg><button>Share</button><img alt="photo">'
			)
		).toBe("Kept");
	});

	test("decodes entities and collapses inline whitespace", () => {
		expect(
			htmlToPlainText("<p>Fish &amp;\n   chips&nbsp;&mdash; &#169;</p>")
		).toBe("Fish & chips — ©");
	});

	test("keeps list bullets next to their text", () => {
		expect(
			htmlToPlainText("<ul><li><p>First</p></li><li>Second</li></ul>")
		).toBe("- First\n\n- Second");
	});
});

describe("truncateText", () => {
	test("leaves short text alone", () => {
		expect(truncateText("short", 10)).toBe("short");
	});

	test("never splits a surrogate pair", () => {
		const text = `ab${"😀".repeat(3)}`;
		const cut = truncateText(text, 3);

		expect(cut).toBe("ab");
		expect(truncateText(text, 4)).toBe("ab😀");
	});
});
