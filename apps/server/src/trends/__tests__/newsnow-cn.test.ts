import { afterEach, describe, expect, test } from "bun:test";

import { newsnowCnAdapter } from "../adapters/native/newsnow-cn";
import type { SourceId } from "../types";

// Trimmed from the live pages on 2026-11-12, when all three sources had
// been returning no usable items for weeks.

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

function serve(
	handler: (url: string, init?: RequestInit) => string | null
): string[] {
	const requested: string[] = [];
	globalThis.fetch = ((input: unknown, init?: RequestInit) => {
		const url = String(input);
		requested.push(url);
		const body = handler(url, init);
		return Promise.resolve(
			body === null
				? new Response("not found", { status: 404 })
				: new Response(body, { status: 200 })
		);
	}) as typeof fetch;
	return requested;
}

function read(sourceId: string) {
	return newsnowCnAdapter.fetch({
		signal: new AbortController().signal,
		sourceId: sourceId as SourceId,
	});
}

// An express flash: the headline is a span, the item's page is on the
// share box; the headline page carries the same flashes in a sidebar.
const FASTBULL_FLASH = `<div class="news-list content-list-4352741_212_1 preview-content-list" data-id="4352741_212_1" data-date="1794446512207"><div class="time"><span class="time_value" data-time="1794446512207"></span><div class="shear_box box_show" data-title="中国央行公开市场今日净投放1970亿元人民币。" data-href="/cn/fastshort/4352741_212_1"><a href="mailto:?subject=x" class="mail shear_type"></a></div></div><div class="news-list-content"><p class="content-title"><span class="title_name">中国央行公开市场今日净投放1970亿元人民币。</span></p></div></div>
<div class="news-list content-list-4352740_1_1 preview-content-list important-list talk" data-id="4352740_1_1" data-date="1794446461896"><div class="news-list-content"><p class="content-title"><span class="title_name">【美伊谈判】特朗普称战事即将结束</span></p></div></div>`;

const FASTBULL_HEADLINES = `<div class="news-top-item"><a data-opt="1" href="/cn/news-detail/4387564_1" data-id="4387564_1" class="trending_type click_opt"><h4 class="title ltr_ar_dir">特朗普称美伊战事即将结束，伊朗威胁打击欧洲美军基地</h4><p class="resourcetime"><span class="new_time" data-date="1794446655993"></span></p></a></div>
<aside>${FASTBULL_FLASH}</aside>`;

describe("法布财经", () => {
	test("express flashes link to their own pages", async () => {
		serve((url) => (url.endsWith("/cn/express-news") ? FASTBULL_FLASH : null));
		const items = await read("fastbull-express");
		expect(
			items.map((item) => [item.title, item.url, item.publishedAt])
		).toEqual([
			[
				"中国央行公开市场今日净投放1970亿元人民币。",
				"https://www.fastbull.com/cn/fastshort/4352741_212_1",
				1_794_446_512_207,
			],
			[
				"美伊谈判",
				"https://www.fastbull.com/cn/fastshort/4352740_1_1",
				1_794_446_461_896,
			],
		]);
	});

	test("headlines keep to the articles, not the sidebar's flashes", async () => {
		serve((url) => (url.endsWith("/cn/news") ? FASTBULL_HEADLINES : null));
		const items = await read("fastbull-news");
		expect(items.map((item) => [item.title, item.url])).toEqual([
			[
				"特朗普称美伊战事即将结束，伊朗威胁打击欧洲美军基地",
				"https://www.fastbull.com/cn/news-detail/4387564_1",
			],
		]);
	});
});

// The China page moved from /realtime/china to /news/china, and every
// story is linked twice: once from its picture, once from its headline.
const ZAOBAO_CHINA = `<a href="/news/china/story20261112-9984446"><img src="x.jpg"></a>
<a href="/news/china/story20261112-9984446"><h2>陆客被要求写两岸互不隶属声明 国台办批政治操弄</h2></a>
<a href="/news/china/story20261112-9984388"><img src="y.jpg"></a>
<a href="/news/china/story20261112-9984388">美国务院：鲁比奥与王毅同意高层有意义对话重要性</a>
<a href="/news/singapore">新加坡</a>
<a href="/realtime">即时</a>`;

describe("联合早报", () => {
	test("reads the stories on the China page, once each", async () => {
		const requested = serve((url) =>
			url === "https://www.zaobao.com.sg/news/china" ? ZAOBAO_CHINA : null
		);
		const items = await read("zaobao");
		expect(requested).toEqual(["https://www.zaobao.com.sg/news/china"]);
		expect(items.map((item) => [item.title, item.url])).toEqual([
			[
				"陆客被要求写两岸互不隶属声明 国台办批政治操弄",
				"https://www.zaobao.com.sg/news/china/story20261112-9984446",
			],
			[
				"美国务院：鲁比奥与王毅同意高层有意义对话重要性",
				"https://www.zaobao.com.sg/news/china/story20261112-9984388",
			],
		]);
	});
});

describe("腾讯视频 · 热搜榜", () => {
	test("sends the strategy info the ranking now requires", async () => {
		// Without mvl_strategy_info the service answers ret=0 and no data.
		serve((_url, init) => {
			const body = JSON.parse(String(init?.body ?? "{}"));
			const info = body.flip_info?.flip_params?.mvl_strategy_info;
			if (!(typeof info === "string" && JSON.parse(info).default_strategy_id)) {
				return JSON.stringify({ data: {}, msg: "", ret: 0 });
			}
			return JSON.stringify({
				data: {
					card: {
						children_list: {
							list: {
								cards: [
									{ id: "mzc00200abc", params: { title: "走马上任" } },
									{ id: "mzc00200def", params: { title: "尚公主" } },
								],
							},
						},
					},
				},
				msg: "",
				ret: 0,
			});
		});
		const items = await read("qqvideo-tv-hotsearch");
		expect(items.map((item) => [item.title, item.url])).toEqual([
			["走马上任", "https://v.qq.com/x/cover/mzc00200abc.html"],
			["尚公主", "https://v.qq.com/x/cover/mzc00200def.html"],
		]);
	});
});
