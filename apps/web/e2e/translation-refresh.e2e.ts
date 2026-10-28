import { expect, test } from "@playwright/test";

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
	expect(calls).toBe(0);
	await page.clock.fastForward(10_000);
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
