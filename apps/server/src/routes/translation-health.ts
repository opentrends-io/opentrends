import { env } from "@opentrends/env/server";
import { Hono } from "hono";
import { getWorkerBindings } from "../runtime";
import { safeTokenEqual } from "../trends/services/event-page-model";
import { translationBudgetSnapshot } from "../trends/services/translation-job-store";
import { translationPolicy } from "../trends/services/translation-policy";

// Operator-only, read-only, aggregate evidence. Never exposes raw news,
// credentials, prompts or provider errors; does not enqueue or reset jobs.
export const translationHealthRoutes = new Hono().get("/", async (c) => {
	c.header("Cache-Control", "no-store");
	const expected = env.EVENT_PAGES_ADMIN_TOKEN;
	if (!expected) {
		return c.json({ error: "not_configured" }, 503);
	}
	const header = c.req.header("authorization") ?? "";
	if (
		!(header.startsWith("Bearer ") && safeTokenEqual(header.slice(7), expected))
	) {
		return c.json({ error: "unauthorized" }, 401);
	}
	const database = getWorkerBindings()?.DB;
	if (!database) {
		return c.json({ error: "storage_unavailable" }, 503);
	}
	const now = Date.now();
	const [budget, jobs, lanes] = await Promise.all([
		translationBudgetSnapshot(database, now),
		database
			.prepare(
				"SELECT state,error_code,count(*) count,min(created_at) oldestAt FROM translation_job GROUP BY state,error_code"
			)
			.all(),
		database
			.prepare(
				"SELECT lang,consumer_seen_at,progress_at,lease_until,wake_until FROM translation_lane"
			)
			.all(),
	]);
	const policy = translationPolicy();
	return c.json({
		checkedAt: now,
		enabled: Boolean(policy),
		schedulerEnabled: env.TRANSLATION_SCHEDULER_ENABLED === "true",
		schedulerSeenAt: budget.schedulerSeenAt,
		lanes: lanes.results,
		budget: {
			...budget,
			dailyLimitMicros: policy?.dailyMicros ?? 0,
			dailyCallLimit: policy?.dailyCalls ?? 0,
			accountBalanceAvailable: false,
			basis: "local model usage; unknown usage retains reservation",
		},
		jobs: jobs.results,
	});
});
