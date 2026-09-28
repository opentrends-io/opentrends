import { getWorkerBindings } from "../../runtime";
import { isEventEligibleSource } from "../config/sources";
import type { SourceId, TopicId } from "../types";
import type { EventSourceItemRef } from "./event-content-enrichment";
import { rebuildEvents } from "./event-rebuild";
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
	| { task: "rebuild-events" }
	// Queued before events were rebuilt across all topics at once; handled
	// as a full rebuild so messages in flight at deploy time are not lost.
	| { task: "rebuild-topic"; topicId: TopicId };

export async function runEventMergeJob(
	message: EventMergeMessage
): Promise<void> {
	if (message.task === "rebuild-events" || message.task === "rebuild-topic") {
		const complete = await rebuildEvents();
		if (!complete) {
			await scheduleOrRun({ task: "rebuild-events" });
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
	await scheduleOrRun({ task: "rebuild-events" });
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
