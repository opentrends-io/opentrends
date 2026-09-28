import { Hono } from "hono";

import { getArchiveIndex } from "../trends/services/archive-index";
import { getWaitUntil } from "./trends";

// The digest archive as data, for the archive sitemap: every archived day
// per topic and language. 503 only when no copy has ever been built.
export const archiveRoutes = new Hono().get("/index", async (c) => {
	try {
		const { index, source } = await getArchiveIndex(getWaitUntil(c));
		return c.json(index, 200, {
			"Cache-Control": "public, max-age=300",
			"X-Archive-Index": source,
		});
	} catch (error) {
		console.warn("[archive] index unavailable", error);
		return c.json({ error: "archive_index_unavailable" }, 503, {
			"Cache-Control": "no-store",
			"Retry-After": "300",
		});
	}
});
