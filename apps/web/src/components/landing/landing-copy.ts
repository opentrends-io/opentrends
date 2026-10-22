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

export interface UseCase {
	chips: string[];
	label: string;
	scenario: string;
}

export interface LandingStrings {
	agentsGuide: string;
	agentsPrompt: string;
	agentsSourcePrompt: string;
	agentsWays: Blurb[];
	briefCited: string;
	briefDemoLabel: string;
	continueReading: string;
	ctaAgent: string;
	ctaFeed: string;
	customizeAgent: Blurb;
	customizeBody: (sourceCount: number | null) => string;
	customizeBrief: Blurb;
	customizeFollow: Blurb;
	customizeKicker: string;
	customizeTitle: string;
	eventsBody: string;
	eventsExampleNote: (date: string) => string;
	eventsHighSignal: string;
	eventsKicker: string;
	eventsMerged: string;
	eventsMore: string;
	eventsReported: (count: number) => string;
	eventsTitle: string;
	eyebrow: string;
	faq: Faq[];
	faqKicker: string;
	faqTitle: string;
	finalTitle: string;
	followBriefLabel: string;
	followCta: string;
	followDemoSources: string;
	heroAgentNote: string;
	heroBody: (sourceCount: number | null) => string;
	heroForAgents: string;
	heroForPeople: string;
	heroPeopleNote: string;
	heroPoints: string[];
	heroTitle: string;
	kindLabels: Record<SourceKind, string>;
	languagesBody: string;
	languagesKicker: string;
	languagesOriginal: string;
	languagesOriginalLabel: string;
	languagesPick: string;
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
	sourcesSitesNote: (sites: number, feeds: number) => string;
	sourcesTitle: string;
	topicSources: (count: number) => string;
	useCases: UseCase[];
	useCasesBody: string;
	useCasesKicker: string;
	useCasesTitle: string;
	views: Blurb[];
	viewsBody: string;
	viewsKicker: string;
	viewsOpen: string;
	viewsTitle: string;
}

const EN: LandingStrings = {
	eyebrow: "Open source · Free · No account needed",
	heroTitle: "An information radar for people and AI.",
	heroBody: (n) =>
		`Every five minutes OpenTrends reads ${n ?? "hundreds of"} first-hand sources, merges the stories several outlets report, writes a cited ten-line brief and translates the headlines into your language. You read it on the page; your AI reads it over MCP. Same data.`,
	heroPoints: [
		"The page for people; MCP, API, RSS and a skill for agents, no key needed.",
		"Hand-picked first-hand sources across 7 topics, refreshed every 5 minutes.",
		"English and Chinese sources, all in your language, original kept.",
		"Follow any sources and the brief is written from them alone. Open source, self-hostable.",
	],
	ctaFeed: "Open today's feed",
	ctaAgent: "Connect your AI (MCP)",
	heroForPeople: "For people",
	heroForAgents: "For agents",
	heroPeopleNote: "Read in your language",
	heroAgentNote: "The same items over MCP",
	continueReading: "Continue where you left off",
	mechanism: (n) =>
		`${n ?? "Hundreds of"} sources across 7 topics · refreshed every 5 minutes · 8 reading languages · no API key`,
	agentsPrompt: "What happened in tech today?",
	seoTitle: "An information radar for people and AI",
	seoDescription:
		"OpenTrends follows hundreds of first-hand sources across AI, hardware, biotech, programming and the Chinese web, merges the stories several outlets report, writes a cited daily brief, and translates it into eight languages. People read it on the page; agents read it over MCP, the API and RSS. Open source and self-hostable.",
	viewsKicker: "Three ways to read",
	viewsTitle: "The same sources, read the way you want.",
	viewsBody:
		"Scan every source at once, read only the stories several outlets are covering, or scroll one stream of the newest items, newest first.",
	viewsOpen: "Open this view",
	views: [
		{
			title: "Sources and rankings",
			body: "One card per source with its latest items, and the hot lists in their own order. The fastest way to see what each outlet is saying right now.",
		},
		{
			title: "Events",
			body: "Stories several outlets are reporting, merged into one event with every source listed and a cover from the primary report.",
		},
		{
			title: "Feed",
			body: "The newest items from every source in one stream, newest first, with covers and hot-list rankings, for when you just want to scroll.",
		},
	],
	eventsKicker: "Events",
	eventsTitle:
		"The news that several outlets are covering, picked out for you.",
	eventsBody:
		"When the same story shows up in more than one outlet, OpenTrends groups the reports into one event with every outlet listed, so the day's important news stands out from the noise and each report's own wording is a click away. Events are built from press reports; lab blogs and communities like Hacker News stay in their own cards.",
	eventsReported: (count) => `${count} outlets`,
	eventsExampleNote: (date) => `Example · ${date}`,
	eventsHighSignal: "Several outlets reporting",
	eventsMerged: "Merged into one event",
	eventsMore: "Browse today's events",
	kindLabels: {
		author: "Author",
		community: "Community",
		hot: "Hot list",
		journal: "Journal",
		official: "Official",
		press: "Press",
	},
	languagesKicker: "Into your language",
	languagesTitle: "Whatever language it was written in, you read it in yours.",
	languagesBody:
		"The sources are mostly English newsrooms and Chinese platforms. AI translates every headline into the language you read in, eight to choose from, and keeps the original underneath. A reader in German, Portuguese or Russian gets TechCrunch and 36Kr in one stream, without waiting for someone to translate.",
	languagesOriginal:
		"The original title stays alongside the translation, so you can always check it.",
	languagesOriginalLabel: "Original",
	languagesPick: "Reading language",
	customizeKicker: "Make it yours",
	customizeTitle: "Your sources. Your brief. Your agent.",
	customizeBody: (n) =>
		`Pick the sources you want from all ${n ?? ""} and put them in your order; the brief is written from that list alone; then connect your own agent and let it screen the day for you. No account: the list lives in your browser and syncs if you sign in.`,
	customizeFollow: {
		title: "Follow and reorder",
		body: "Pin, reorder, hide; sources from any topic go in one list, and your page shows what they published today.",
	},
	customizeBrief: {
		title: "Today's brief: ten lines, each cited",
		body: "One per topic, rewritten through the day as items arrive. The one on your follow page is written from your list alone, whether it holds three sources or thirty.",
	},
	customizeAgent: {
		title: "Connect your agent",
		body: "Point Claude, Codex or any MCP client at the MCP server and name your sources; it filters the day for you. The agent cannot see the list in your browser, so you tell it the names.",
	},
	followBriefLabel: "Following",
	followDemoSources: "3 sources",
	briefDemoLabel: "Example · Today's brief",
	briefCited: "Every line cites its sources",
	agentsSourcePrompt:
		"Only what OpenAI, Anthropic and DeepMind published today",
	agentsWays: [
		{
			title: "MCP server",
			body: "get_digest, get_topic, get_source, get_article and search, over Streamable HTTP.",
		},
		{
			title: "JSON API",
			body: "The brief and every topic, source and event as structured data.",
		},
		{ title: "RSS", body: "An item feed and a digest feed for every topic." },
		{
			title: "Agent skill and llms.txt",
			body: "A SKILL.md for coding agents and a map of the site for crawlers.",
		},
	],
	agentsGuide: "Setup guide for agents",
	followCta: "Start following sources",
	useCasesKicker: "Who it's for",
	useCasesTitle: "Point it at what you care about.",
	useCasesBody:
		"Pick different sources and you get a different brief. Four typical ways in:",
	useCases: [
		{
			label: "Creators hunting topics",
			scenario:
				"The story several outlets are reporting is today's topic, each outlet's wording a click away.",
			chips: ["Events", "Hot lists", "Topics"],
		},
		{
			label: "Investors tracking AI",
			scenario:
				"Follow the lab newsrooms and 36Kr alone; the brief is written from those, every line cited.",
			chips: ["Follow + brief", "Events", "RSS"],
		},
		{
			label: "AI practitioners",
			scenario:
				"Research blogs, paper feeds and community on one page, refreshed every five minutes.",
			chips: ["AI topic", "Follow + brief", "MCP"],
		},
		{
			label: "Product people tracking rivals",
			scenario:
				"Follow rivals' newsrooms and changelogs; your agent compiles the weekly update.",
			chips: ["Follow + brief", "MCP", "Agent skill"],
		},
	],
	sourcesKicker: "Sources",
	sourcesTitle: "Hand-picked, almost all first-hand.",
	sourcesBody: (n) =>
		`Every one of the ${n ?? ""} sources is chosen by hand and read from the publisher's own feed wherever it offers one: official newsrooms and research blogs, journals, open-source communities, individual authors, and the Chinese platforms that rarely appear in English-language feeds. Seven topics, from AI to the Chinese web. A few hot lists and news rankings are kept as a reference and sit at the end of the wall.`,
	sourcesShowAll: (count) => `Show all ${count}`,
	sourcesShowLess: "Show fewer",
	sourcesSitesNote: (sites, feeds) =>
		`${sites} sites, counted once each; ${feeds} feeds in all, since some sites have several sections.`,
	sourcesMore: (count) => `All ${count} sources, with status`,
	topicSources: (count) => `${count} feeds`,
	openKicker: "Open source",
	openTitle: "MIT licensed. Run your own.",
	openBody:
		"The adapters, the ranking, the translation and the brief are all in one public repository. Read how a source is fetched, open an issue for one that is missing, or add your own.",
	openSelfHost:
		"Deploys to Cloudflare Workers, D1 and KV with one command. The Cloudflare side fits the free tier; you bring your own model key for the translation and the brief.",
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
			question: "How often does it update?",
			answer:
				"Sources are refreshed about every five minutes, each on its own schedule. The daily brief for each topic is rewritten through the day as new items arrive, and past briefs are kept in the archive and the calendar.",
		},
		{
			question: "How is this different from Google News or a feed reader?",
			answer:
				"Almost every item comes straight from the publisher, with a few hot lists kept only as a reference for what people are reading, rather than syndications. Stories that several outlets report are grouped into one event. Every headline is translated into your reading language with the original kept. And the whole thing is open source and reachable by agents.",
		},
		{
			question: "How do I connect an AI agent?",
			answer:
				"Add the MCP server (https://api.opentrends.io/mcp, Streamable HTTP, no key) to Claude, Codex or any MCP client, or call the JSON API directly. The setup guide has the exact commands.",
		},
		{
			question: "Can I run it myself?",
			answer:
				"Yes. The repository deploys to Cloudflare Workers, D1, KV and Queues with one command, and the source list is a single file you can edit. Cloudflare's free tier is enough for a personal copy; the translation and the brief use a model API key you supply.",
		},
		{
			question: "Do I need an account?",
			answer:
				"No. Reading, topics, following sources, RSS, the API and the MCP server are open to everyone. Signing in only syncs the sources you follow between devices.",
		},
	],
	finalTitle: "People read it. AI reads it. Same first-hand sources.",
};

const ZH: LandingStrings = {
	eyebrow: "开源 · 免费 · 无需注册",
	heroTitle: "人与 AI 共用的信息雷达。",
	heroBody: (n) =>
		`每 5 分钟读${n ? ` ${n} ` : "数百"}个一手信源，把多家媒体都在报的事合并成事件，写带出处的十条简报，标题翻成你的语言。你在页面上读，你的 AI 通过 MCP 读，同一份数据。`,
	heroPoints: [
		"页面给人读；MCP、API、RSS、Skill 给 Agent，不需要 key。",
		"人工精选的一手信源，7 个板块，每 5 分钟刷新。",
		"英文、中文信源的新闻都汇到你的语言，原文保留。",
		"关注任意信源，简报只按你的列表写。开源，可自部署。",
	],
	ctaFeed: "打开今日信息流",
	ctaAgent: "接入你的 AI（MCP）",
	heroForPeople: "给人",
	heroForAgents: "给 Agent",
	heroPeopleNote: "用你的语言读",
	heroAgentNote: "同一批内容，通过 MCP",
	continueReading: "继续上次的阅读",
	mechanism: (n) =>
		`${n ?? "数百"} 个信源、7 个板块 · 每 5 分钟刷新 · 8 种阅读语言 · 不需要 API key`,
	agentsPrompt: "今天科技圈发生了什么？",
	seoTitle: "人与 AI 共用的信息雷达",
	seoDescription:
		"OpenTrends 追踪 AI、硬件、生物科技、编程和中文互联网的数百个一手信源，把多家同时报道的新闻合并成事件，写带出处的每日简报，翻译成 8 种语言。人在页面上读，Agent 通过 MCP、API、RSS 读。开源，可自部署。",
	viewsKicker: "三种读法",
	viewsTitle: "同一批信源，按你习惯的方式读。",
	viewsBody:
		"一眼扫完所有信源，只看多家都在报的事件，或者把所有信源的最新内容按时间刷成一条流。",
	viewsOpen: "打开这个视图",
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
			title: "信息流",
			body: "所有信源的最新内容按时间汇成一条流，带封面和热榜名次，适合只想往下刷的时候。",
		},
	],
	eventsKicker: "事件",
	eventsTitle: "多家都在报的新闻，替你挑出来。",
	eventsBody:
		"同一件事在不止一家媒体出现时，OpenTrends 把这些报道合并成一个事件，列出每一个来源，今天真正重要的新闻就从噪音里浮出来了，每家的原话一步可达。参与合并的是媒体报道；实验室博客、Hacker News 这类信源留在各自的卡片里。",
	eventsReported: (count) => `${count} 个来源`,
	eventsExampleNote: (date) => `示例 · ${date}`,
	eventsHighSignal: "多家媒体同时报道",
	eventsMerged: "合并成一个事件",
	eventsMore: "浏览今日事件",
	kindLabels: {
		author: "个人",
		community: "社区",
		hot: "热榜",
		journal: "期刊",
		official: "官方",
		press: "媒体",
	},
	languagesKicker: "汇到你的语言",
	languagesTitle: "不管原文是什么语言，你只读一种。",
	languagesBody:
		"信源以英文新闻室和中文平台为主。AI 把每条标题翻成你的阅读语言，八种可选，原文留在译文下面。德语、葡语或俄语读者，在同一条流里读到 TechCrunch 和 36 氪，不用等谁来翻译。",
	languagesOriginal: "原文标题保留在译文旁边，随时可以核对。",
	languagesOriginalLabel: "原文",
	languagesPick: "阅读语言",
	customizeKicker: "自定义",
	customizeTitle: "你的信源，你的简报，你的 Agent。",
	customizeBody: (n) =>
		`从${n ? ` ${n} ` : "所有"}个信源里挑你要的，排成你的顺序；简报只根据这份列表写；再把你自己的 Agent 接上来，让它每天先替你筛一遍。不用注册，列表存在浏览器里，登录后跨设备同步。`,
	customizeFollow: {
		title: "关注与排序",
		body: "置顶、排序、隐藏；任何板块的信源都能进同一个列表，你的页面只放它们今天的更新。",
	},
	customizeBrief: {
		title: "今日简报：十条，每条带出处",
		body: "每个板块各一份，一天里随新内容重写。关注页上那份只按你的列表写，三家还是三十家都行。",
	},
	customizeAgent: {
		title: "接上你的 Agent",
		body: "把 MCP server 接给 Claude、Codex 或任何客户端，报上信源名，它每天替你过滤。Agent 看不到你浏览器里的关注列表，告诉它名字就行。",
	},
	followBriefLabel: "关注",
	followDemoSources: "3 个信源",
	briefDemoLabel: "示例 · 今日简报",
	briefCited: "每条附出处",
	agentsSourcePrompt: "只看 OpenAI、Anthropic、DeepMind 今天发了什么",
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
	followCta: "开始关注信源",
	useCasesKicker: "适合谁",
	useCasesTitle: "你关心什么，它就盯什么。",
	useCasesBody: "挑的信源不同，拿到的简报就不同。四种典型用法：",
	useCases: [
		{
			label: "找选题的创作者",
			scenario: "多家都在报的事就是今天的选题，各家原话一步可达。",
			chips: ["事件", "热榜", "板块"],
		},
		{
			label: "盯 AI 赛道的投资人",
			scenario: "只关注实验室新闻室和 36 氪，简报只写这些，每条带出处。",
			chips: ["关注 + 简报", "事件", "RSS"],
		},
		{
			label: "一线 AI 从业者",
			scenario: "研究博客、论文源和社区在一页，每 5 分钟刷新。",
			chips: ["AI 板块", "关注 + 简报", "MCP"],
		},
		{
			label: "做竞品追踪的产品人",
			scenario: "关注对手的新闻室和更新日志，让你的 Agent 每周汇总变化。",
			chips: ["关注 + 简报", "MCP", "Agent skill"],
		},
	],
	sourcesKicker: "信源",
	sourcesTitle: "人工精选，绝大多数直达一手。",
	sourcesBody: (n) =>
		`${n ? `${n} ` : ""}个信源每一个都是人工挑选，凡有官方订阅源的都直接从发布处读取：官方新闻室和研究博客、期刊、开源社区、个人作者，以及很少出现在英文信息流里的中文平台。七个板块，从 AI 到中文互联网。少数热榜和新闻排行只作参考，排在墙的最后。`,
	sourcesShowAll: (count) => `展开全部 ${count} 个`,
	sourcesShowLess: "收起",
	sourcesSitesNote: (sites, feeds) =>
		`按站点计 ${sites} 家，同一站点的多个栏目算一个；订阅源共 ${feeds} 个。`,
	sourcesMore: (count) => `全部 ${count} 个信源及状态`,
	topicSources: (count) => `${count} 个订阅源`,
	openKicker: "开源",
	openTitle: "MIT 协议，可以自己部署。",
	openBody:
		"抓取适配器、排序、翻译和简报都在同一个公开仓库里。可以看一个信源是怎么抓的，缺了哪个信源就提 issue，或者自己加。",
	openSelfHost:
		"一条命令部署到 Cloudflare Workers、D1 和 KV。Cloudflare 这部分免费额度够用，翻译和简报用的模型 key 自备。",
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
			question: "多久更新一次？",
			answer:
				"信源大约每 5 分钟刷新一次，各有各的节奏。每个板块的今日简报会随着新内容到来在一天里反复重写，过去的简报保留在归档和日历里。",
		},
		{
			question: "和 Google News 或 RSS 阅读器有什么不同？",
			answer:
				"绝大多数条目直接来自发布方，少数热榜只作「大家在看什么」的参考，没有层层转载。多家报道的同一件事合并成一个事件。每条标题都翻译成你的阅读语言并保留原文。而且整个站开源，Agent 也能直接读。",
		},
		{
			question: "AI Agent 怎么接入？",
			answer:
				"把 MCP server（https://api.opentrends.io/mcp，Streamable HTTP，不需要 key）加到 Claude、Codex 或任何 MCP 客户端，或者直接调 JSON 接口。接入指南里有现成的命令。",
		},
		{
			question: "可以自己部署吗？",
			answer:
				"可以。仓库一条命令就能部署到 Cloudflare Workers、D1、KV 和 Queues，信源列表是一个文件，改了就生效。Cloudflare 的免费额度够一份个人副本用；翻译和简报需要你自己的模型 API key。",
		},
		{
			question: "需要注册吗？",
			answer:
				"不需要。阅读、板块、关注信源、RSS、接口和 MCP server 对所有人开放。登录只用来在设备之间同步你关注的信源。",
		},
	],
	finalTitle: "人读，AI 也读，同一份一手信息。",
};

const ZH_HANT: LandingStrings = {
	eyebrow: "開源 · 免費 · 無需註冊",
	heroTitle: "人與 AI 共用的資訊雷達。",
	heroBody: (n) =>
		`每 5 分鐘讀${n ? ` ${n} ` : "數百"}個一手信源，把多家媒體都在報的事合併成事件，寫附出處的十條簡報，標題翻成你的語言。你在頁面上讀，你的 AI 透過 MCP 讀，同一份資料。`,
	heroPoints: [
		"頁面給人讀；MCP、API、RSS、Skill 給 Agent，不需要 key。",
		"人工精選的一手信源，7 個板塊，每 5 分鐘更新。",
		"英文、中文信源的新聞都匯到你的語言，原文保留。",
		"關注任意信源，簡報只按你的列表寫。開源，可自部署。",
	],
	ctaFeed: "打開今日資訊流",
	ctaAgent: "接入你的 AI（MCP）",
	heroForPeople: "給人",
	heroForAgents: "給 Agent",
	heroPeopleNote: "用你的語言讀",
	heroAgentNote: "同一批內容，透過 MCP",
	continueReading: "繼續上次的閱讀",
	mechanism: (n) =>
		`${n ?? "數百"} 個信源、7 個板塊 · 每 5 分鐘更新 · 8 種閱讀語言 · 不需要 API key`,
	agentsPrompt: "今天科技圈發生了什麼？",
	seoTitle: "人與 AI 共用的資訊雷達",
	seoDescription:
		"OpenTrends 追蹤 AI、硬體、生物科技、程式設計和中文網路的數百個一手信源，把多家同時報導的新聞合併成事件，寫附出處的每日簡報，翻譯成 8 種語言。人在頁面上讀，Agent 透過 MCP、API、RSS 讀。開源，可自部署。",
	viewsKicker: "三種讀法",
	viewsTitle: "同一批信源，按你習慣的方式讀。",
	viewsBody:
		"一眼掃完所有信源，只看多家都在報的事件，或者把所有信源的最新內容按時間滑成一條流。",
	viewsOpen: "打開這個視圖",
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
			title: "資訊流",
			body: "所有信源的最新內容按時間匯成一條流，帶封面和熱榜名次，適合只想往下滑的時候。",
		},
	],
	eventsKicker: "事件",
	eventsTitle: "多家都在報的新聞，替你挑出來。",
	eventsBody:
		"同一件事在不止一家媒體出現時，OpenTrends 把這些報導合併成一個事件，列出每一個來源，今天真正重要的新聞就從噪音裡浮出來了，每家的原話一步可達。參與合併的是媒體報導；實驗室部落格、Hacker News 這類信源留在各自的卡片裡。",
	eventsReported: (count) => `${count} 個來源`,
	eventsExampleNote: (date) => `示例 · ${date}`,
	eventsHighSignal: "多家媒體同時報導",
	eventsMerged: "合併成一個事件",
	eventsMore: "瀏覽今日事件",
	kindLabels: {
		author: "個人",
		community: "社群",
		hot: "熱榜",
		journal: "期刊",
		official: "官方",
		press: "媒體",
	},
	languagesKicker: "匯到你的語言",
	languagesTitle: "不管原文是什麼語言，你只讀一種。",
	languagesBody:
		"信源以英文新聞室和中文平台為主。AI 把每條標題翻成你的閱讀語言，八種可選，原文留在譯文下面。德語、葡語或俄語讀者，在同一條流裡讀到 TechCrunch 和 36 氪，不用等誰來翻譯。",
	languagesOriginal: "原文標題保留在譯文旁邊，隨時可以核對。",
	languagesOriginalLabel: "原文",
	languagesPick: "閱讀語言",
	customizeKicker: "自訂",
	customizeTitle: "你的信源，你的簡報，你的 Agent。",
	customizeBody: (n) =>
		`從${n ? ` ${n} ` : "所有"}個信源裡挑你要的，排成你的順序；簡報只根據這份列表寫；再把你自己的 Agent 接上來，讓它每天先替你篩一遍。不用註冊，列表存在瀏覽器裡，登入後跨裝置同步。`,
	customizeFollow: {
		title: "關注與排序",
		body: "置頂、排序、隱藏；任何板塊的信源都能進同一個列表，你的頁面只放它們今天的更新。",
	},
	customizeBrief: {
		title: "今日簡報：十條，每條附出處",
		body: "每個板塊各一份，一天裡隨新內容重寫。關注頁上那份只按你的列表寫，三家還是三十家都行。",
	},
	customizeAgent: {
		title: "接上你的 Agent",
		body: "把 MCP server 接給 Claude、Codex 或任何客戶端，報上信源名，它每天替你過濾。Agent 看不到你瀏覽器裡的關注列表，告訴它名字就行。",
	},
	followBriefLabel: "關注",
	followDemoSources: "3 個信源",
	briefDemoLabel: "示例 · 今日簡報",
	briefCited: "每條附出處",
	agentsSourcePrompt: "只看 OpenAI、Anthropic、DeepMind 今天發了什麼",
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
	followCta: "開始關注信源",
	useCasesKicker: "適合誰",
	useCasesTitle: "你關心什麼，它就盯什麼。",
	useCasesBody: "挑的信源不同，拿到的簡報就不同。四種典型用法：",
	useCases: [
		{
			label: "找選題的創作者",
			scenario: "多家都在報的事就是今天的選題，各家原話一步可達。",
			chips: ["事件", "熱榜", "板塊"],
		},
		{
			label: "盯 AI 賽道的投資人",
			scenario: "只關注實驗室新聞室和 36 氪，簡報只寫這些，每條附出處。",
			chips: ["關注 + 簡報", "事件", "RSS"],
		},
		{
			label: "一線 AI 從業者",
			scenario: "研究部落格、論文源和社群在一頁，每 5 分鐘更新。",
			chips: ["AI 板塊", "關注 + 簡報", "MCP"],
		},
		{
			label: "做競品追蹤的產品人",
			scenario: "關注對手的新聞室和更新日誌，讓你的 Agent 每週彙總變化。",
			chips: ["關注 + 簡報", "MCP", "Agent skill"],
		},
	],
	sourcesKicker: "信源",
	sourcesTitle: "人工精選，絕大多數直達一手。",
	sourcesBody: (n) =>
		`${n ? `${n} ` : ""}個信源每一個都是人工挑選，凡有官方訂閱源的都直接從發布處讀取：官方新聞室和研究部落格、期刊、開源社群、個人作者，以及很少出現在英文資訊流裡的中文平台。七個板塊，從 AI 到中文網路。少數熱榜和新聞排行只作參考，排在牆的最後。`,
	sourcesShowAll: (count) => `展開全部 ${count} 個`,
	sourcesShowLess: "收起",
	sourcesSitesNote: (sites, feeds) =>
		`按站點計 ${sites} 家，同一站點的多個欄目算一個；訂閱源共 ${feeds} 個。`,
	sourcesMore: (count) => `全部 ${count} 個信源及狀態`,
	topicSources: (count) => `${count} 個訂閱源`,
	openKicker: "開源",
	openTitle: "MIT 授權，可以自己部署。",
	openBody:
		"抓取適配器、排序、翻譯和簡報都在同一個公開倉庫裡。可以看一個信源是怎麼抓的，缺了哪個信源就開 issue，或者自己加。",
	openSelfHost:
		"一條命令部署到 Cloudflare Workers、D1 和 KV。Cloudflare 這部分免費額度夠用，翻譯和簡報用的模型 key 自備。",
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
			question: "多久更新一次？",
			answer:
				"信源大約每 5 分鐘更新一次，各有各的節奏。每個板塊的今日簡報會隨著新內容到來在一天裡反覆重寫，過去的簡報保留在歸檔和日曆裡。",
		},
		{
			question: "和 Google News 或 RSS 閱讀器有什麼不同？",
			answer:
				"絕大多數條目直接來自發布方，少數熱榜只作「大家在看什麼」的參考，沒有層層轉載。多家報導的同一件事合併成一個事件。每條標題都翻譯成你的閱讀語言並保留原文。而且整個站開源，Agent 也能直接讀。",
		},
		{
			question: "AI Agent 怎麼接入？",
			answer:
				"把 MCP server（https://api.opentrends.io/mcp，Streamable HTTP，不需要 key）加到 Claude、Codex 或任何 MCP 客戶端，或者直接呼叫 JSON 介面。接入指南裡有現成的命令。",
		},
		{
			question: "可以自己部署嗎？",
			answer:
				"可以。倉庫一條命令就能部署到 Cloudflare Workers、D1、KV 和 Queues，信源列表是一個檔案，改了就生效。Cloudflare 的免費額度夠一份個人副本用；翻譯和簡報需要你自己的模型 API key。",
		},
		{
			question: "需要註冊嗎？",
			answer:
				"不需要。閱讀、板塊、關注信源、RSS、介面和 MCP server 對所有人開放。登入只用來在裝置之間同步你關注的信源。",
		},
	],
	finalTitle: "人讀，AI 也讀，同一份一手資訊。",
};

const STRINGS: Partial<Record<Locale, LandingStrings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function landingStrings(locale: Locale): LandingStrings {
	return STRINGS[locale] ?? EN;
}
