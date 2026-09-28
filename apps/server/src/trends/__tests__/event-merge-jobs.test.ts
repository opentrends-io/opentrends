import { describe, expect, it } from "bun:test";

import { runWithServerEnv } from "@opentrends/env/server";

import { runWithWorkerBindings, type WorkerBindings } from "../../runtime";
import {
	dispatchEventMergeJob,
	runEventMergeJob,
} from "../services/event-merge-jobs";
import { EVENT_CONTENT_ITEM_LIMIT } from "../services/event-work-budget";
import { SqliteD1 } from "./support/d1-sqlite";

function createBindings(onSend: (message: unknown) => void): WorkerBindings {
	const queue = {
		send(message: unknown) {
			onSend(message);
			return Promise.resolve();
		},
	};
	return {
		BETTER_AUTH_SECRET: "test".repeat(8),
		BETTER_AUTH_URL: "http://localhost:3000",
		CORS_ORIGIN: "http://localhost:3001",
		DB: {} as D1Database,
		EVENT_MERGE_QUEUE: queue as Queue,
		HOT_CACHE: {} as KVNamespace,
		LLM_BASE_URL: "https://example.com/v1",
		LLM_MODEL: "test-model",
		NODE_ENV: "test",
		SILICONFLOW_EMBEDDING_MODEL: "test-embedding-model",
		SUMMARY_PREWARM_QUEUE: queue as Queue,
		TRENDS_REFRESH_SCHEDULER: "disabled",
	};
}

describe("event merge queue routing", () => {
	it("starts one continuation chain for a refreshed source", async () => {
		const sent: Array<{
			kind: string;
			payload: { items: unknown[]; task: string };
		}> = [];
		const itemCount = EVENT_CONTENT_ITEM_LIMIT * 2 + 1;
		const bindings = createBindings((message) => {
			sent.push(
				message as {
					kind: string;
					payload: { items: unknown[]; task: string };
				}
			);
		});

		await runWithWorkerBindings(bindings, () =>
			dispatchEventMergeJob({
				items: Array.from({ length: itemCount }, (_, index) => ({
					itemId: `item-${index}`,
					sourceId: "wired" as const,
				})),
				sourceId: "wired",
			})
		);

		expect(sent.map(({ kind }) => kind)).toEqual(["event-merge"]);
		expect(sent.map(({ payload }) => payload.task)).toEqual([
			"enrich-source-items",
		]);
		expect(sent.map(({ payload }) => payload.items.length)).toEqual([
			itemCount,
		]);
	});

	it("queues one rebuild of all events after a source's last content batch", async () => {
		const sent: unknown[] = [];
		const bindings = createBindings((message) => {
			sent.push(message);
		});

		await runWithWorkerBindings(bindings, () =>
			runEventMergeJob({
				items: [],
				sourceId: "techcrunch",
				task: "enrich-source-items",
			})
		);

		expect(sent).toEqual([
			{ kind: "event-merge", payload: { task: "rebuild-events" } },
		]);
	});

	it("runs a full rebuild for a per-topic message queued before the change", async () => {
		const sent: unknown[] = [];
		const d1 = new SqliteD1();
		try {
			await runWithServerEnv(
				{ ...createBindings(() => undefined), SILICONFLOW_API_KEY: "test-key" },
				() =>
					runWithWorkerBindings(
						createBindings((message) => {
							sent.push(message);
						}),
						() =>
							d1.run(() =>
								runEventMergeJob({ task: "rebuild-topic", topicId: "ai" })
							)
					)
			);
		} finally {
			d1.close();
		}

		expect(sent).toEqual([]);
	});
});
