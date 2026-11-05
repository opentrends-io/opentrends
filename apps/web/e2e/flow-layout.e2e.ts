import { expect, test } from "@playwright/test";

test("grid switches to flow, survives reload, and can return to sections", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.route("**/*", (route) =>
		new URL(route.request().url()).origin === "http://127.0.0.1:4178"
			? route.continue()
			: route.abort()
	);
	await page.route("**/api/auth/**", (route) => route.fulfill({ json: null }));
	await page.route("**/api/trends/*?**", (route) => {
		const id = new URL(route.request().url()).pathname.split("/").at(-1);
		return route.fulfill({
			json: { id, title: id, updatedAt: 1, sections: [] },
		});
	});
	await page.goto("/e2e/fixtures/translation-refresh.html");
	const preferences = page.getByRole("button", { name: "显示偏好" });
	const cards = page.locator("[data-sortable-source-id]");
	await expect(cards).toHaveCount(1);
	await expect(
		page.getByRole("link", { name: "推荐", exact: true })
	).toHaveCount(0);
	await expect(
		page.getByRole("link", { name: "日历", exact: true })
	).toHaveCount(0);
	await preferences.click();
	await expect(
		page.getByRole("menuitemradio", { name: "来源网格" })
	).toHaveAttribute("aria-checked", "true");
	await expect(
		page.getByRole("menuitemradio", { name: "流式" })
	).toHaveAttribute("aria-checked", "false");
	await page.getByRole("menuitemradio", { name: "流式" }).click();
	await page.keyboard.press("Escape");
	await expect(cards).toHaveCount(0);
	await expect(page.locator('a[href="https://example.test/1"]')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(
						localStorage.getItem("opentrends:trends:display-settings") ?? "{}"
					).layout
			)
		)
		.toBe("flow");
	await page.reload();
	await expect(cards).toHaveCount(0);
	await preferences.click();
	await expect(
		page.getByRole("menuitemradio", { name: "流式" })
	).toHaveAttribute("aria-checked", "true");
	await page.getByRole("menuitemradio", { name: "来源分区" }).click();
	await page.keyboard.press("Escape");
	await expect(cards).toHaveCount(1);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(
						localStorage.getItem("opentrends:trends:display-settings") ?? "{}"
					).layout
			)
		)
		.toBe("sourceSections");
	await page.setViewportSize({ width: 375, height: 812 });
	await preferences.click();
	await expect(
		page.getByRole("menuitemradio", { name: "流式" })
	).toBeInViewport();
	await page.screenshot({ path: testInfo.outputPath("layout-mobile.png") });
	expect(errors).toEqual([]);
});
