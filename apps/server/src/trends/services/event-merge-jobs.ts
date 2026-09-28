import { getWorkerBindings } from "../../runtime";
import { isEventEligibleSource } from "../config/sources";
import { getTopicPreset, topicPresets } from "../config/topics";
import type { SourceId, TopicId } from "../types";
import type { EventSourceItemRef } from "./event-content-enrichment";
import { rebuildTopicEvents } from "./event-feed";
import {
	spareContentCapacity,
	takeEventContentBatch,
} from "./event-work-budget";

export interface EventSourceRefreshMessage {
	items: EventSourceItemRef[];
	sourceId: SourceId;
}

export type EventMergeMessage =
	| (EventSourceRefreshMessage & { task?: "enrich-source-items" })
	| { task: "rebuild-topic"; topicId: TopicId };

function getTopicsForSource(sourceId: SourceId): TopicId[] {
	const topicIds: TopicId[] = [];
	for (const [topicId, topic] of Object.entries(topicPresets)) {
		if (
			getTopicPreset(topicId) &&
			topic.sections.some((section) =>
				(section.sourceIds as readonly string[]).includes(sourceId)
			)
		) {
			topicIds.push(topicId as TopicId);
		}
	}
	return topicIds;
}

export async function runEventMergeJob(
	message: EventMergeMessage
): Promise<void> {
	if (message.task === "rebuild-topic") {
		const complete = await rebuildTopicEvents(message.topicId);
		if (!complete) {
			await scheduleOrRun({ task: "rebuild-topic", topicId: message.topicId });
		}
		return;
	}
	if (!isEventEligibleSource(message.sourceId)) {
		return;
	}
	const { enrichEventSourceItems } = await import("./event-content-enrichment");
	const itemBatch = takeEventContentBatch(message.items);
	await enrichEventSourceItems(itemBatch.current);
	if (itemBatch.remaining.length > 0) {
		await scheduleOrRun({
			items: itemBatch.remaining,
			sourceId: message.sourceId,
			task: "enrich-source-items",
		});
		return;
	}
	await retryLegacyFailures(message.sourceId, itemBatch.current.length);
	for (const topicId of getTopicsForSource(message.sourceId)) {
		await scheduleOrRun({ task: "rebuild-topic", topicId });
	}
}

// The last batch of a source's content work lends its spare room to rows
// that failed under the old extractor, before the topic rebuild reads them.
async function retryLegacyFailures(
	sourceId: SourceId,
	currentCount: number
): Promise<void> {
	const spare = spareContentCapacity(currentCount);
	if (spare === 0) {
		return;
	}
	try {
		const { retryLegacyContentFailures } = await import(
			"./event-content-retry"
		);
		await retryLegacyContentFailures(sourceId, spare);
	} catch (error) {
		console.warn("[event-merge] legacy content retry failed", error);
	}
}

async function sendToCloudflareQueue(
	message: EventMergeMessage
): Promise<boolean> {
	const queue = getWorkerBindings()?.EVENT_MERGE_QUEUE;
	if (!queue) {
		return false;
	}
	await queue.send({ kind: "event-merge", payload: message });
	return true;
}

async function scheduleOrRun(message: EventMergeMessage): Promise<void> {
	if (await sendToCloudflareQueue(message)) {
		return;
	}
	await runEventMergeJob(message);
}

export async function dispatchEventMergeJob(
	message: EventSourceRefreshMessage
): Promise<void> {
	if (message.items.length === 0 || !isEventEligibleSource(message.sourceId)) {
		return;
	}
	await scheduleOrRun({
		items: message.items,
		sourceId: message.sourceId,
		task: "enrich-source-items",
	});
}
