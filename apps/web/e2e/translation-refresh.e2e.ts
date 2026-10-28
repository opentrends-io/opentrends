import { expect, test } from "@playwright/test";

for (const [reason, label] of [
	["paused", "后台翻译已暂停，保留原文"],
	["call_limit", "今日翻译调用次数已达上限，保留原文"],
] as const) {
	test(`queued becomes ${reason} without a notice row in dark mobile layout`, async ({
		page,
	}, testInfo) => {
		await page.clock.install();
		await page.route("**/*", (route) =>
			new URL(route.request().url()).origin === "http://127.0.0.1:4178"
				? route.continue()
				: route.abort()
		);
		await page.route("**/api/auth/**", (route) =>
			route.fulfill({ json: null })
		);
		let calls = 0;
		await page.route("**/api/trends/featured?**", (route) => {
			calls++;
			expect(route.request().method()).toBe("GET");
			return route.fulfill({
				json: {
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
												state: "blocked",
												reason,
												language: "zh",
												textHash: "fixture",
												checkedAt: Date.now(),
											},
										},
									],
								},
							],
						},
					],
				},
			});
		});
		await page.goto("/e2e/fixtures/translation-refresh.html?state=queued");
		const article = page.locator('a[href="https://example.test/1"]');
		await expect(
			article.locator('[data-translation-state="queued"]')
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "刷新翻译状态" })
		).toHaveCount(0);
		await expect(
			page.getByText("部分条目保留原文", { exact: false })
		).toHaveCount(0);
		expect(calls).toBe(0);
		await page.clock.runFor(10_000);
		await expect(
			article.locator('[data-translation-state="blocked"]')
		).toHaveAttribute("title", label);
		await page.clock.fastForward(300_000);
		expect(calls).toBe(1);
		await expect(article).toContainText("Researchers publish a new model");
		await page.setViewportSize({ width: 375, height: 812 });
		await page.evaluate(() => {
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		const indicator = article.locator('[data-translation-state="blocked"]');
		await indicator.scrollIntoViewIfNeeded();
		await indicator.hover();
		await expect(indicator).toBeInViewport();
		await expect(
			page.getByRole("button", { name: "刷新翻译状态" })
		).toHaveCount(0);
		await expect(
			page.getByText("刷新只检查进度，不会重新生成或重复扣费。", {
				exact: false,
			})
		).toHaveCount(0);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth
			)
		).toBe(true);
		await page.screenshot({
			path: testInfo.outputPath(`${reason}-mobile-dark.png`),
		});
	});
}

test("a visible English card becomes Chinese, persists, and stops polling", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(message.text());
		}
	});
	await page.clock.install();
	await page.route("**/*", (route) =>
		new URL(route.request().url()).origin === "http://127.0.0.1:4178"
			? route.continue()
			: route.abort()
	);
	await page.route("**/api/auth/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "null",
		})
	);
	let calls = 0;
	await page.route("**/api/trends/featured?**", (route) => {
		calls++;
		expect(
			new URL(route.request().url()).searchParams.get("translationCache")
		).toBe("2");
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			headers: { "Cache-Control": "no-store" },
			json: {
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
										title: "研究人员发布新模型",
										original: { title: "Researchers publish a new model" },
										url: "https://example.test/1",
										fetchedAt: 1,
									},
								],
							},
						],
					},
				],
			},
		});
	});
	await page.goto("/e2e/fixtures/translation-refresh.html");
	const article = page.locator('a[href="https://example.test/1"]');
	await expect(article).toContainText("Researchers publish a new model");
	await expect(article).toContainText("标题翻译中");
	await expect(page.getByRole("button", { name: "刷新翻译状态" })).toHaveCount(
		0
	);
	await expect(
		page.getByText("部分条目保留原文", { exact: false })
	).toHaveCount(0);
	expect(calls).toBe(0);
	await page.clock.fastForward(10_000);
	await expect(article).toContainText("研究人员发布新模型");
	await page.reload();
	await expect(article).toContainText("研究人员发布新模型");
	await expect(article).not.toContainText("标题翻译中");
	await expect
		.poll(() =>
			page.evaluate(() =>
				Object.values(localStorage).some((value) =>
					value.includes("研究人员发布新模型")
				)
			)
		)
		.toBe(true);
	await page.clock.fastForward(300_000);
	expect(calls).toBe(1);
	await expect(article).toContainText("研究人员发布新模型");
	expect(
		errors.filter((error) => !error.includes("Failed to load resource"))
	).toEqual([]);
	await page.screenshot({ path: testInfo.outputPath("translated-card.png") });
});

test("network failure keeps the original, expires the spinner and bounds polling without a notice row", async ({
	page,
}, testInfo) => {
	await page.clock.install();
	await page.route("**/*", (route) =>
		new URL(route.request().url()).origin === "http://127.0.0.1:4178"
			? route.continue()
			: route.abort()
	);
	await page.route("**/api/auth/**", (route) => route.fulfill({ json: null }));
	let calls = 0;
	await page.route("**/api/trends/featured?**", (route) => {
		calls++;
		expect(route.request().method()).toBe("GET");
		return route.fulfill({
			status: 503,
			json: { error: "fixture unavailable" },
		});
	});
	await page.goto("/e2e/fixtures/translation-refresh.html");
	const article = page.locator('a[href="https://example.test/1"]');
	await expect(
		article.locator('[data-translation-state="running"]')
	).toBeVisible();
	// Advance through retry delays rather than jumping over them. fastForward
	// deliberately executes each timer only once, unlike elapsed wall time.
	for (let step = 0; step < 10; step++) {
		await page.clock.runFor(10_000);
		await page.waitForTimeout(30);
	}
	await expect(
		article.locator('[data-translation-state="unknown"]')
	).toBeVisible();
	await expect(article).toContainText("Researchers publish a new model");
	await page.clock.fastForward(300_000);
	await page.waitForTimeout(200);
	const stopped = calls;
	await page.clock.fastForward(300_000);
	await page.waitForTimeout(200);
	expect(calls).toBe(stopped);
	expect(calls).toBeLessThanOrEqual(9);
	await expect(page.getByRole("button", { name: "刷新翻译状态" })).toHaveCount(
		0
	);
	await expect(
		page.getByText("部分条目保留原文", { exact: false })
	).toHaveCount(0);
	await expect(article).toContainText("Researchers publish a new model");
	await page.setViewportSize({ width: 375, height: 812 });
	const indicator = article.locator('[data-translation-state="unknown"]');
	await indicator.scrollIntoViewIfNeeded();
	await indicator.hover();
	await expect(indicator).toBeInViewport();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth
		)
	).toBe(true);
	await page.screenshot({ path: testInfo.outputPath("failure-mobile.png") });
});
