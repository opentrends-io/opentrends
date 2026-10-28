import type { EventFeedData, EventFeedItem } from "./types";

// Only an exact original and target language can reuse a translated result.
// A storage outage may return the original, but cannot erase a valid pair.
export function retainEventTranslations(
	previous: readonly EventFeedItem[],
	next: EventFeedItem[],
	locale: string
): EventFeedItem[] {
	const byId = new Map(previous.map((item) => [item.eventId, item]));
	return next.map((item) => {
		const old = byId.get(item.eventId);
		const original = item.original ?? item;
		if (
			!old?.original ||
			old.translation?.language !== locale ||
			old.original.title !== original.title ||
			old.original.summary !== original.summary ||
			(item.original &&
				(item.translation?.updatedAt ?? 0) >= (old.translation?.updatedAt ?? 0))
		) {
			return item;
		}
		return {
			...item,
			title: old.title,
			summary: old.summary,
			original: old.original,
			translation: old.translation,
		};
	});
}
export function retainEventFeed(
	previous: unknown,
	next: EventFeedData,
	locale: string
): EventFeedData {
	const old = previous as EventFeedData | undefined;
	return {
		...next,
		events: retainEventTranslations(old?.events ?? [], next.events, locale),
	};
}
