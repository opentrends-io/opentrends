import { sourceFamilyId } from "./event-source-family";

// How much a story is being reported right now. Every publisher counts
// once, at its latest report on the story, and that report's weight halves
// every day, so a story rises when another publisher follows it up and sinks
// when nobody does. Section feeds of one publisher are one publisher.
export const EVENT_HEAT_HALF_LIFE_MS = 24 * 60 * 60_000;

export interface EventReport {
	sourceId: string;
	/** Publication time (or first fetch) in epoch milliseconds. */
	time: number;
}

export interface EventPublisher {
	firstAt: number;
	/** Publisher (source family) id. */
	id: string;
	latestAt: number;
	/** The first of the publisher's feeds that reported the story. */
	sourceId: string;
}

const SECTION_SEPARATOR = " · ";

export function eventHeat(
	reports: readonly EventReport[],
	now: number
): { heat: number; publishers: EventPublisher[] } {
	const byPublisher = new Map<string, EventPublisher>();
	for (const report of [...reports].sort((a, b) => a.time - b.time)) {
		const time = Math.min(report.time, now);
		const id = sourceFamilyId(report.sourceId);
		const known = byPublisher.get(id);
		byPublisher.set(
			id,
			known
				? { ...known, latestAt: Math.max(known.latestAt, time) }
				: { firstAt: time, id, latestAt: time, sourceId: report.sourceId }
		);
	}
	const publishers = [...byPublisher.values()].sort(
		(a, b) => a.firstAt - b.firstAt
	);
	let heat = 0;
	for (const publisher of publishers) {
		heat += 0.5 ** ((now - publisher.latestAt) / EVENT_HEAT_HALF_LIFE_MS);
	}
	return { heat, publishers };
}

// "TechCrunch · AI" names a section; readers know the publisher.
export function publisherName(sourceName: string): string {
	const index = sourceName.indexOf(SECTION_SEPARATOR);
	return index > 0 ? sourceName.slice(0, index) : sourceName;
}
