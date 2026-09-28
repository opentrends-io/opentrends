import { env } from "@opentrends/env/server";
import { type Context, Hono } from "hono";
import { z } from "zod";

import { getEventFeed } from "../trends/services/event-feed";
import {
	EventPageGenerationError,
	eventIdsForUrls,
	generateRevision,
} from "../trends/services/event-page-generate";
import {
	type EventPageDoc,
	isValidSlug,
	safeTokenEqual,
	selectCandidates,
	validateRevision,
} from "../trends/services/event-page-model";
import {
	deleteEventPage,
	listPublishedEventPages,
	readEventPage,
	readEventPageIndex,
	writeEventPage,
} from "../trends/services/event-page-store";

// Event pages: public reads of published pages, and an admin API guarded by
// EVENT_PAGES_ADMIN_TOKEN to generate a draft, review it, and publish it.
// Nothing is public until the publish step, and the publish step refuses a
// draft that fails the checks in validateRevision().

const PUBLIC_CACHE = "public, max-age=300, s-maxage=600";
const CANDIDATE_PAGES = 4;
const CANDIDATE_PAGE_SIZE = 50;

const createSchema = z.object({
	eventIds: z.array(z.string().min(1).max(80)).min(1).max(8),
	keyword: z.string().trim().min(2).max(80),
	slug: z.string().refine(isValidSlug, "invalid slug"),
});

function isAuthorized(c: Context): boolean {
	const expected = env.EVENT_PAGES_ADMIN_TOKEN;
	const header = c.req.header("authorization") ?? "";
	const given = header.startsWith("Bearer ") ? header.slice(7) : "";
	return Boolean(expected) && safeTokenEqual(given, expected ?? "");
}

function publicView(doc: EventPageDoc) {
	const revision = doc.published;
	if (!(revision && doc.publishedAt)) {
		return null;
	}
	return {
		content: revision.content,
		firstReportedAt: revision.firstReportedAt,
		keyword: doc.keyword,
		lastReportedAt: revision.lastReportedAt,
		publishedAt: doc.publishedAt,
		slug: doc.slug,
		sources: revision.sources,
		topicIds: revision.topicIds,
		updatedAt: revision.generatedAt,
	};
}

function draftView(doc: EventPageDoc) {
	return {
		check: doc.draft ? validateRevision(doc.draft, doc.keyword) : null,
		doc,
	};
}

async function generateDraft(
	c: Context,
	doc: EventPageDoc,
	eventIds: readonly string[]
) {
	try {
		const draft = await generateRevision({
			eventIds,
			keyword: doc.keyword,
			previousSources: doc.published?.sources ?? doc.draft?.sources,
		});
		const next: EventPageDoc = {
			...doc,
			draft,
			updatedAt: new Date().toISOString(),
		};
		await writeEventPage(next);
		return c.json(draftView(next));
	} catch (error) {
		if (error instanceof EventPageGenerationError) {
			return c.json(
				{ error: "generation_failed", message: error.message },
				422
			);
		}
		console.warn("[event-pages] draft generation failed", error);
		// Admin-only route: the cause is what the operator needs to act on.
		return c.json(
			{
				error: "generation_failed",
				message:
					error instanceof Error
						? `${error.name}: ${error.message}`.slice(0, 500)
						: String(error).slice(0, 500),
			},
			502
		);
	}
}

const admin = new Hono()
	.use("*", async (c, next) => {
		if (!env.EVENT_PAGES_ADMIN_TOKEN) {
			return c.json({ error: "event_pages_admin_not_configured" }, 503);
		}
		if (!isAuthorized(c)) {
			return c.json({ error: "unauthorized" }, 401);
		}
		c.header("Cache-Control", "no-store");
		await next();
	})
	// Events at least three publishers reported that no page covers yet.
	.get("/candidates", async (c) => {
		const paged = new Set(
			(await readEventPageIndex()).flatMap((entry) => entry.eventIds)
		);
		const events: Awaited<ReturnType<typeof getEventFeed>>["events"] = [];
		let offset = 0;
		for (let page = 0; page < CANDIDATE_PAGES; page += 1) {
			const feed = await getEventFeed(undefined, {
				lang: "en",
				limit: CANDIDATE_PAGE_SIZE,
				offset,
			});
			events.push(...feed.events);
			if (feed.nextOffset === undefined || feed.nextOffset === offset) {
				break;
			}
			offset = feed.nextOffset;
		}
		const candidates = selectCandidates(events, paged).map((event) => ({
			eventId: event.eventId,
			firstSeenAt: event.firstSeenAt,
			publishers: event.publishers,
			sources: event.sources.map((source) => source.title),
			title: event.original?.title ?? event.title,
			topicIds: event.topicIds ?? [event.topicId],
		}));
		return c.json({ candidates });
	})
	.get("/pages", async (c) => c.json({ pages: await readEventPageIndex() }))
	.get("/pages/:slug", async (c) => {
		const doc = await readEventPage(c.req.param("slug"));
		return doc ? c.json(draftView(doc)) : c.json({ error: "not_found" }, 404);
	})
	// Generates (or regenerates) the draft for a slug from the given events.
	.post("/pages", async (c) => {
		const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
		if (!parsed.success) {
			return c.json(
				{ error: "invalid_request", issues: parsed.error.issues },
				400
			);
		}
		const { eventIds, keyword, slug } = parsed.data;
		const now = new Date().toISOString();
		const existing = await readEventPage(slug);
		const doc: EventPageDoc = existing
			? { ...existing, keyword }
			: { createdAt: now, keyword, schemaVersion: 1, slug, updatedAt: now };
		return generateDraft(c, doc, eventIds);
	})
	// Regenerates the draft from wherever the page's reports are clustered
	// now, keeping every report the page already had.
	.post("/pages/:slug/refresh", async (c) => {
		const doc = await readEventPage(c.req.param("slug"));
		if (!doc) {
			return c.json({ error: "not_found" }, 404);
		}
		const known = doc.published ?? doc.draft;
		const current = await eventIdsForUrls(
			(known?.sources ?? []).map((source) => source.url)
		);
		const eventIds = [...new Set([...current, ...(known?.eventIds ?? [])])];
		return generateDraft(c, doc, eventIds);
	})
	.post("/pages/:slug/publish", async (c) => {
		const doc = await readEventPage(c.req.param("slug"));
		if (!doc?.draft) {
			return c.json({ error: "no_draft" }, 404);
		}
		const check = validateRevision(doc.draft, doc.keyword);
		if (check.errors.length > 0) {
			return c.json({ check, error: "draft_not_publishable" }, 422);
		}
		const now = new Date().toISOString();
		const next: EventPageDoc = {
			...doc,
			draft: undefined,
			published: doc.draft,
			publishedAt: doc.publishedAt ?? now,
			updatedAt: now,
		};
		await writeEventPage(next);
		return c.json({ check, page: publicView(next) });
	})
	// Takes the page down (404) but keeps the document and any draft.
	.delete("/pages/:slug/published", async (c) => {
		const doc = await readEventPage(c.req.param("slug"));
		if (!doc) {
			return c.json({ error: "not_found" }, 404);
		}
		const next: EventPageDoc = {
			...doc,
			draft: doc.draft ?? doc.published,
			published: undefined,
			updatedAt: new Date().toISOString(),
		};
		await writeEventPage(next);
		return c.json({ ok: true });
	})
	.delete("/pages/:slug", async (c) => {
		await deleteEventPage(c.req.param("slug"));
		return c.json({ ok: true });
	});

export const eventPageRoutes = new Hono()
	.route("/admin", admin)
	.get("/", async (c) =>
		c.json({ pages: await listPublishedEventPages() }, 200, {
			"Cache-Control": PUBLIC_CACHE,
		})
	)
	.get("/:slug", async (c) => {
		const slug = c.req.param("slug");
		const doc = isValidSlug(slug) ? await readEventPage(slug) : null;
		const view = doc ? publicView(doc) : null;
		if (!view) {
			return c.json({ error: "not_found" }, 404, {
				"Cache-Control": "public, max-age=60",
			});
		}
		return c.json(view, 200, { "Cache-Control": PUBLIC_CACHE });
	});
