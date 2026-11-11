import { expect, test } from "@playwright/test";

const STORY_TITLE = /三家报道的同一事件/;
const SHOW_BRIEFS = /展开|查看.*简讯|Show/;
const REPORT_TITLE = /报道正文 0/;

test("stories, briefs and reporting timeline remain usable on mobile", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.route("**/*", (route) =>
		new URL(route.request().url()).origin === "http://127.0.0.1:4178"
			? route.continue()
			: route.abort()
	);
	const time = new Date().toISOString();
	const story = {
		eventId: "story1",
		title: "三家报道的同一事件",
		topicId: "ai",
		sourceCount: 3,
		firstSeenAt: time,
		lastSeenAt: time,
		score: 150,
		sources: ["one", "two", "three"].map((id) => ({ sourceId: id, title: id })),
		publishers: ["one", "two", "three"].map((id) => ({
			id,
			title: id,
			firstAt: time,
			latestAt: time,
		})),
	};
	await page.route("**/api/event-pages**", (route) =>
		route.fulfill({ json: { pages: [] } })
	);
	await page.route("**/api/events?**", (route) => {
		const briefs =
			new URL(route.request().url()).searchParams.get("view") === "briefs";
		return route.fulfill({
			json: {
				events: briefs
					? Array.from({ length: 12 }, (_, i) => ({
							...story,
							eventId: `brief${i}`,
							title: `单源简讯 ${i}`,
							sourceCount: 1,
							publishers: undefined,
						}))
					: [story],
			},
		});
	});
	await page.route("**/api/events/story1?**", (route) =>
		route.fulfill({
			json: {
				...story,
				sourceItems: story.sources.map((s, i) => ({
					...s,
					itemId: String(i),
					title: `报道正文 ${i}`,
					url: `https://example.test/${i}`,
					publishedAt: time,
				})),
			},
		})
	);
	await page.goto("/e2e/fixtures/event-preview.html");
	await expect(page.getByRole("button", { name: STORY_TITLE })).toBeVisible();
	await expect(page.getByText("单源简讯 0", { exact: true })).toBeVisible();
	await expect(page.getByText("单源简讯 11", { exact: true })).toHaveCount(0);
	await page.getByRole("button", { name: SHOW_BRIEFS }).click();
	await expect(page.getByText("单源简讯 11", { exact: true })).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	await page.getByRole("button", { name: STORY_TITLE }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await expect(page.getByRole("link", { name: REPORT_TITLE })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("event-mobile.png") });
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	expect(errors).toEqual([]);
});
