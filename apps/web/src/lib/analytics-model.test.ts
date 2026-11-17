import { describe, expect, test } from "bun:test";
import {
	analyticsPage,
	sanitizeEvent,
	trackingAllowed,
} from "./analytics-model";

describe("analytics privacy contract", () => {
	test("keeps public topics but discards queries, hashes and dynamic identifiers", () => {
		expect(
			analyticsPage("https://opentrends.io/zh/trends/ai?email=private#secret")
		).toEqual({
			page_path: "/zh/trends/ai",
			page_group: "trends",
			topic: "ai",
			language: "zh",
		});
		expect(
			analyticsPage("https://opentrends.io/zh/events/private-slug?token=secret")
				.page_path
		).toBe("/zh/events/detail");
		expect(
			analyticsPage("https://opentrends.io/zh/briefings?id=secret").page_path
		).toBe("/zh/briefings");
		expect(
			analyticsPage("https://opentrends.io/zh/feed?topic=hardware&q=private")
				.topic
		).toBe("hardware");
		expect(analyticsPage("https://opentrends.io/zh/trends/private").topic).toBe(
			"none"
		);
		expect(
			analyticsPage("https://opentrends.io/zh/trends/ai/2026-11-11").page_path
		).toBe("/zh/trends/ai/day");
	});
	test("rejects unknown events and arbitrary payload values, including extra fields", () => {
		expect(
			sanitizeEvent("summary_expand", { email: "private", value: "secret" })
		).toEqual({});
		expect(sanitizeEvent("email@private", {})).toBeNull();
		expect(
			sanitizeEvent("layout_change", { value: "flow", topic: "secret" })
		).toEqual({ action: "flow" });
		expect(
			sanitizeEvent("search_result", { value: "headline", query: "private" })
		).toEqual({ action: "headline" });
	});
	test("honors privacy signals and treats unreadable choice as denied", () => {
		for (const value of ["denied", { value: "denied" }, { status: "denied" }]) {
			expect(trackingAllowed({ choice: JSON.stringify(value) })).toBe(false);
		}
		expect(trackingAllowed({ dnt: "1" })).toBe(false);
		expect(trackingAllowed({ gpc: true })).toBe(false);
		expect(trackingAllowed({ choice: "{" })).toBe(false);
		expect(trackingAllowed({ storageUnavailable: true })).toBe(false);
		expect(trackingAllowed({})).toBe(true);
	});
});
