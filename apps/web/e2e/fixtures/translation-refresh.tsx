import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { TopicSourceList } from "../../src/components/trends/topic-source-list";
import { trendsPageQueryOptions } from "../../src/components/trends/trends-query";
import type { TrendsPageData } from "../../src/components/trends/types";
import "../../src/index.css";

const scenario = new URLSearchParams(location.search).get("state");
const expiredService = scenario === "expired-service";
function initialState() {
	if (scenario === "unknown") {
		return "unknown" as const;
	}
	return scenario === "queued" || expiredService ? "queued" : "running";
}

const initialData: TrendsPageData = {
	id: "featured",
	title: "精选",
	updatedAt: 1,
	sections: [
		{
			id: "test",
			title: "News",
			sources: [
				{
					sourceId: "hackernews",
					title: "Hacker News",
					status: "ok",
					items: [
						{
							id: "1",
							sourceId: "hackernews",
							title: "Researchers publish a new model",
							url: "https://example.test/1",
							fetchedAt: 1,
							translation: {
								state: initialState(),
								language: "zh",
								textHash: "fixture",
								checkedAt: Date.now(),
								leaseUntil: Date.now() + 90_000,
								serviceValidUntil: Date.now() + (expiredService ? -1 : 180_000),
								nextPollAt: Date.now() + 10_000,
							},
						},
					],
				},
			],
		},
	],
};

const queryClient = new QueryClient();
if (scenario !== "empty") {
	queryClient.setQueryData(
		trendsPageQueryOptions("featured", "zh").queryKey,
		initialData
	);
}

function Fixture() {
	return <TopicSourceList locale="zh" topic="featured" />;
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
createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<RouterProvider router={router} />
	</QueryClientProvider>
);
