import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TrendsSummary } from "../../src/components/trends/trends-summary";
import type {
	DigestJsonData,
	TrendsPageData,
} from "../../src/components/trends/types";
import "../../src/index.css";

const seeded =
	new URLSearchParams(window.location.search).get("seed") !== "none";
const entries = Array.from({ length: 8 }, (_, index) => ({
	n: index + 1,
	takeaway: `已有摘要 ${index + 1}`,
	reason: "上次成功加载的内容，在更新失败时仍然可读。",
	citations: [{ n: 1, url: "https://example.test/article" }],
}));
const initialDigest: DigestJsonData = {
	topic: "mine",
	lang: "zh",
	window: "today",
	entries,
	markdown: entries
		.map((entry) => `${entry.n}. **${entry.takeaway}** — ${entry.reason} [1]`)
		.join("\n"),
};
const originalPage: TrendsPageData = {
	id: "mine",
	title: "关注",
	updatedAt: 0,
	sections: [
		{
			id: "test",
			title: "测试来源",
			sources: [
				{
					sourceId: "hackernews",
					title: "Hacker News",
					status: "ok",
					items: [
						{
							id: "1",
							sourceId: "hackernews",
							title: "测试报道",
							url: "https://example.test/article",
							fetchedAt: 0,
						},
					],
				},
			],
		},
	],
};

function Fixture() {
	const [collapsed, setCollapsed] = useState(false);
	const [page, setPage] = useState(originalPage);
	const [topic, setTopic] = useState("mine");
	return (
		<main>
			<nav aria-label="测试控制" className="flex gap-4 p-4">
				<button
					onClick={() => setPage(structuredClone(originalPage))}
					type="button"
				>
					刷新来源对象
				</button>
				<button onClick={() => setTopic("hardware")} type="button">
					切换板块
				</button>
			</nav>
			<TrendsSummary
				collapsed={collapsed}
				initialDigest={seeded && topic === "mine" ? initialDigest : undefined}
				onCollapsedChange={setCollapsed}
				page={page}
				topicId={topic}
			/>
		</main>
	);
}

const rootRoute = createRootRoute({ component: Outlet });
const localeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/$locale",
	component: Fixture,
});
const router = createRouter({
	routeTree: rootRoute.addChildren([localeRoute]),
	history: createMemoryHistory({ initialEntries: ["/zh"] }),
});
const root = document.getElementById("root");
if (!root) {
	throw new Error("Missing fixture root");
}
createRoot(root).render(<RouterProvider router={router} />);
