import { expect, test } from "@playwright/test";

const GITHUB_BUTTON = /GitHub/;
const COLLECTION_PATTERN =
	/google-analytics|googletagmanager|analytics\.ahrefs/;

test.beforeEach(async ({ page }) => {
	await page.route("**/api/auth/providers", (route) =>
		route.fulfill({ json: { github: true, google: true } })
	);
});

test("preview records real layout changes locally, never external analytics", async ({
	page,
}) => {
	const collection: string[] = [];
	page.on("request", (request) => {
		if (COLLECTION_PATTERN.test(request.url())) {
			collection.push(new URL(request.url()).pathname);
		}
	});
	await page.goto("/e2e/fixtures/analytics.html?analytics_debug=1");
	await page.getByRole("button", { name: "显示偏好" }).click();
	const flow = page.getByRole("menuitemradio", { name: "流式" });
	await expect(flow).toHaveAttribute("aria-checked", "false");
	await flow.click();
	await expect(flow).toHaveAttribute("aria-checked", "true");
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.otAnalyticsDebug?.events.filter(
						(e) => e.event === "layout_change"
					).length
			)
		)
		.toBe(1);
	await flow.click();
	expect(
		await page.evaluate(
			() =>
				window.otAnalyticsDebug?.events.filter(
					(e) => e.event === "layout_change"
				).length
		)
	).toBe(1);
	expect(
		await page.evaluate(
			() =>
				JSON.parse(
					localStorage.getItem("opentrends:trends:display-settings") ?? "{}"
				).layout
		)
	).toBe("flow");
	expect(collection).toEqual([]);
});

test("route identity, payload allowlist and bounded queues", async ({
	page,
}) => {
	await page.goto("/e2e/fixtures/analytics.html?analytics_debug=1");
	await expect
		.poll(() => page.evaluate(() => Boolean(window.otAnalyticsDebug)))
		.toBe(true);
	const events = await page.evaluate(async () => {
		const modulePath = "/src/lib/analytics.ts";
		const api = await import(modulePath);
		history.replaceState(
			{},
			"",
			"/zh/trends/ai?email=private-sentinel#private-sentinel"
		);
		api.trackPage();
		api.trackPage();
		api.track("search_result", "private-sentinel");
		api.track("private-sentinel", "private-sentinel");
		for (let i = 0; i < 1000; i += 1) {
			api.track("summary_expand");
		}
		return window.otAnalyticsDebug?.events;
	});
	expect(
		events?.filter((e) => e.event === "page_view" && e.topic === "ai")
	).toHaveLength(1);
	expect(events?.filter((e) => e.event === "summary_expand")).toHaveLength(1);
	expect(JSON.stringify(events)).not.toContain("private-sentinel");
});

for (const privacy of ["dnt", "gpc", "denied", "invalid", "unavailable"]) {
	test(`privacy guard: ${privacy}`, async ({ page }) => {
		await page.addInitScript((signal) => {
			if (signal === "dnt") {
				Object.defineProperty(navigator, "doNotTrack", { value: "1" });
			}
			if (signal === "gpc") {
				Object.defineProperty(navigator, "globalPrivacyControl", {
					value: true,
				});
			}
			if (signal === "denied") {
				localStorage.setItem(
					"dc-analytics-consent-v1",
					JSON.stringify({ value: "denied" })
				);
			}
			if (signal === "invalid") {
				localStorage.setItem("dc-analytics-consent-v1", "{");
			}
			if (signal === "unavailable") {
				Object.defineProperty(window, "localStorage", {
					get() {
						throw new Error("Unavailable");
					},
				});
			}
		}, privacy);
		await page.goto(
			"/e2e/fixtures/analytics.html?analytics_debug=1&transport_only=1"
		);
		await page.evaluate(async () => {
			const modulePath = "/src/lib/analytics.ts";
			(await import(modulePath)).track("summary_expand");
		});
		expect(
			await page.evaluate(() => ({
				events: window.otAnalyticsDebug,
				layer: window.dataLayer,
			}))
		).toEqual({ events: undefined, layer: undefined });
	});
}

test("restored sessions do not count as login; one active attempt can complete once", async ({
	page,
}) => {
	await page.goto("/e2e/fixtures/analytics.html?analytics_debug=1");
	const events = await page.evaluate(async () => {
		const modulePath = "/src/lib/analytics.ts";
		const api = await import(modulePath);
		api.loginFinished(true);
		api.loginStarted("google");
		api.loginFinished(true);
		api.loginFinished(true);
		return window.otAnalyticsDebug?.events;
	});
	expect(events?.filter((e) => e.event === "login_start")).toHaveLength(1);
	expect(events?.filter((e) => e.event === "login")).toHaveLength(1);
});

test("privacy withdrawal clears diagnostics and blocks further events", async ({
	page,
}) => {
	await page.goto("/e2e/fixtures/analytics.html?analytics_debug=1");
	await expect
		.poll(() =>
			page.evaluate(() => window.otAnalyticsDebug?.events.length ?? 0)
		)
		.toBeGreaterThan(0);
	await page.evaluate(async () => {
		localStorage.setItem("dc-analytics-consent-v1", '"denied"');
		const modulePath = "/src/lib/analytics.ts";
		(await import(modulePath)).track("summary_expand");
	});
	expect(await page.evaluate(() => window.otAnalyticsDebug?.events)).toEqual(
		[]
	);
});

test("normal Preview stays silent; a failing real sign-in action is not success", async ({
	page,
}) => {
	await page.route("**/api/auth/sign-in/social", (route) =>
		route.fulfill({
			status: 500,
			json: { message: "Synthetic provider error" },
		})
	);
	await page.goto("/e2e/fixtures/analytics.html");
	await page.getByRole("button", { name: GITHUB_BUTTON }).click();
	expect(await page.evaluate(() => window.otAnalyticsDebug)).toBeUndefined();
	await page.goto("/e2e/fixtures/analytics.html?analytics_debug=1");
	await page.getByRole("button", { name: GITHUB_BUTTON }).click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.otAnalyticsDebug?.events.filter(
						(e) => e.event === "login_failed"
					).length
			)
		)
		.toBe(1);
	expect(
		await page.evaluate(() =>
			window.otAnalyticsDebug?.events.filter((e) => e.event === "login")
		)
	).toEqual([]);
});

test("telemetry is bounded across repeated distinct navigation and long visits", async ({
	page,
}) => {
	await page.goto(
		"/e2e/fixtures/analytics.html?analytics_debug=1&transport_only=1"
	);
	await page.evaluate(async () => {
		const modulePath = "/src/lib/analytics.ts";
		const api = await import(modulePath);
		const now = Date.now;
		let clock = now();
		Date.now = () => clock;
		try {
			for (let i = 0; i < 900; i += 1) {
				clock += 1001;
				api.track("summary_expand");
			}
		} finally {
			Date.now = now;
		}
	});
	const before = await page.evaluate(() => window.otAnalyticsDebug?.events);
	expect(before).toHaveLength(200);
	await page.evaluate(async () => {
		const modulePath = "/src/lib/analytics.ts";
		(await import(modulePath)).track("summary_collapse");
	});
	expect(await page.evaluate(() => window.otAnalyticsDebug?.events)).toEqual(
		before
	);
});

test("summary recovery preserves content and records one terminal failure", async ({
	page,
}) => {
	await page.clock.install();
	await page.route("**/api/trends/*/summary?**", (route) =>
		route.abort("failed")
	);
	await page.goto("/e2e/fixtures/summary-recovery.html?analytics_debug=1");
	await expect(page.getByTestId("trends-summary-body")).toContainText(
		"已有摘要 1"
	);
	await page.getByRole("button", { name: "展开其余 3 条" }).click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.otAnalyticsDebug?.events.filter(
						(e) => e.event === "summary_expand"
					).length
			)
		)
		.toBe(1);
	for (const delay of [1100, 3100, 8100]) {
		await page.clock.fastForward(delay);
		await page.waitForTimeout(100);
	}
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.otAnalyticsDebug?.events.filter(
						(e) => e.event === "summary_result" && e.action === "stale"
					).length
			)
		)
		.toBe(1);
	await page.clock.fastForward(180_000);
	expect(
		await page.evaluate(
			() =>
				window.otAnalyticsDebug?.events.filter(
					(e) => e.event === "summary_result" && e.action === "stale"
				).length
		)
	).toBe(1);
	await expect(page.getByTestId("trends-summary-body")).toContainText(
		"已有摘要 1"
	);
});
