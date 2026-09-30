import { type Context, Hono } from "hono";
import {
	createOpenTrendsMcpServer,
	createStatelessHttpTransport,
} from "opentrends-mcp";
import type { WorkerBindings } from "../runtime";

// The MCP server over Streamable HTTP, served by the API itself: a client
// adds one URL and gets the same tools the stdio package offers, with no
// install and no key. Every request is its own stateless session, so any
// Worker instance can answer it. API reads stay within the same Worker.
type LocalApiContext = Pick<
	Context<{ Bindings: WorkerBindings }>,
	"env" | "executionCtx"
>;

export function createMcpRoutes(
	fetchLocalApi: (
		request: Request,
		context: LocalApiContext
	) => Promise<Response>
) {
	return new Hono<{ Bindings: WorkerBindings }>().all("/", async (c) => {
		const server = createOpenTrendsMcpServer({
			baseUrl: new URL(c.req.url).origin,
			defaultLang: "en",
			fetcher: (url, init) => fetchLocalApi(new Request(url, init), c),
		});
		const transport = createStatelessHttpTransport();
		await server.connect(transport);
		try {
			return await transport.handleRequest(c.req.raw);
		} finally {
			c.executionCtx?.waitUntil?.(server.close().catch(() => undefined));
		}
	});
}
