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
import { EventFeedPage } from "../../src/components/trends/event-feed-page";
import "../../src/index.css";

const rootRoute = createRootRoute({ component: Outlet });
const localeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/$locale",
	component: () => <EventFeedPage selectedTopic="ai" />,
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
