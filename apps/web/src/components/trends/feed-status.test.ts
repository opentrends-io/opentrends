import { describe, expect, test } from "bun:test";
import { feedStatus } from "./feed-status";

const ready = {
	isFollowed: true,
	followedCount: 1,
	pending: false,
	failed: false,
	visibleCount: 0,
	allSourcesHidden: false,
};

describe("feed status", () => {
	test("an empty follow list is onboarding, not a blank grid or loading", () => {
		expect(feedStatus({ ...ready, followedCount: 0 })).toBe("unfollowed");
		expect(feedStatus({ ...ready, followedCount: 0, pending: true })).toBe(
			"unfollowed"
		);
	});
	test("loading and failed requests are not empty results", () => {
		expect(feedStatus({ ...ready, pending: true })).toBe("loading");
		expect(feedStatus({ ...ready, failed: true })).toBe("error");
	});
	test("a retry shows loading and can recover into content", () => {
		expect(feedStatus({ ...ready, failed: true, pending: true })).toBe(
			"loading"
		);
		expect(feedStatus({ ...ready, visibleCount: 2 })).toBe("content");
	});
	test("cached content remains visible during refresh or partial failure", () => {
		expect(
			feedStatus({ ...ready, visibleCount: 2, pending: true, failed: true })
		).toBe("content");
	});
	test("hidden sources and genuinely empty content have distinct recovery paths", () => {
		expect(feedStatus({ ...ready, allSourcesHidden: true })).toBe("hidden");
		expect(feedStatus(ready)).toBe("empty");
	});
	test("public topics are not dependent on the user's follow list", () => {
		expect(feedStatus({ ...ready, isFollowed: false, followedCount: 0 })).toBe(
			"empty"
		);
	});
});
