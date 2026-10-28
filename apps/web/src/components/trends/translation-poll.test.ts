import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { trendsPageQueryOptions } from "./trends-query";
import type { TrendsPageData } from "./types";

test("translation polling stops on completion or its finite read budget", () => {
	const client = new QueryClient();
	const options = trendsPageQueryOptions("ai", "zh");
	const query = client
		.getQueryCache()
		.build<TrendsPageData, Error, TrendsPageData, readonly unknown[]>(
			client,
			options
		);
	const interval = options.refetchInterval;
	if (typeof interval !== "function") {
		throw new Error("Missing polling policy");
	}
	const page: TrendsPageData = {
		id: "ai",
		title: "AI",
		updatedAt: 1,
		sections: [
			{
				id: "news",
				title: "News",
				sources: [
					{
						sourceId: "openai-news",
						title: "OpenAI",
						status: "ok",
						items: [
							{
								id: "1",
								sourceId: "openai-news",
								title: "A new model",
								url: "https://example.test/1",
								fetchedAt: 1,
								translation: {
									state: "running",
									language: "zh",
									textHash: "fixture",
									checkedAt: Date.now(),
									leaseUntil: Date.now() + 90_000,
								},
							},
						],
					},
				],
			},
		],
	};
	query.setData(page);
	expect(interval(query)).toBe(10_000);
	for (let i = 1; i < 30; i++) {
		query.setData(page);
	}
	expect(interval(query)).toBe(false);
	client.clear();
	const complete = client
		.getQueryCache()
		.build<TrendsPageData, Error, TrendsPageData, readonly unknown[]>(
			client,
			options
		);
	const item = page.sections[0]?.sources[0]?.items[0];
	if (!item) {
		throw new Error("Missing item");
	}
	item.original = { title: item.title };
	item.title = "新模型";
	complete.setData(page);
	expect(interval(complete)).toBe(false);
	client.clear();
});
