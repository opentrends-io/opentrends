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
import { Analytics } from "../../src/components/analytics";
import { SocialSignIn } from "../../src/components/social-sign-in";
import { DisplaySettingsMenu } from "../../src/components/trends/display-settings-menu";
import "../../src/index.css";

function Fixture() {
	if (new URLSearchParams(location.search).has("transport_only")) {
		return <Analytics />;
	}
	return (
		<>
			<Analytics />
			<DisplaySettingsMenu />
			<SocialSignIn />
		</>
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
createRoot(root).render(
	<QueryClientProvider client={new QueryClient()}>
		<RouterProvider router={router} />
	</QueryClientProvider>
);
