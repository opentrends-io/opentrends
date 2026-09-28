import { describe, expect, it } from "bun:test";

import { isPromotionalItem } from "../services/event-promotions";
import { normalizeEventText } from "../services/event-text";

function promotional(sourceId: string, title: string, description = "") {
	return isPromotionalItem({ description, sourceId, title });
}

describe("promotional posts", () => {
	it("recognises a publisher selling its own conference", () => {
		expect(
			promotional(
				"techcrunch-robotics",
				"Two days left to save up to $200 on a pass, reason 4 of 5 to attend"
			)
		).toBe(true);
		expect(
			promotional(
				"techcrunch",
				"A film star is coming to TechCrunch Disrupt 2026"
			)
		).toBe(true);
		expect(
			promotional(
				"techcrunch-robotics",
				"Prices go up in 7 days, get your Disrupt ticket now"
			)
		).toBe(true);
		expect(
			promotional(
				"techcrunch-robotics",
				"One last chance to showcase your startup",
				"Book your exhibit table by September 30."
			)
		).toBe(true);
	});

	it("recognises sponsored articles and shopping posts", () => {
		expect(
			promotional(
				"ieee-robotics",
				"Rethinking robot safety",
				"This article is brought to you by a robot maker."
			)
		).toBe(true);
		expect(promotional("wired", "Running shoe discount code: 15% off")).toBe(
			true
		);
		expect(
			promotional("toms-hardware", "Grab this gaming laptop for $1000 off")
		).toBe(true);
		expect(
			promotional(
				"the-verge-gadgets",
				"This prebuilt gaming PC is a very good deal"
			)
		).toBe(true);
		expect(promotional("wired", "The best early Prime Day deals")).toBe(true);
	});

	it("keeps news, including news about deals and other companies' events", () => {
		expect(
			promotional(
				"techcrunch",
				"Anthropic to pay Akamai $11.6 billion in cloud deal"
			)
		).toBe(false);
		expect(promotional("the-verge", "The new phone goes on sale Friday")).toBe(
			false
		);
		expect(
			promotional(
				"engadget-robotics",
				"Dyson unveiled at IFA 2026: live updates"
			)
		).toBe(false);
		expect(
			promotional(
				"techcrunch",
				"TechCrunch Mobility: AV companies pick their lanes"
			)
		).toBe(false);
	});
});

describe("event text", () => {
	it("decodes entities and drops invisible characters", () => {
		expect(normalizeEventText("Google&#8217;s  AI &amp; you")).toBe(
			"Google’s AI & you"
		);
		const invisible = String.fromCodePoint(0x20_61, 0x20_0b);
		const joiner = String.fromCodePoint(0x20_0d);
		const bom = String.fromCodePoint(0xfe_ff);
		expect(
			normalizeEventText(`${invisible}Just${joiner} Now: news${bom}`)
		).toBe("Just Now: news");
		expect(normalizeEventText("Broken &#99999999; entity")).toBe(
			"Broken entity"
		);
		expect(normalizeEventText(null)).toBe("");
	});
});
