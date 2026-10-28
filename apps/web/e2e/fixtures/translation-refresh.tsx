import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { TrendsPage } from "../../src/components/trends/trends-page";
import { trendsPageQueryOptions } from "../../src/components/trends/trends-query";
import type { TrendsPageData } from "../../src/components/trends/types";
import "../../src/index.css";

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
								state: "running",
								language: "zh",
								textHash: "fixture",
								checkedAt: Date.now(),
								leaseUntil: Date.now() + 90_000,
								nextPollAt: Date.now() + 10_000,
							},
						},
					],
				},
			],
		},
	],
};

function Fixture() {
	const query = useQuery({
		...trendsPageQueryOptions("featured", "zh"),
		initialData,
	});
	return <TrendsPage page={query.data} />;
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
	<QueryClientProvider client={new QueryClient()}>
		<RouterProvider router={router} />
	</QueryClientProvider>
);
