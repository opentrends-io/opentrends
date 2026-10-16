import { afterEach, expect, test } from "bun:test";
import { createRssAdapter } from "../adapters/rss";
import {
	decodeEntities,
	extractImageFromHtml,
	normalizeFeedImageUrl,
} from "../adapters/shared";

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

test("HTML image attributes decode numeric and named ampersands before use", () => {
	expect(
		extractImageFromHtml(
			'<img src="https://cdn.example.com/image?w=320&#038;h=200&amp;fit=crop">'
		)
	).toBe("https://cdn.example.com/image?w=320&h=200&fit=crop");
	expect(
		extractImageFromHtml('<img src="javascript:alert(1)">')
	).toBeUndefined();
});

test("unknown entities survive decoding and unsafe image schemes remain rejected", () => {
	expect(decodeEntities("R&D &unknown; &#8217; &#x2014;")).toBe(
		"R&D &unknown; ’ —"
	);
	expect(normalizeFeedImageUrl("javascript&#58;alert(1)")).toBeUndefined();
});

test("RSS decodes CDATA titles and each image carrier at the ingestion boundary", async () => {
	for (const image of [
		'<enclosure type="image/jpeg" url="https://cdn.example.com/a?w=320&amp;#038;h=200"/>',
		'<media:thumbnail url="https://cdn.example.com/a?w=320&amp;#038;h=200"/>',
		'<description><![CDATA[<img src="https://cdn.example.com/a?w=320&#038;h=200">]]></description>',
	]) {
		globalThis.fetch = (async () =>
			new Response(
				`<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title><![CDATA[Barnes &#038; Noble: Apple&#8217;s]]></title><link>https://example.com/story</link>${image}</item></channel></rss>`
			)) as typeof fetch;
		const adapter = createRssAdapter({
			provider: "rss",
			name: "Example",
			feedUrl: "https://example.com/feed",
			refresh: "rss",
		});
		const items = await adapter.fetch({
			sourceId: "test",
			signal: new AbortController().signal,
		});
		expect(items[0]?.title).toBe("Barnes & Noble: Apple’s");
		expect(items[0]?.imageUrl).toBe("https://cdn.example.com/a?w=320&h=200");
	}
});
