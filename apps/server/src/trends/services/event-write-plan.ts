// Turns the events a rebuild produced and the events stored in D1 into the
// smallest set of writes: unchanged rows are not written again (D1 bills
// every row written), and anything the rebuild no longer produces is deleted,
// including links to topics that no longer exist.

export interface EventRow {
	eventId: string;
	/** Epoch seconds. */
	firstSeenAt: number;
	/** Epoch seconds. */
	lastSeenAt: number;
	primaryItemId: string | null;
	primarySourceId: string | null;
	score: number;
	sourceCount: number;
	summary: string | null;
	title: string;
	topicId: string;
}

export interface TopicLinkRow {
	eventId: string;
	topicId: string;
}

export interface SourceLinkRow {
	eventId: string;
	isPrimary: number;
	itemId: string;
	mergeConfidence: number;
	sourceId: string;
}

export interface EventState {
	events: EventRow[];
	sourceLinks: SourceLinkRow[];
	topicLinks: TopicLinkRow[];
}

export interface EventWritePlan {
	/** Delete every event not in this list (null: nothing to delete). */
	deleteEventsOutside: string[] | null;
	/** Delete these links of kept events (keys from sourceLinkKey). */
	deleteSourceLinkKeys: string[];
	/** Delete links of events not in this list (null: nothing to delete). */
	deleteSourceLinksOutside: string[] | null;
	/** Delete these links of kept events to current topics (topicLinkKey). */
	deleteTopicLinkKeys: string[];
	/** Delete links of events not kept, or to topics that no longer exist. */
	deleteTopicLinksOutside: { eventIds: string[]; topicIds: string[] } | null;
	insertTopicLinks: TopicLinkRow[];
	upsertEvents: EventRow[];
	upsertSourceLinks: SourceLinkRow[];
}

// A separator that cannot appear in source ids, item ids or topic ids.
export const LINK_KEY_SEPARATOR = "\u001f";

export function topicLinkKey(link: TopicLinkRow): string {
	return [link.eventId, link.topicId].join(LINK_KEY_SEPARATOR);
}

export function sourceLinkKey(
	link: Pick<SourceLinkRow, "eventId" | "itemId" | "sourceId">
): string {
	return [link.eventId, link.sourceId, link.itemId].join(LINK_KEY_SEPARATOR);
}

// Stored values that only ever move one way: the highest score an event
// reached and the widest time span it covered.
function mergeWithStored(desired: EventRow, stored: EventRow | undefined) {
	if (!stored) {
		return desired;
	}
	return {
		...desired,
		firstSeenAt: Math.min(desired.firstSeenAt, stored.firstSeenAt),
		lastSeenAt: Math.max(desired.lastSeenAt, stored.lastSeenAt),
		score: Math.max(desired.score, stored.score),
	};
}

function isSameEventRow(a: EventRow, b: EventRow): boolean {
	return (
		a.topicId === b.topicId &&
		a.title === b.title &&
		a.summary === b.summary &&
		a.score === b.score &&
		a.sourceCount === b.sourceCount &&
		a.firstSeenAt === b.firstSeenAt &&
		a.lastSeenAt === b.lastSeenAt &&
		a.primarySourceId === b.primarySourceId &&
		a.primaryItemId === b.primaryItemId
	);
}

function planEvents(desired: EventState, existing: EventState) {
	const storedById = new Map(existing.events.map((row) => [row.eventId, row]));
	const upsertEvents: EventRow[] = [];
	for (const row of desired.events) {
		const stored = storedById.get(row.eventId);
		const merged = mergeWithStored(row, stored);
		if (!(stored && isSameEventRow(merged, stored))) {
			upsertEvents.push(merged);
		}
	}
	return upsertEvents;
}

function planTopicLinks(
	desired: EventState,
	existing: EventState,
	keptEventIds: ReadonlySet<string>,
	currentTopicIds: ReadonlySet<string>
) {
	const desiredKeys = new Set(desired.topicLinks.map(topicLinkKey));
	const existingKeys = new Set(existing.topicLinks.map(topicLinkKey));
	let hasOutsideLinks = false;
	const deleteTopicLinkKeys: string[] = [];
	for (const link of existing.topicLinks) {
		if (
			!(keptEventIds.has(link.eventId) && currentTopicIds.has(link.topicId))
		) {
			hasOutsideLinks = true;
		} else if (!desiredKeys.has(topicLinkKey(link))) {
			deleteTopicLinkKeys.push(topicLinkKey(link));
		}
	}
	return {
		deleteTopicLinkKeys,
		hasOutsideLinks,
		insertTopicLinks: desired.topicLinks.filter(
			(link) => !existingKeys.has(topicLinkKey(link))
		),
	};
}

function planSourceLinks(
	desired: EventState,
	existing: EventState,
	keptEventIds: ReadonlySet<string>
) {
	const desiredByKey = new Map(
		desired.sourceLinks.map((link) => [sourceLinkKey(link), link])
	);
	const existingByKey = new Map(
		existing.sourceLinks.map((link) => [sourceLinkKey(link), link])
	);
	let hasOutsideLinks = false;
	const deleteSourceLinkKeys: string[] = [];
	for (const [key, link] of existingByKey) {
		if (!keptEventIds.has(link.eventId)) {
			hasOutsideLinks = true;
		} else if (!desiredByKey.has(key)) {
			deleteSourceLinkKeys.push(key);
		}
	}
	const upsertSourceLinks = desired.sourceLinks.filter((link) => {
		const stored = existingByKey.get(sourceLinkKey(link));
		return !(
			stored &&
			stored.isPrimary === link.isPrimary &&
			stored.mergeConfidence === link.mergeConfidence
		);
	});
	return { deleteSourceLinkKeys, hasOutsideLinks, upsertSourceLinks };
}

export function planEventWrites(
	desired: EventState,
	existing: EventState,
	currentTopicIds: readonly string[]
): EventWritePlan {
	const keptEventIds = new Set(desired.events.map((row) => row.eventId));
	const keptList = [...keptEventIds];
	const topics = planTopicLinks(
		desired,
		existing,
		keptEventIds,
		new Set(currentTopicIds)
	);
	const sources = planSourceLinks(desired, existing, keptEventIds);
	const removesEvents = existing.events.some(
		(row) => !keptEventIds.has(row.eventId)
	);
	return {
		deleteEventsOutside: removesEvents ? keptList : null,
		deleteSourceLinkKeys: sources.deleteSourceLinkKeys,
		deleteSourceLinksOutside: sources.hasOutsideLinks ? keptList : null,
		deleteTopicLinkKeys: topics.deleteTopicLinkKeys,
		deleteTopicLinksOutside: topics.hasOutsideLinks
			? { eventIds: keptList, topicIds: [...currentTopicIds] }
			: null,
		insertTopicLinks: topics.insertTopicLinks,
		upsertEvents: planEvents(desired, existing),
		upsertSourceLinks: sources.upsertSourceLinks,
	};
}
