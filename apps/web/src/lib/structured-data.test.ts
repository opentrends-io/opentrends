import { describe, expect, it } from "bun:test";

import {
	breadcrumbList,
	digestItemList,
	faqPage,
	newsArticle,
} from "./structured-data";

function parse(script: { children: string }): Record<string, unknown> {
	return JSON.parse(script.children) as Record<string, unknown>;
}

describe("structured data", () => {
	it("numbers breadcrumbs from one", () => {
		const script = breadcrumbList([
			{ name: "OpenTrends", url: "https://opentrends.io/zh" },
			{ name: "AI", url: "https://opentrends.io/zh/trends/ai" },
		]);
		expect(script.type).toBe("application/ld+json");
		expect(parse(script)).toEqual({
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					item: "https://opentrends.io/zh",
					name: "OpenTrends",
					position: 1,
				},
				{
					"@type": "ListItem",
					item: "https://opentrends.io/zh/trends/ai",
					name: "AI",
					position: 2,
				},
			],
		});
	});

	it("lists digest lines with their first citation", () => {
		const script = digestItemList({
			entries: [
				{ citations: [{ url: "https://a.test/1" }], takeaway: "One" },
				{ citations: [], takeaway: "Two" },
			],
			name: "AI digest",
			url: "https://opentrends.io/trends/ai",
		});
		const data = parse(script as { children: string });
		expect(data.numberOfItems).toBe(2);
		expect(data.itemListElement).toEqual([
			{
				"@type": "ListItem",
				name: "One",
				position: 1,
				url: "https://a.test/1",
			},
			{ "@type": "ListItem", name: "Two", position: 2 },
		]);
	});

	it("has no list for an empty digest", () => {
		expect(digestItemList({ entries: [], name: "x", url: "y" })).toBeNull();
	});

	it("cannot close the script tag it is written into", () => {
		const script = digestItemList({
			entries: [{ citations: [], takeaway: "</script><img src=x>" }],
			name: "x",
			url: "y",
		});
		expect(script?.children).not.toContain("</script>");
		expect(script?.children).not.toContain("<");
		expect(
			(
				parse(script as { children: string }).itemListElement as {
					name: string;
				}[]
			)[0]?.name
		).toBe("</script><img src=x>");
	});
});

describe("event page structured data", () => {
	it("describes the page as a news article by OpenTrends citing its reports", () => {
		const data = parse(
			newsArticle({
				citations: ["https://a.test/1"],
				dateModified: "2026-09-28T10:00:00.000Z",
				datePublished: "2026-09-27T10:00:00.000Z",
				description: "d",
				headline: "Suno lawsuit: labels sue again",
				inLanguage: "en",
				url: "https://opentrends.io/events/suno-lawsuit",
			})
		);
		expect(data["@type"]).toBe("NewsArticle");
		expect(data.headline).toBe("Suno lawsuit: labels sue again");
		expect(data.datePublished).toBe("2026-09-27T10:00:00.000Z");
		expect(data.mainEntityOfPage).toBe(
			"https://opentrends.io/events/suno-lawsuit"
		);
		expect((data.publisher as { name: string }).name).toBe("OpenTrends");
		expect(data.citation).toEqual(["https://a.test/1"]);
	});

	it("lists questions and answers, escaping markup", () => {
		const script = faqPage([{ answer: "No </script>", question: "Is it?" }]);
		expect(script?.children).not.toContain("<");
		expect(parse(script as { children: string }).mainEntity).toEqual([
			{
				"@type": "Question",
				acceptedAnswer: { "@type": "Answer", text: "No </script>" },
				name: "Is it?",
			},
		]);
		expect(faqPage([])).toBeNull();
	});
});
