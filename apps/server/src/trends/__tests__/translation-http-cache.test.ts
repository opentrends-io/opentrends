import { expect, test } from "bun:test";
import {
	isTranslationPagePath,
	TRANSLATION_PAGE_CACHE_CONTROL,
} from "../services/translation-http-cache";

test("translation pages bypass old edge responses while archive and digest caches remain", () => {
	for (const path of [
		"/api/trends",
		"/api/trends/",
		"/api/trends/featured",
		"/api/trends/mine",
		"/api/trends/ai/sources/openai-news",
	]) {
		expect(isTranslationPagePath(path)).toBe(true);
	}
	for (const path of [
		"/api/trends/ai/summary",
		"/api/trends/ai/digest",
		"/api/trends/ai/digest-days",
		"/api/trends/ai/summary.xml",
	]) {
		expect(isTranslationPagePath(path)).toBe(false);
	}
	// Cloudflare's browser TTL must not extend a mutable translation response.
	// no-cache/max-age=0 is insufficient for old CDN/browser cache rules.
	expect(TRANSLATION_PAGE_CACHE_CONTROL).toBe("no-store");
});
