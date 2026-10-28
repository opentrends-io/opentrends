import { expect, test } from "bun:test";
import { retainEventTranslations } from "./retain-event-translations";
import type { EventFeedItem } from "./types";

const raw = {
	eventId: "1",
	title: "Original",
	summary: "Details",
} as EventFeedItem;
const cached = {
	...raw,
	title: "译文",
	summary: "详情",
	original: { title: raw.title, summary: raw.summary },
	translation: {
		state: "ready" as const,
		language: "zh" as const,
		textHash: "a",
		checkedAt: 1,
		updatedAt: 200,
	},
};
test("event cache preserves exact newer translations but cannot cross language or original versions", () => {
	expect(retainEventTranslations([cached], [raw], "zh")[0]?.title).toBe("译文");
	expect(retainEventTranslations([cached], [raw], "en")[0]?.title).toBe(
		"Original"
	);
	expect(
		retainEventTranslations([cached], [{ ...raw, summary: "Changed" }], "zh")[0]
			?.title
	).toBe("Original");
	const late = {
		...cached,
		title: "旧译文",
		translation: { ...cached.translation, updatedAt: 100 },
	};
	expect(retainEventTranslations([cached], [late], "zh")[0]?.title).toBe(
		"译文"
	);
	const newer = {
		...late,
		translation: { ...late.translation, updatedAt: 300 },
	};
	expect(retainEventTranslations([cached], [newer], "zh")[0]?.title).toBe(
		"旧译文"
	);
});
