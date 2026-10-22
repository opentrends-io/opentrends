import type { Locale } from "@/lib/i18n";

import type { SourceKind } from "./landing-model";

// Landing page copy. English, Simplified and Traditional Chinese are written
// by hand; the other editions read the English page, like /agents. Counts
// are null when the API could not be read.

export interface Faq {
	answer: string;
	question: string;
}

export interface Blurb {
	body: string;
	title: string;
}

export interface LandingStrings {
	agentsBody: string;
	agentsGuide: string;
	agentsKicker: string;
	agentsMeta: string;
	agentsPrompt: string;
	agentsTitle: string;
	agentsWays: Blurb[];
	briefDegraded: string;
	briefEmpty: string;
	briefLabel: string;
	briefMore: string;
	briefUpdated: (ago: string) => string;
	continueReading: string;
	ctaFeed: string;
	ctaRss: string;
	eventsBody: string;
	eventsEmpty: string;
	eventsKicker: string;
	eventsMore: string;
	eventsReported: (count: number) => string;
	eventsTitle: string;
	eventsUpdated: (ago: string) => string;
	eyebrow: string;
	faq: Faq[];
	faqKicker: string;
	faqTitle: string;
	finalTitle: string;
	followAlt: string;
	followBody: string;
	followCta: string;
	followKicker: string;
	followPoints: string[];
	followTitle: string;
	heroBody: (sourceCount: number | null) => string;
	heroPoints: string[];
	heroTitle: string;
	kindLabels: Record<SourceKind, string>;
	languagesBody: string;
	languagesKicker: string;
	languagesOriginal: string;
	languagesTitle: string;
	mechanism: (sourceCount: number | null) => string;
	openBody: string;
	openKicker: string;
	openSelfHost: string;
	openStars: (stars: string) => string;
	openTitle: string;
	seoDescription: string;
	seoTitle: string;
	sourcesBody: (sourceCount: number | null) => string;
	sourcesKicker: string;
	sourcesMore: (count: number) => string;
	sourcesShowAll: (count: number) => string;
	sourcesShowLess: string;
	sourcesTitle: string;
	topicSources: (count: number) => string;
	views: Blurb[];
	viewsBody: string;
	viewsKicker: string;
	viewsTitle: string;
}

const EN: LandingStrings = {
	eyebrow: "Open source · Free · No account needed",
	heroTitle: "An information radar for the AI era.",
	heroBody: (n) =>
		`OpenTrends reads ${n ?? "hundreds of"} first-hand sources every five minutes and shows you what changed, in your language, with every source kept.`,
	heroPoints: [
		"Open source: run your own copy, add your own sources.",
		"Read the world's first-hand sources in your mother tongue.",
		"Built for agents: subscribe over MCP, the API, RSS or a skill.",
	],
	seoTitle: "An information radar for the AI era",
	seoDescription:
		"OpenTrends follows hundreds of first-hand sources across AI, hardware, biotech, programming and the Chinese web, translates them into eight languages, groups stories several outlets are reporting, and writes a cited daily brief. Open source, self-hostable, with an MCP server and API for agents.",
	ctaFeed: "Open today's feed",
	ctaRss: "Subscribe by RSS",
	continueReading: "Continue where you left off",
	briefLabel: "Today's brief",
	briefEmpty:
		"Today's brief is still being written. Open the feed to read the sources as they come in.",
	briefMore: "Read all ten lines",
	briefUpdated: (ago) => `Updated ${ago}`,
	briefDegraded:
		"The editor is catching up; these are today's newest items, not the written brief.",
	mechanism: (n) =>
		`Drawn from ${n ?? "hundreds of"} sources across 7 topics · refreshed every 5 minutes · 8 reading languages`,
	viewsKicker: "Three ways to read",
	viewsTitle: "The same sources, read the way you want.",
	viewsBody:
		"Scan every source at once, read the stories that several outlets are covering, or let the feed bring the newest items to you.",
	views: [
		{
			title: "Sources and rankings",
			body: "One card per source with its latest items, and the hot lists in their own order. The fastest way to see what each outlet is saying right now.",
		},
		{
			title: "Events",
			body: "Stories reported by several outlets, grouped into one event with every source listed and a cover from the primary report.",
		},
		{
			title: "Feed",
			body: "The newest items from every source in one stream, with covers and hot-list rankings, for when you just want to scroll.",
		},
	],
	eventsKicker: "Events",
	eventsTitle:
		"The news that several outlets are covering, picked out for you.",
	eventsBody:
		"When the same story shows up in more than one source, OpenTrends groups the reports into one event: the official announcement, the press and the community discussion side by side, so the day's important news stands out from the noise.",
	eventsReported: (count) => `${count} outlets`,
	eventsUpdated: (ago) => `Updated ${ago}`,
	eventsEmpty:
		"The events feed is quiet right now. Check back in a few minutes.",
	eventsMore: "Browse today's events",
	kindLabels: {
		author: "Author",
		community: "Community",
		hot: "Hot list",
		journal: "Journal",
		official: "Official",
		press: "Press",
	},
	languagesKicker: "In your language",
	languagesTitle: "Read the world's first-hand sources in your mother tongue.",
	languagesBody:
		"Every headline arrives translated into the language you read in. Chinese platforms and English newsrooms sit in the same feed, so you are no longer limited to what gets translated for you.",
	languagesOriginal:
		"The original title stays alongside the translation, so you can always check it.",
	followKicker: "Your sources",
	followTitle: "Follow what you care about. The AI writes the brief.",
	followBody:
		"Pick any sources, from any topic, and your own page shows what they published today, in one view, with a ten-line brief written just from them.",
	followPoints: [
		"No account needed; your list lives in your browser and syncs if you sign in.",
		"Pin, reorder or hide sources; the brief follows your list.",
		"Works for a company's channels, a field, or a reading list you keep.",
	],
	followCta: "Start following sources",
	followAlt:
		"The followed-sources page: a ten-line brief at the top, then one card per followed source",
	agentsKicker: "Built for agents",
	agentsTitle: "Your AI can subscribe too.",
	agentsBody:
		"Everything a reader sees is also available as data, without an API key. Point Claude, Codex or any MCP client at OpenTrends and ask what happened today.",
	agentsPrompt: "What happened in tech today?",
	agentsMeta: "10 lines · with citations",
	agentsWays: [
		{
			title: "MCP server",
			body: "get_digest, get_topic, get_source, get_article and search, over Streamable HTTP.",
		},
		{
			title: "JSON API",
			body: "The brief and every topic, source and event as structured data.",
		},
		{
			title: "RSS",
			body: "An item feed and a digest feed for every topic.",
		},
		{
			title: "Agent skill and llms.txt",
			body: "A SKILL.md for coding agents and a map of the site for crawlers.",
		},
	],
	agentsGuide: "Setup guide for agents",
	sourcesKicker: "Sources",
	sourcesTitle: "Hand-picked, first-hand.",
	sourcesBody: (n) =>
		`Every one of the ${n ?? ""} sources is chosen by hand and read where it publishes: official newsrooms and research blogs, journals, open-source communities, individual authors, and the Chinese platforms that rarely appear in English-language feeds.`,
	sourcesShowAll: (count) => `Show all ${count}`,
	sourcesShowLess: "Show fewer",
	sourcesMore: (count) => `All ${count} sources, with status`,
	topicSources: (count) => `${count} sources`,
	openKicker: "Open source",
	openTitle: "MIT licensed. Run your own.",
	openBody:
		"The adapters, the ranking, the translation and the brief are all in one public repository. Read how a source is fetched, open an issue for one that is missing, or add your own.",
	openSelfHost:
		"Deploys to Cloudflare Workers, D1 and KV with one command, so a private copy with your own sources costs nothing to run.",
	openStars: (stars) => `${stars} stars on GitHub`,
	faqKicker: "Questions",
	faqTitle: "Frequently asked",
	faq: [
		{
			question: "How are sources chosen?",
			answer:
				"By hand. A source is added when it publishes first-hand: a company's own newsroom, a lab's blog, a journal, a maintainer's changelog, or a community where the people doing the work post. Aggregators that only repeat other outlets are left out, and the list is public in the repository.",
		},
		{
			question: "How often does it update?",
			answer:
				"Sources are refreshed about every five minutes, each on its own schedule. The daily brief for each topic is rewritten through the day as new items arrive, and past briefs are kept in the archive and the calendar.",
		},
		{
			question: "How is this different from Google News or a feed reader?",
			answer:
				"Every item comes from a first-hand source rather than a syndication of one. Stories that several outlets report are grouped into one event. Every headline is translated into your reading language with the original kept. And the whole thing is open source and reachable by agents.",
		},
		{
			question: "Can I run it myself?",
			answer:
				"Yes. The repository deploys to Cloudflare Workers, D1, KV and Queues with one command, and the source list is a single file you can edit. The free tier is enough for a personal copy.",
		},
		{
			question: "How do I connect an AI agent?",
			answer:
				"Add the MCP server (https://api.opentrends.io/mcp, Streamable HTTP, no key) to Claude, Codex or any MCP client, or call the JSON API directly. The setup guide has the exact commands.",
		},
		{
			question: "Do I need an account?",
			answer:
				"No. Reading, topics, following sources, RSS, the API and the MCP server are open to everyone. Signing in only syncs the sources you follow between devices.",
		},
	],
	finalTitle: "Read the world first-hand. Let your AI read it too.",
};

const ZH: LandingStrings = {
	eyebrow: "开源 · 免费 · 无需注册",
	heroTitle: "AI 时代的信息雷达。",
	heroBody: (n) =>
		`OpenTrends 每 5 分钟读一遍${n ? ` ${n} ` : "数百"}个一手信源，用你的语言告诉你发生了什么，每一条都保留来源。`,
	heroPoints: [
		"完全开源：可以自己部署，加自己的信源。",
		"用母语读全世界的一手信息。",
		"对 AI 友好：MCP、API、RSS、Skill 都能订阅。",
	],
	seoTitle: "AI 时代的信息雷达",
	seoDescription:
		"OpenTrends 追踪 AI、硬件、生物科技、编程和中文互联网的数百个一手信源，翻译成 8 种语言，把多家同时报道的新闻合并成事件，并写一份带出处的每日简报。开源、可自部署，提供 MCP server 和 API 供 Agent 接入。",
	ctaFeed: "打开今日信息流",
	ctaRss: "RSS 订阅",
	continueReading: "继续上次的阅读",
	briefLabel: "今日简报",
	briefEmpty: "今日简报还在生成中。打开信息流，先看各信源的最新内容。",
	briefMore: "阅读全部十条",
	briefUpdated: (ago) => `更新于${ago}`,
	briefDegraded: "编辑还在赶工：这几条是今天最新的内容，还不是写好的简报。",
	mechanism: (n) =>
		`来自 7 个板块、${n ?? "数百"} 个信源 · 每 5 分钟刷新 · 8 种阅读语言`,
	viewsKicker: "三种看法",
	viewsTitle: "同一批信源，按你习惯的方式看。",
	viewsBody:
		"一眼扫完所有信源，只看多家都在报的事件，或者让信息流把最新内容送到你面前。",
	views: [
		{
			title: "信源卡片与榜单",
			body: "每个信源一张卡片，直接看它最新的几条；各家热榜保持原来的排序。想知道每一家现在在说什么，这是最快的方式。",
		},
		{
			title: "事件",
			body: "多家同时报道的新闻合并成一个事件，列出每一个来源，配上原始报道的头图。",
		},
		{
			title: "推荐流",
			body: "所有信源的最新内容汇成一条流，带封面和热榜名次，适合只想往下刷的时候。",
		},
	],
	eventsKicker: "事件",
	eventsTitle: "多家都在报的新闻，替你挑出来。",
	eventsBody:
		"同一件事在不止一个信源里出现时，OpenTrends 把这些报道合并成一个事件：官方公告、媒体报道和社区讨论并排放着，今天真正重要的新闻就从噪音里浮出来了。",
	eventsReported: (count) => `${count} 个来源`,
	eventsUpdated: (ago) => `更新于${ago}`,
	eventsEmpty: "事件流暂时没有内容，过几分钟再来看。",
	eventsMore: "浏览今日事件",
	kindLabels: {
		author: "个人",
		community: "社区",
		hot: "热榜",
		journal: "期刊",
		official: "官方",
		press: "媒体",
	},
	languagesKicker: "用母语看世界",
	languagesTitle: "用母语读全世界的一手信息。",
	languagesBody:
		"每条标题都翻译成你的阅读语言。中文平台和英文新闻室在同一条信息流里，不再只能看别人翻译给你的那一部分。",
	languagesOriginal: "原文标题保留在译文旁边，随时可以核对。",
	followKicker: "你的信源",
	followTitle: "关注你在意的，AI 替你写简报。",
	followBody:
		"从任何板块挑任意信源，你自己的页面就会把它们今天的更新放在一起，一目了然，再附上一份只根据这些信源写的十条简报。",
	followPoints: [
		"不用注册：关注列表存在浏览器里，登录后跨设备同步。",
		"可以置顶、排序、隐藏信源，简报跟着你的列表走。",
		"适合盯一家公司的各个渠道、一个领域，或者你自己的阅读清单。",
	],
	followCta: "开始关注信源",
	followAlt: "关注页：顶部是十条简报，下面每个关注的信源一张卡片",
	agentsKicker: "为 Agent 而建",
	agentsTitle: "你的 AI 也能订阅。",
	agentsBody:
		"读者看到的一切都有数据版本，不需要 API key。把 OpenTrends 接给 Claude、Codex 或任何 MCP 客户端，问它今天发生了什么。",
	agentsPrompt: "今天科技圈发生了什么？",
	agentsMeta: "10 条 · 附引用",
	agentsWays: [
		{
			title: "MCP server",
			body: "get_digest、get_topic、get_source、get_article、search，走 Streamable HTTP。",
		},
		{ title: "JSON 接口", body: "简报和每个板块、信源、事件都是结构化数据。" },
		{ title: "RSS", body: "每个板块都有内容订阅源和简报订阅源。" },
		{
			title: "Agent skill 和 llms.txt",
			body: "给编码 Agent 的 SKILL.md，给爬虫的站点地图。",
		},
	],
	agentsGuide: "Agent 接入指南",
	sourcesKicker: "信源",
	sourcesTitle: "人工精选，直达一手。",
	sourcesBody: (n) =>
		`${n ? `${n} ` : ""}个信源每一个都是人工挑选，并在它发布的地方读取：官方新闻室和研究博客、期刊、开源社区、个人作者，以及很少出现在英文信息流里的中文平台。`,
	sourcesShowAll: (count) => `展开全部 ${count} 个`,
	sourcesShowLess: "收起",
	sourcesMore: (count) => `全部 ${count} 个信源及状态`,
	topicSources: (count) => `${count} 个信源`,
	openKicker: "开源",
	openTitle: "MIT 协议，可以自己部署。",
	openBody:
		"抓取适配器、排序、翻译和简报都在同一个公开仓库里。可以看一个信源是怎么抓的，缺了哪个信源就提 issue，或者自己加。",
	openSelfHost:
		"一条命令部署到 Cloudflare Workers、D1 和 KV，一份只放你自己信源的私有副本几乎不花钱。",
	openStars: (stars) => `GitHub ${stars} 星`,
	faqKicker: "常见问题",
	faqTitle: "你可能想问",
	faq: [
		{
			question: "信源是怎么选的？",
			answer:
				"人工挑选。一个信源会被收录，是因为它发布一手信息：公司自己的新闻室、实验室博客、期刊、维护者的更新日志，或者做事的人自己发帖的社区。只转述别家的聚合站不收。完整列表在仓库里公开。",
		},
		{
			question: "多久更新一次？",
			answer:
				"信源大约每 5 分钟刷新一次，各有各的节奏。每个板块的今日简报会随着新内容到来在一天里反复重写，过去的简报保留在归档和日历里。",
		},
		{
			question: "和 Google News 或 RSS 阅读器有什么不同？",
			answer:
				"每一条都来自一手信源，而不是别人的转载。多家报道的同一件事合并成一个事件。每条标题都翻译成你的阅读语言并保留原文。而且整个站开源，Agent 也能直接读。",
		},
		{
			question: "可以自己部署吗？",
			answer:
				"可以。仓库一条命令就能部署到 Cloudflare Workers、D1、KV 和 Queues，信源列表是一个文件，改了就生效。免费额度够一份个人副本用。",
		},
		{
			question: "AI Agent 怎么接入？",
			answer:
				"把 MCP server（https://api.opentrends.io/mcp，Streamable HTTP，不需要 key）加到 Claude、Codex 或任何 MCP 客户端，或者直接调 JSON 接口。接入指南里有现成的命令。",
		},
		{
			question: "需要注册吗？",
			answer:
				"不需要。阅读、板块、关注信源、RSS、接口和 MCP server 对所有人开放。登录只用来在设备之间同步你关注的信源。",
		},
	],
	finalTitle: "用母语读一手信息，也让你的 AI 读。",
};

const ZH_HANT: LandingStrings = {
	eyebrow: "開源 · 免費 · 無需註冊",
	heroTitle: "AI 時代的資訊雷達。",
	heroBody: (n) =>
		`OpenTrends 每 5 分鐘讀一遍${n ? ` ${n} ` : "數百"}個一手信源，用你的語言告訴你發生了什麼，每一條都保留來源。`,
	heroPoints: [
		"完全開源：可以自己部署，加自己的信源。",
		"用母語讀全世界的一手資訊。",
		"對 AI 友善：MCP、API、RSS、Skill 都能訂閱。",
	],
	seoTitle: "AI 時代的資訊雷達",
	seoDescription:
		"OpenTrends 追蹤 AI、硬體、生物科技、程式設計和中文網路的數百個一手信源，翻譯成 8 種語言，把多家同時報導的新聞合併成事件，並寫一份附出處的每日簡報。開源、可自部署，提供 MCP server 和 API 供 Agent 接入。",
	ctaFeed: "打開今日資訊流",
	ctaRss: "RSS 訂閱",
	continueReading: "繼續上次的閱讀",
	briefLabel: "今日簡報",
	briefEmpty: "今日簡報還在生成中。打開資訊流，先看各信源的最新內容。",
	briefMore: "閱讀全部十條",
	briefUpdated: (ago) => `更新於${ago}`,
	briefDegraded: "編輯還在趕工：這幾條是今天最新的內容，還不是寫好的簡報。",
	mechanism: (n) =>
		`來自 7 個板塊、${n ?? "數百"} 個信源 · 每 5 分鐘更新 · 8 種閱讀語言`,
	viewsKicker: "三種看法",
	viewsTitle: "同一批信源，按你習慣的方式看。",
	viewsBody:
		"一眼掃完所有信源，只看多家都在報的事件，或者讓資訊流把最新內容送到你面前。",
	views: [
		{
			title: "信源卡片與榜單",
			body: "每個信源一張卡片，直接看它最新的幾條；各家熱榜保持原來的排序。想知道每一家現在在說什麼，這是最快的方式。",
		},
		{
			title: "事件",
			body: "多家同時報導的新聞合併成一個事件，列出每一個來源，配上原始報導的頭圖。",
		},
		{
			title: "推薦流",
			body: "所有信源的最新內容匯成一條流，帶封面和熱榜名次，適合只想往下滑的時候。",
		},
	],
	eventsKicker: "事件",
	eventsTitle: "多家都在報的新聞，替你挑出來。",
	eventsBody:
		"同一件事在不止一個信源裡出現時，OpenTrends 把這些報導合併成一個事件：官方公告、媒體報導和社群討論並排放著，今天真正重要的新聞就從噪音裡浮出來了。",
	eventsReported: (count) => `${count} 個來源`,
	eventsUpdated: (ago) => `更新於${ago}`,
	eventsEmpty: "事件流暫時沒有內容，過幾分鐘再來看。",
	eventsMore: "瀏覽今日事件",
	kindLabels: {
		author: "個人",
		community: "社群",
		hot: "熱榜",
		journal: "期刊",
		official: "官方",
		press: "媒體",
	},
	languagesKicker: "用母語看世界",
	languagesTitle: "用母語讀全世界的一手資訊。",
	languagesBody:
		"每條標題都翻譯成你的閱讀語言。中文平台和英文新聞室在同一條資訊流裡，不再只能看別人翻譯給你的那一部分。",
	languagesOriginal: "原文標題保留在譯文旁邊，隨時可以核對。",
	followKicker: "你的信源",
	followTitle: "關注你在意的，AI 替你寫簡報。",
	followBody:
		"從任何板塊挑任意信源，你自己的頁面就會把它們今天的更新放在一起，一目了然，再附上一份只根據這些信源寫的十條簡報。",
	followPoints: [
		"不用註冊：關注列表存在瀏覽器裡，登入後跨裝置同步。",
		"可以置頂、排序、隱藏信源，簡報跟著你的列表走。",
		"適合盯一家公司的各個管道、一個領域，或者你自己的閱讀清單。",
	],
	followCta: "開始關注信源",
	followAlt: "關注頁：頂部是十條簡報，下面每個關注的信源一張卡片",
	agentsKicker: "為 Agent 而建",
	agentsTitle: "你的 AI 也能訂閱。",
	agentsBody:
		"讀者看到的一切都有資料版本，不需要 API key。把 OpenTrends 接給 Claude、Codex 或任何 MCP 客戶端，問它今天發生了什麼。",
	agentsPrompt: "今天科技圈發生了什麼？",
	agentsMeta: "10 條 · 附引用",
	agentsWays: [
		{
			title: "MCP server",
			body: "get_digest、get_topic、get_source、get_article、search，走 Streamable HTTP。",
		},
		{ title: "JSON 介面", body: "簡報和每個板塊、信源、事件都是結構化資料。" },
		{ title: "RSS", body: "每個板塊都有內容訂閱源和簡報訂閱源。" },
		{
			title: "Agent skill 和 llms.txt",
			body: "給編碼 Agent 的 SKILL.md，給爬蟲的站點地圖。",
		},
	],
	agentsGuide: "Agent 接入指南",
	sourcesKicker: "信源",
	sourcesTitle: "人工精選，直達一手。",
	sourcesBody: (n) =>
		`${n ? `${n} ` : ""}個信源每一個都是人工挑選，並在它發布的地方讀取：官方新聞室和研究部落格、期刊、開源社群、個人作者，以及很少出現在英文資訊流裡的中文平台。`,
	sourcesShowAll: (count) => `展開全部 ${count} 個`,
	sourcesShowLess: "收起",
	sourcesMore: (count) => `全部 ${count} 個信源及狀態`,
	topicSources: (count) => `${count} 個信源`,
	openKicker: "開源",
	openTitle: "MIT 授權，可以自己部署。",
	openBody:
		"抓取適配器、排序、翻譯和簡報都在同一個公開倉庫裡。可以看一個信源是怎麼抓的，缺了哪個信源就開 issue，或者自己加。",
	openSelfHost:
		"一條命令部署到 Cloudflare Workers、D1 和 KV，一份只放你自己信源的私有副本幾乎不花錢。",
	openStars: (stars) => `GitHub ${stars} 星`,
	faqKicker: "常見問題",
	faqTitle: "你可能想問",
	faq: [
		{
			question: "信源是怎麼選的？",
			answer:
				"人工挑選。一個信源會被收錄，是因為它發布一手資訊：公司自己的新聞室、實驗室部落格、期刊、維護者的更新日誌，或者做事的人自己發文的社群。只轉述別家的聚合站不收。完整列表在倉庫裡公開。",
		},
		{
			question: "多久更新一次？",
			answer:
				"信源大約每 5 分鐘更新一次，各有各的節奏。每個板塊的今日簡報會隨著新內容到來在一天裡反覆重寫，過去的簡報保留在歸檔和日曆裡。",
		},
		{
			question: "和 Google News 或 RSS 閱讀器有什麼不同？",
			answer:
				"每一條都來自一手信源，而不是別人的轉載。多家報導的同一件事合併成一個事件。每條標題都翻譯成你的閱讀語言並保留原文。而且整個站開源，Agent 也能直接讀。",
		},
		{
			question: "可以自己部署嗎？",
			answer:
				"可以。倉庫一條命令就能部署到 Cloudflare Workers、D1、KV 和 Queues，信源列表是一個檔案，改了就生效。免費額度夠一份個人副本用。",
		},
		{
			question: "AI Agent 怎麼接入？",
			answer:
				"把 MCP server（https://api.opentrends.io/mcp，Streamable HTTP，不需要 key）加到 Claude、Codex 或任何 MCP 客戶端，或者直接呼叫 JSON 介面。接入指南裡有現成的命令。",
		},
		{
			question: "需要註冊嗎？",
			answer:
				"不需要。閱讀、板塊、關注信源、RSS、介面和 MCP server 對所有人開放。登入只用來在裝置之間同步你關注的信源。",
		},
	],
	finalTitle: "用母語讀一手資訊，也讓你的 AI 讀。",
};

const STRINGS: Partial<Record<Locale, LandingStrings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function landingStrings(locale: Locale): LandingStrings {
	return STRINGS[locale] ?? EN;
}
