import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { withNotFoundRobots } from "@/lib/not-found-robots";
import { paraglideMiddleware } from "@/paraglide/server";

export default createServerEntry({
	async fetch(req: Request): Promise<Response> {
		const response = await paraglideMiddleware(req, () => handler.fetch(req));
		return withNotFoundRobots(response);
	},
});
