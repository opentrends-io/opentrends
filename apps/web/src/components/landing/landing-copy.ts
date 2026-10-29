import type { Locale } from "@/lib/i18n";

import type { SourceKind } from "./landing-model";

// All the words on the landing page, by locale. English, Simplified and
// Traditional Chinese are written by hand; every other locale reads the
// English page. Each string is a fact the page can stand behind.

export interface Faq {
	answer: string;
	question: string;
}

export interface Blurb {
	body: string;
	title: string;
}

export interface LandingStrings {
	agentBody: string;
	agentGuide: string;
	agentPrompt: string;
	agentTitle: string;
	agentWays: string;
	briefBody: string;
	briefCited: string;
	briefExample: string;
	briefKicker: string;
	briefLive: (time: string) => string;
	briefTitle: string;
	continueReading: string;
	ctaAgent: string;
	ctaFeed: string;
	eventsBody: string;
	eventsExample: string;
	eventsKicker: string;
	eventsLive: string;
	eventsMergeLine: (count: number, first: string, hours: number) => string;
	eventsMore: string;
	eventsOriginal: string;
	eventsTitle: string;
	eyebrow: string;
	faq: Faq[];
	faqKicker: string;
	faqTitle: string;
	finalTitle: string;
	followCta: string;
	heroBody: (sourceCount: number | null) => string;
	heroTitle: string;
	kindLabels: Record<SourceKind, string>;
	mcpHint: string;
	openBody: string;
	openKicker: string;
	openStars: (stars: string) => string;
	openTitle: string;
	seoDescription: string;
	seoTitle: string;
	sourcesAll: string;
	sourcesBody: string;
	sourcesKicker: string;
	sourcesMore: (count: number) => string;
	sourcesShowAll: string;
	sourcesShowLess: string;
	sourcesTitle: (sourceCount: number | null) => string;
	views: Blurb[];
	viewsCaption: string;
	viewsOpen: string;
}

const EN: LandingStrings = {
	eyebrow: "Open source · Free · No account needed",
	heroTitle: "An information radar for people and AI.",
	heroBody: (n) =>
		`Only first-hand sources: company newsrooms, lab blogs and the original press. Stories several outlets report are merged into one event, every day gets a ten-line brief with its sources, and headlines are translated into your language. ${n ?? "Hundreds of"} sources, half English and half Chinese, most read straight from the publisher. Free, no account.`,
	ctaFeed: "Open today's feed",
	ctaAgent: "Connect Claude or Codex",
	mcpHint: "Your AI reads the same data. One command:",
	continueReading: "Continue where you left off",
	views: [
		{
			title: "Sources and rankings",
			body: "One card per source with its latest items; hot lists keep their own order.",
		},
		{
			title: "Events",
			body: "Stories several outlets are reporting, merged into one event with every outlet listed.",
		},
		{
			title: "Feed",
			body: "The newest items from every source in one stream, newest first, with covers.",
		},
	],
	viewsCaption: "Screenshots of the live site",
	viewsOpen: "Open this view",
	eventsKicker: "Events",
	eventsTitle:
		"Stories several outlets report become one event, in your language.",
	eventsBody:
		"When the same story shows up in more than one outlet, the reports are merged into one event with every outlet listed and each report's own wording a click away. Headlines are translated into eight languages with the original kept. Events filter press noise; lab blogs and communities like Hacker News are first-hand already and stay in their own cards.",
	eventsMergeLine: (count, first, hours) =>
		`${count} outlets · first reported by ${first} · within ${hours} h`,
	eventsLive: "Today · live",
	eventsExample: "Example",
	eventsOriginal: "Original",
	eventsMore: "Browse today's events",
	kindLabels: {
		author: "Author",
		community: "Community",
		hot: "Hot list",
		journal: "Journal",
		official: "Official",
		press: "Press",
	},
	briefKicker: "Brief",
	briefTitle: "Ten lines a day, each with its sources.",
	briefBody:
		"One brief per topic, rewritten through the day as items arrive. Follow any sources and the brief on your follow page is written from that list alone.",
	briefLive: (time) => `Today's brief · updated ${time}`,
	briefExample: "Example",
	briefCited: "Every line cites its sources",
	followCta: "Start following sources",
	agentTitle: "Your agent reads the same data",
	agentBody:
		"Point Claude, Codex or any MCP client at the MCP server, no key needed. Name your sources and it can pull today's updates whenever you ask. It cannot see the list in your browser, and it does not push.",
	agentPrompt: "Only what OpenAI, Anthropic and DeepMind published today",
	agentWays: "MCP · JSON API · RSS · llms.txt",
	agentGuide: "Setup guide for agents",
	sourcesKicker: "Sources",
	sourcesTitle: (n) =>
		`${n ?? "Hundreds of"} sources, most read straight from the publisher.`,
	sourcesBody:
		"Official newsrooms and research blogs, journals, open-source communities, individual authors, and the Chinese platforms that rarely appear in English-language feeds. A few hot lists and news rankings are kept as a reference and sit at the end. Every one is chosen by hand; the list is public in the repository.",
	sourcesAll: "All",
	sourcesShowAll: "Show all",
	sourcesShowLess: "Show fewer",
	sourcesMore: (count) => `All ${count} sources, with status`,
	openKicker: "Open source",
	openTitle: "MIT licensed. Run your own.",
	openBody:
		"The adapters, the ranking, the translation and the brief are in one public repository, and the source list is a single file. It deploys to Cloudflare Workers, D1 and KV; you need a Cloudflare account and your own model key.",
	openStars: (stars) => `${stars} stars on GitHub`,
	faqKicker: "Questions",
	faqTitle: "Frequently asked",
	faq: [
		{
			question: "How are sources chosen?",
			answer:
				"By hand. A source is added when it publishes first-hand: a company's own newsroom, a lab's blog, a journal, a maintainer's changelog, or a community where the people doing the work post. A few hot lists and news rankings are included as a reference for what people are reading; they do not take part in events. The list is public in the repository.",
		},
		{
			question: "How is this different from Google News or a feed reader?",
			answer:
				"Sources are read from the publisher's own feed wherever it offers one, English and Chinese sources sit in one stream, and every headline is translated with the original kept. Stories several outlets report are grouped into one event. Each day's brief cites its sources. And the whole thing is open source: an agent reads the same data over MCP, the API or RSS.",
		},
		{
			question: "How often does it update?",
			answer:
				"Sources are refreshed about every five minutes, each on its own schedule. A topic's brief is rewritten when new items arrive, and past briefs are kept in the archive and the calendar.",
		},
		{
			question: "How do I connect an AI agent?",
			answer:
				"Add the MCP server (https://api.opentrends.io/mcp, Streamable HTTP, no key) to Claude, Codex or any MCP client, or call the JSON API directly. The setup guide has the exact commands.",
		},
		{
			question: "Does it push updates to my agent?",
			answer:
				"No. MCP and the API are pull only: your agent fetches when you ask it to, and if you want a schedule, you set one on your side.",
		},
		{
			question: "Can I run it myself?",
			answer:
				"Yes. The repository deploys to Cloudflare Workers, D1, KV and Queues, and the source list is a single file you can edit. You need a Cloudflare account and a model API key for the translation and the brief.",
		},
		{
			question: "Do I need an account?",
			answer:
				"No. Reading, topics, following sources, RSS, the API and the MCP server are open to everyone. Signing in only syncs the sources you follow between devices.",
		},
	],
	finalTitle: "People read it. AI reads it. The same sources.",
	seoTitle: "An information radar for people and AI",
	seoDescription:
		"OpenTrends reads hundreds of first-hand sources across AI, hardware, biotech, programming and the Chinese web, merges the stories several outlets report into events, writes a cited daily brief, and translates headlines into eight languages. People read it on the page; agents read it over MCP, the API and RSS. Open source and free.",
};

const ZH: LandingStrings = {
	eyebrow: "开源 · 免费 · 无需注册",
	heroTitle: "人与 AI 共用的信息雷达。",
	heroBody: (n) =>
		`只收官方新闻室、实验室博客和原始媒体这类一手信源，多家都在报的事合并成一个事件，每天十条带出处的简报，标题翻成你的语言。${n ?? "数百"} 个信源，大多数直接抓发布方，中英各半；免费，不用注册。`,
	ctaFeed: "打开今日信息流",
	ctaAgent: "接入 Claude / Codex",
	mcpHint: "你的 AI 也能直接读，一条命令：",
	continueReading: "继续上次的阅读",
	views: [
		{
			title: "信源卡片与榜单",
			body: "每个信源一张卡片，直接看它最新的几条；各家热榜保持原来的排序。",
		},
		{
			title: "事件",
			body: "多家同时报道的新闻合并成一个事件，列出每一个来源。",
		},
		{
			title: "信息流",
			body: "所有信源的最新内容按时间汇成一条流，带封面，适合只想往下刷的时候。",
		},
	],
	viewsCaption: "线上页面真实截图",
	viewsOpen: "打开这个视图",
	eventsKicker: "事件",
	eventsTitle: "多家都在报的事合并成一个事件，标题翻成你的语言。",
	eventsBody:
		"同一件事在不止一家媒体出现时合并成一个事件，列出每一家，各家原话一步可达；标题译成 8 种语言，原文并列。事件用来筛媒体噪音；实验室博客、Hacker News 这类信源本来就是一手，不需要合并，单独成卡。",
	eventsMergeLine: (count, first, hours) =>
		`${count} 家报道 · 首报 ${first} · ${hours} 小时内`,
	eventsLive: "今日 · 实时",
	eventsExample: "示例",
	eventsOriginal: "原文",
	eventsMore: "浏览今日事件",
	kindLabels: {
		author: "个人",
		community: "社区",
		hot: "热榜",
		journal: "期刊",
		official: "官方",
		press: "媒体",
	},
	briefKicker: "简报",
	briefTitle: "每天十条，每条带出处。",
	briefBody:
		"每个板块各一份，一天里随新内容重写。关注任意信源，关注页上那份只按你的列表写。",
	briefLive: (time) => `今日简报 · ${time} 更新`,
	briefExample: "示例",
	briefCited: "每条附出处",
	followCta: "开始关注信源",
	agentTitle: "你的 Agent 读同一份数据",
	agentBody:
		"把 MCP server 接给 Claude、Codex 或任何客户端，不需要 key。告诉它信源名，它随时能拉今日更新；它看不到你浏览器里的关注列表，也不会主动推送。",
	agentPrompt: "只看 OpenAI、Anthropic、DeepMind 今天发了什么",
	agentWays: "MCP · JSON 接口 · RSS · llms.txt",
	agentGuide: "Agent 接入指南",
	sourcesKicker: "信源",
	sourcesTitle: (n) => `${n ?? "数百"} 个信源，大多数直接抓自发布方。`,
	sourcesBody:
		"官方新闻室和研究博客、期刊、开源社区、个人作者，以及很少出现在英文信息流里的中文平台；少数热榜和新闻排行只作参考，排在最后。每一个都是人工挑选，列表在仓库里公开。",
	sourcesAll: "全部",
	sourcesShowAll: "展开全部",
	sourcesShowLess: "收起",
	sourcesMore: (count) => `全部 ${count} 个信源及状态`,
	openKicker: "开源",
	openTitle: "MIT 协议，可以自己部署。",
	openBody:
		"抓取、排序、翻译和简报都在同一个公开仓库里，信源列表是一个文件。部署到 Cloudflare Workers、D1 和 KV，需要一个 Cloudflare 账号和你自己的模型 key。",
	openStars: (stars) => `GitHub ${stars} 星`,
	faqKicker: "常见问题",
	faqTitle: "你可能想问",
	faq: [
		{
			question: "信源是怎么选的？",
			answer:
				"人工挑选。一个信源会被收录，是因为它发布一手信息：公司自己的新闻室、实验室博客、期刊、维护者的更新日志，或者做事的人自己发帖的社区。少数热榜和新闻排行作为「大家在看什么」的参考收录，不参与事件合并。完整列表在仓库里公开。",
		},
		{
			question: "和 Google News 或 RSS 阅读器有什么不同？",
			answer:
				"信源以发布方原始订阅源为主，中英文汇在一条流里，每条标题都翻译并保留原文。多家报道的同一件事合并成一个事件。每天的简报带出处。而且整个站开源，Agent 通过 MCP、接口和 RSS 读同一份数据。",
		},
		{
			question: "多久更新一次？",
			answer:
				"信源大约每 5 分钟刷新一次，各有各的节奏。板块的简报在有新内容时重写，过去的简报保留在归档和日历里。",
		},
		{
			question: "AI Agent 怎么接入？",
			answer:
				"把 MCP server（https://api.opentrends.io/mcp，Streamable HTTP，不需要 key）加到 Claude、Codex 或任何 MCP 客户端，或者直接调 JSON 接口。接入指南里有现成的命令。",
		},
		{
			question: "会推送给我的 Agent 吗？",
			answer:
				"不会。MCP 和接口都是拉取：你的 Agent 想看时来取；要定时，就在你那边定时。",
		},
		{
			question: "可以自己部署吗？",
			answer:
				"可以。仓库部署到 Cloudflare Workers、D1、KV 和 Queues，信源列表是一个文件，改了就生效。需要一个 Cloudflare 账号，翻译和简报需要你自己的模型 API key。",
		},
		{
			question: "需要注册吗？",
			answer:
				"不需要。阅读、板块、关注信源、RSS、接口和 MCP server 对所有人开放。登录只用来在设备之间同步你关注的信源。",
		},
	],
	finalTitle: "人读，AI 也读，同一批信源。",
	seoTitle: "人与 AI 共用的信息雷达",
	seoDescription:
		"OpenTrends 读取 AI、硬件、生物科技、编程和中文互联网的数百个一手信源，把多家同时报道的新闻合并成事件，写带出处的每日简报，标题翻译成 8 种语言。人在页面上读，Agent 通过 MCP、接口、RSS 读。开源，免费。",
};

const ZH_HANT: LandingStrings = {
	eyebrow: "開源 · 免費 · 無需註冊",
	heroTitle: "人與 AI 共用的資訊雷達。",
	heroBody: (n) =>
		`只收官方新聞室、實驗室部落格和原始媒體這類一手信源，多家都在報的事合併成一個事件，每天十條附出處的簡報，標題翻成你的語言。${n ?? "數百"} 個信源，大多數直接抓發布方，中英各半；免費，不用註冊。`,
	ctaFeed: "打開今日資訊流",
	ctaAgent: "接入 Claude / Codex",
	mcpHint: "你的 AI 也能直接讀，一條命令：",
	continueReading: "繼續上次的閱讀",
	views: [
		{
			title: "信源卡片與榜單",
			body: "每個信源一張卡片，直接看它最新的幾條；各家熱榜保持原來的排序。",
		},
		{
			title: "事件",
			body: "多家同時報導的新聞合併成一個事件，列出每一個來源。",
		},
		{
			title: "資訊流",
			body: "所有信源的最新內容按時間匯成一條流，帶封面，適合只想往下滑的時候。",
		},
	],
	viewsCaption: "線上頁面真實截圖",
	viewsOpen: "打開這個視圖",
	eventsKicker: "事件",
	eventsTitle: "多家都在報的事合併成一個事件，標題翻成你的語言。",
	eventsBody:
		"同一件事在不止一家媒體出現時合併成一個事件，列出每一家，各家原話一步可達；標題譯成 8 種語言，原文並列。事件用來篩媒體噪音；實驗室部落格、Hacker News 這類信源本來就是一手，不需要合併，單獨成卡。",
	eventsMergeLine: (count, first, hours) =>
		`${count} 家報導 · 首報 ${first} · ${hours} 小時內`,
	eventsLive: "今日 · 即時",
	eventsExample: "示例",
	eventsOriginal: "原文",
	eventsMore: "瀏覽今日事件",
	kindLabels: {
		author: "個人",
		community: "社群",
		hot: "熱榜",
		journal: "期刊",
		official: "官方",
		press: "媒體",
	},
	briefKicker: "簡報",
	briefTitle: "每天十條，每條附出處。",
	briefBody:
		"每個板塊各一份，一天裡隨新內容重寫。關注任意信源，關注頁上那份只按你的列表寫。",
	briefLive: (time) => `今日簡報 · ${time} 更新`,
	briefExample: "示例",
	briefCited: "每條附出處",
	followCta: "開始關注信源",
	agentTitle: "你的 Agent 讀同一份資料",
	agentBody:
		"把 MCP server 接給 Claude、Codex 或任何客戶端，不需要 key。告訴它信源名，它隨時能拉今日更新；它看不到你瀏覽器裡的關注列表，也不會主動推送。",
	agentPrompt: "只看 OpenAI、Anthropic、DeepMind 今天發了什麼",
	agentWays: "MCP · JSON 介面 · RSS · llms.txt",
	agentGuide: "Agent 接入指南",
	sourcesKicker: "信源",
	sourcesTitle: (n) => `${n ?? "數百"} 個信源，大多數直接抓自發布方。`,
	sourcesBody:
		"官方新聞室和研究部落格、期刊、開源社群、個人作者，以及很少出現在英文資訊流裡的中文平台；少數熱榜和新聞排行只作參考，排在最後。每一個都是人工挑選，列表在倉庫裡公開。",
	sourcesAll: "全部",
	sourcesShowAll: "展開全部",
	sourcesShowLess: "收起",
	sourcesMore: (count) => `全部 ${count} 個信源及狀態`,
	openKicker: "開源",
	openTitle: "MIT 授權，可以自己部署。",
	openBody:
		"抓取、排序、翻譯和簡報都在同一個公開倉庫裡，信源列表是一個檔案。部署到 Cloudflare Workers、D1 和 KV，需要一個 Cloudflare 帳號和你自己的模型 key。",
	openStars: (stars) => `GitHub ${stars} 星`,
	faqKicker: "常見問題",
	faqTitle: "你可能想問",
	faq: [
		{
			question: "信源是怎麼選的？",
			answer:
				"人工挑選。一個信源會被收錄，是因為它發布一手資訊：公司自己的新聞室、實驗室部落格、期刊、維護者的更新日誌，或者做事的人自己發文的社群。少數熱榜和新聞排行作為「大家在看什麼」的參考收錄，不參與事件合併。完整列表在倉庫裡公開。",
		},
		{
			question: "和 Google News 或 RSS 閱讀器有什麼不同？",
			answer:
				"信源以發布方原始訂閱源為主，中英文匯在一條流裡，每條標題都翻譯並保留原文。多家報導的同一件事合併成一個事件。每天的簡報附出處。而且整個站開源，Agent 透過 MCP、介面和 RSS 讀同一份資料。",
		},
		{
			question: "多久更新一次？",
			answer:
				"信源大約每 5 分鐘更新一次，各有各的節奏。板塊的簡報在有新內容時重寫，過去的簡報保留在歸檔和日曆裡。",
		},
		{
			question: "AI Agent 怎麼接入？",
			answer:
				"把 MCP server（https://api.opentrends.io/mcp，Streamable HTTP，不需要 key）加到 Claude、Codex 或任何 MCP 客戶端，或者直接呼叫 JSON 介面。接入指南裡有現成的命令。",
		},
		{
			question: "會推送給我的 Agent 嗎？",
			answer:
				"不會。MCP 和介面都是拉取：你的 Agent 想看時來取；要定時，就在你那邊定時。",
		},
		{
			question: "可以自己部署嗎？",
			answer:
				"可以。倉庫部署到 Cloudflare Workers、D1、KV 和 Queues，信源列表是一個檔案，改了就生效。需要一個 Cloudflare 帳號，翻譯和簡報需要你自己的模型 API key。",
		},
		{
			question: "需要註冊嗎？",
			answer:
				"不需要。閱讀、板塊、關注信源、RSS、介面和 MCP server 對所有人開放。登入只用來在裝置之間同步你關注的信源。",
		},
	],
	finalTitle: "人讀，AI 也讀，同一批信源。",
	seoTitle: "人與 AI 共用的資訊雷達",
	seoDescription:
		"OpenTrends 讀取 AI、硬體、生物科技、程式設計和中文網路的數百個一手信源，把多家同時報導的新聞合併成事件，寫附出處的每日簡報，標題翻譯成 8 種語言。人在頁面上讀，Agent 透過 MCP、介面、RSS 讀。開源，免費。",
};

const STRINGS: Partial<Record<Locale, LandingStrings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function landingStrings(locale: Locale): LandingStrings {
	return STRINGS[locale] ?? EN;
}
