import { describe, expect, it } from "bun:test";

import { getEventEligibleSourceIds, getSourcePreset } from "../config/sources";
import {
	independentSourceCount,
	sourceFamilyId,
} from "../services/event-source-family";

const LEADING_WWW_RE = /^www\./;

describe("event source families", () => {
	it("counts section feeds of one publisher as one source", () => {
		expect(
			independentSourceCount([
				{ sourceId: "the-verge" },
				{ sourceId: "the-verge-ai" },
				{ sourceId: "the-verge-gadgets" },
			])
		).toBe(1);
		expect(
			independentSourceCount([
				{ sourceId: "techcrunch" },
				{ sourceId: "techcrunch-ai" },
				{ sourceId: "techcrunch-robotics" },
			])
		).toBe(1);
		expect(
			independentSourceCount([
				{ sourceId: "wired" },
				{ sourceId: "wired-science" },
			])
		).toBe(1);
	});

	it("counts different publishers separately", () => {
		expect(
			independentSourceCount([
				{ sourceId: "the-verge" },
				{ sourceId: "techcrunch-ai" },
				{ sourceId: "the-decoder" },
			])
		).toBe(3);
	});

	it("keeps existing families for non-event sources", () => {
		expect(sourceFamilyId("hackernews-show")).toBe("hackernews");
		expect(sourceFamilyId("github-trending-daily")).toBe("github-trending");
		expect(sourceFamilyId("arxiv-robotics")).toBe("arxiv-robotics");
	});

	it("groups event sources exactly by the site they come from", () => {
		const sourceIds = getEventEligibleSourceIds();
		const siteOf = (sourceId: string) => {
			const preset = getSourcePreset(sourceId);
			const homeUrl = preset && "homeUrl" in preset ? preset.homeUrl : "";
			return new URL(homeUrl ?? "").hostname.replace(LEADING_WWW_RE, "");
		};
		for (const a of sourceIds) {
			for (const b of sourceIds) {
				expect({
					a,
					b,
					sameFamily: sourceFamilyId(a) === sourceFamilyId(b),
				}).toEqual({ a, b, sameFamily: siteOf(a) === siteOf(b) });
			}
		}
	});
});
