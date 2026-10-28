import { expect, type Page, type Route, test } from "@playwright/test";

const fixture = "/e2e/fixtures/summary-recovery.html";
const summaryEndpoint = "**/api/trends/*/summary?**";
const replacement = "1. **更新后的摘要** — 这次请求已成功 [1]";

async function reply(route: Route, body = replacement) {
	await route.fulfill({
		status: 200,
		contentType: "text/plain; charset=utf-8",
		headers: { "X-Trends-Summary-Origin": "cache" },
		body: `${JSON.stringify({ citations: [{ n: 1, url: "https://example.test/article" }] })}\n${body}`,
	});
}

async function exhaustRetries(page: Page, calls: () => number) {
	await expect.poll(calls).toBe(1);
	for (const [index, delay] of [1000, 3000, 8000].entries()) {
		await page.clock.fastForward(delay);
		await expect.poll(calls).toBe(index + 2);
	}
	await expect(
		page.getByRole("button", { name: "重试", exact: true })
	).toBeVisible();
	await page.clock.fastForward(180_000);
	expect(calls()).toBe(4);
}

test.describe("summary recovery", () => {
	test.beforeEach(async ({ page }) => {
		await page.clock.install();
		// Fail closed: these tests must never use production/model services.
		await page.route("**/*", (route) =>
			new URL(route.request().url()).origin === "http://127.0.0.1:4178"
				? route.continue()
				: route.abort()
		);
	});

	test("preserves the previous digest and citations; retries stop and manual recovery works", async ({
		page,
	}, testInfo) => {
		let calls = 0;
		let recover = false;
		await page.route(summaryEndpoint, (route) => {
			calls++;
			return recover ? reply(route) : route.abort("failed");
		});
		await page.goto(fixture);
		const body = page.getByTestId("trends-summary-body");
		await expect(body).toContainText("已有摘要 1");
		await expect(page.getByRole("status")).toContainText("正在重试");
		// A new source object with identical IDs must not reset the request budget.
		await page.getByRole("button", { name: "刷新来源对象" }).click();
		await exhaustRetries(page, () => calls);
		await expect(body).toContainText("已有摘要 1");
		await expect(page.getByRole("status")).toContainText("保留已有摘要");
		await expect(body.locator('[data-streamdown="link"]')).toHaveCount(5);
		await page.getByRole("button", { name: "展开其余 3 条" }).click();
		await expect(body).toContainText("已有摘要 8");
		await page.screenshot({
			path: testInfo.outputPath("retained-desktop.png"),
		});
		await page.setViewportSize({ width: 390, height: 844 });
		await page.clock.runFor(32);
		await expect(page.locator("main")).toHaveCount(1);
		const controls = await page.locator("fieldset").boundingBox();
		const notice = await page.getByRole("status").boundingBox();
		expect(controls).not.toBeNull();
		expect(notice).not.toBeNull();
		expect(notice?.y).toBeGreaterThanOrEqual(
			(controls?.y ?? 0) + (controls?.height ?? 0)
		);
		await page
			.getByRole("button", { name: "折叠 AI 摘要", exact: true })
			.click();
		await expect(body).toHaveCount(0);
		await page
			.getByRole("button", { name: "展开 AI 摘要", exact: true })
			.click();
		await expect(body).toContainText("已有摘要 8");
		await page.getByRole("button", { name: "重试", exact: true }).hover();
		await page.screenshot({ path: testInfo.outputPath("retained-mobile.png") });
		recover = true;
		await page.getByRole("button", { name: "重试", exact: true }).click();
		await expect(body).toContainText("更新后的摘要");
		await expect(body).not.toContainText("已有摘要");
		await expect(page.getByRole("status")).toHaveCount(0);
		expect(calls).toBe(5);
	});

	test("pending without a previous digest stops too and offers retry", async ({
		page,
	}) => {
		let calls = 0;
		await page.route(summaryEndpoint, (route) => {
			calls++;
			return route.fulfill({
				status: 202,
				headers: { "Retry-After": "0" },
				body: "pending",
			});
		});
		await page.goto(`${fixture}?seed=none`);
		await exhaustRetries(page, () => calls);
		await expect(page.getByRole("status")).toContainText("AI 总结加载失败");
		await expect(page.getByTestId("trends-summary-body")).toHaveCount(0);
	});

	test("automatic retry replaces old content only after a complete success", async ({
		page,
	}) => {
		let calls = 0;
		await page.route(summaryEndpoint, (route) =>
			++calls < 3 ? route.abort("failed") : reply(route)
		);
		await page.goto(fixture);
		await expect.poll(() => calls).toBe(1);
		await page.clock.fastForward(1000);
		await expect.poll(() => calls).toBe(2);
		await expect(page.getByTestId("trends-summary-body")).toContainText(
			"已有摘要 1"
		);
		await page.clock.fastForward(3000);
		await expect(page.getByTestId("trends-summary-body")).toContainText(
			"更新后的摘要"
		);
		await expect(page.getByRole("status")).toHaveCount(0);
		await page.clock.fastForward(180_000);
		expect(calls).toBe(3);
	});

	test("switching topic cancels the previous backoff and never shows its digest", async ({
		page,
	}) => {
		let oldCalls = 0;
		await page.route(summaryEndpoint, (route) => {
			if (route.request().url().includes("/mine/")) {
				oldCalls++;
				return route.abort("failed");
			}
			return reply(route, "1. **硬件摘要** — 新板块的内容 [1]");
		});
		await page.goto(fixture);
		await expect(page.getByTestId("trends-summary-body")).toContainText(
			"已有摘要 1"
		);
		await expect(page.getByRole("status")).toContainText("正在重试");
		await page.getByRole("button", { name: "切换板块" }).click();
		await expect(page.getByTestId("trends-summary-body")).toContainText(
			"硬件摘要"
		);
		await expect(page.getByTestId("trends-summary-body")).not.toContainText(
			"已有摘要"
		);
		await page.clock.fastForward(180_000);
		expect(oldCalls).toBe(1);
	});
});
