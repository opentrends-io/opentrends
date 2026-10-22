import type { Locale } from "@/lib/i18n";

import type { SourceKind } from "./landing-model";

// Landing page copy. English, Simplified and Traditional Chinese are written
// by hand; the other editions read the English page, like /agents. Counts
// are null when the API could not be read.

export interface Faq {
	answer: string;
	question: string;
}

export interface LandingStrings {
	agentsBody: string;
	agentsGuide: string;
	briefDegraded: string;
	briefEmpty: string;
	briefLabel: string;
	briefMore: string;
	briefUpdated: (ago: string) => string;
	continueReading: string;
	crossBody: string;
	crossEmpty: string;
	crossKicker: string;
	crossMore: string;
	crossReported: (count: number) => string;
	crossTitle: string;
	crossUpdated: (ago: string) => string;
	ctaFeed: string;
	ctaRss: string;
	eyebrow: string;
	faq: Faq[];
	faqKicker: string;
	faqTitle: string;
	heroBody: (sourceCount: number | null) => string;
	heroTitle: string;
	kindLabels: Record<SourceKind, string>;
	languagesBody: string;
	languagesTitle: string;
	mechanism: (sourceCount: number | null) => string;
	openBody: string;
	openKicker: string;
	openStars: (stars: string) => string;
	openTitle: string;
	readBody: string;
	readKicker: string;
	readTitle: string;
	seoDescription: string;
	seoTitle: string;
	sourcesBody: (sourceCount: number | null) => string;
	sourcesKicker: string;
	sourcesMore: (count: number) => string;
	sourcesTitle: string;
	topicSources: (count: number) => string;
	topicsBody: string;
	topicsTitle: string;
	ways: { body: string; title: string }[];
	waysTitle: string;
}

const EN: LandingStrings = {
	eyebrow: "Open source · Free · No account needed",
	heroTitle: "Follow hundreds of first-hand sources, merged and translated.",
	heroBody: (n) =>
		`OpenTrends reads ${n ?? "hundreds of"} official blogs, research labs, newsrooms and developer communities, merges duplicate reports of the same story into one event with every source kept, and writes a short cited brief of what changed today, in your language.`,
	seoTitle: "First-hand tech and AI news, merged and translated",
	seoDescription:
		"OpenTrends follows hundreds of official blogs, research labs, newsrooms and developer communities across AI, hardware, biotech, programming and the Chinese web, merges duplicate reports of the same story with every source kept, and writes a short cited daily brief in eight languages.",
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
	crossKicker: "Merged reports",
	crossTitle: "One story, every outlet that covered it.",
	crossBody:
		"Most feeds show you one headline at a time. OpenTrends reads every outlet separately, so when several of them report the same story their reports are merged into one event with every outlet listed: official releases, publications and community threads side by side. Nothing is fact-checked for you; you can see who said what and go straight to the original.",
	crossReported: (count) => `Reported by ${count} outlets`,
	kindLabels: {
		author: "Author",
		community: "Community",
		hot: "Hot list",
		journal: "Journal",
		official: "Official",
		press: "Press",
	},
	crossUpdated: (ago) => `Updated ${ago}`,
	crossEmpty:
		"The events feed is quiet right now. Check back in a few minutes.",
	crossMore: "Browse today's events",
	sourcesKicker: "Sources",
	sourcesTitle: "Hand-picked, first-hand.",
	sourcesBody: (n) =>
		`Every one of the ${n ?? ""} sources is chosen by hand and read where it publishes: official newsrooms and research blogs, academic journals, open-source communities, and the Chinese platforms that rarely appear in English-language feeds. Each source has its own page with its recent items and status.`,
	sourcesMore: (count) => `All ${count} sources`,
	topicSources: (count) => `${count} sources`,
	readKicker: "How you read it",
	readTitle: "In your language, on your terms.",
	readBody:
		"Headlines arrive translated into the language you read in, with the original kept alongside. Pick a topic, follow only the sources you care about, or take the whole thing as a feed.",
	languagesTitle: "The same headline in eight languages",
	languagesBody:
		"English, Simplified and Traditional Chinese, Russian, German, French, Spanish and Portuguese.",
	topicsTitle: "Seven topics",
	topicsBody: "Each topic follows its own list of sources.",
	waysTitle: "Feeds and agents",
	ways: [
		{
			title: "RSS",
			body: "Every topic has an item feed and a digest feed.",
		},
		{
			title: "JSON API",
			body: "The digest and every topic as structured data, no key needed.",
		},
		{
			title: "MCP server",
			body: "Let Claude, Codex or any MCP client read the brief for you.",
		},
	],
	agentsBody:
		"Agents get the same brief as people: a public JSON API, llms.txt, an agent skill and an MCP server, all without an API key.",
	agentsGuide: "Setup guide for agents",
	openKicker: "Open source",
	openTitle: "MIT licensed, built in the open.",
	openBody:
		"The adapters, the ranking, the translation and the brief are all in one public repository. Read how a source is fetched, open an issue for one that is missing, or run your own copy on Cloudflare.",
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
				"Sources are refreshed about every five minutes, each on its own schedule. The daily brief for each topic is rewritten through the day as new items arrive, and past briefs are kept in the archive.",
		},
		{
			question: "How is this different from Google News or a feed reader?",
			answer:
				"Three things. Every item comes from a first-hand source rather than a syndication of one. When several outlets report the same story it is grouped into one event, so you can see how widely it is covered. And every headline is translated into your reading language with the original kept, so Chinese and English sources sit in the same feed.",
		},
		{
			question: "How does the translation work?",
			answer:
				"Headlines are translated by a language model as they arrive, and the original title is shown alongside the translation so you can always check it. Summaries and the daily brief are written in the language you are reading in.",
		},
		{
			question: "Do I need an account?",
			answer:
				"No. Reading, topics, RSS, the API and the MCP server are open to everyone. Signing in only syncs the sources you follow between devices.",
		},
	],
};

const ZH: LandingStrings = {
	eyebrow: "开源 · 免费 · 无需注册",
	heroTitle: "追踪数百个一手信源，合并重复报道，自动翻译。",
	heroBody: (n) =>
		`OpenTrends 读取${n ? ` ${n} ` : "数百"}个官方博客、研究机构、新闻编辑部和开发者社区，把多家报道的同一件事合并成一个事件并保留每个来源，再用你的语言写一份带出处的今日简报。`,
	seoTitle: "一手科技与 AI 资讯，合并重复报道，自动翻译",
	seoDescription:
		"OpenTrends 追踪 AI、硬件、生物科技、编程和中文互联网的数百个官方博客、研究机构、新闻编辑部和开发者社区，把多家报道的同一件事合并成一个事件并保留每个来源，再以 8 种语言写一份带出处的每日简报。",
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
	crossKicker: "合并报道",
	crossTitle: "同一件事，谁报道了，一眼看清。",
	crossBody:
		"大多数信息流一次只给你一条标题。OpenTrends 分别读取每一家，同一件事在多家出现时合并成一个事件，并列出每一个来源：官方发布、媒体报道和社区讨论并排放着。我们不替你做事实核查；你能看到是谁说的，并直接去看原文。",
	crossReported: (count) => `${count} 家报道`,
	kindLabels: {
		author: "个人",
		community: "社区",
		hot: "热榜",
		journal: "期刊",
		official: "官方",
		press: "媒体",
	},
	crossUpdated: (ago) => `更新于${ago}`,
	crossEmpty: "事件流暂时没有内容，过几分钟再来看。",
	crossMore: "浏览今日事件",
	sourcesKicker: "信源",
	sourcesTitle: "人工精选，直达一手。",
	sourcesBody: (n) =>
		`${n ? `${n} ` : ""}个信源每一个都是人工挑选，并在它发布的地方读取：官方新闻室和研究博客、学术期刊、开源社区，以及很少出现在英文信息流里的中文平台。每个信源都有自己的页面，列出最近内容和状态。`,
	sourcesMore: (count) => `全部 ${count} 个信源`,
	topicSources: (count) => `${count} 个信源`,
	readKicker: "阅读方式",
	readTitle: "用你的语言，按你的方式。",
	readBody:
		"标题自动翻译成你的阅读语言，原文保留在旁边。可以按板块看，只关注你在意的信源，或者把整个站当作一个订阅源。",
	languagesTitle: "同一条标题，八种语言",
	languagesBody:
		"英语、简体中文、繁体中文、俄语、德语、法语、西班牙语和葡萄牙语。",
	topicsTitle: "七个板块",
	topicsBody: "每个板块追踪自己的一组信源。",
	waysTitle: "订阅与 Agent",
	ways: [
		{ title: "RSS", body: "每个板块都有内容订阅源和简报订阅源。" },
		{ title: "JSON 接口", body: "简报和每个板块都是结构化数据，不需要密钥。" },
		{
			title: "MCP server",
			body: "让 Claude、Codex 或任何 MCP 客户端替你读简报。",
		},
	],
	agentsBody:
		"Agent 读到的和人一样：公开的 JSON 接口、llms.txt、Agent skill 和 MCP server，都不需要 API key。",
	agentsGuide: "Agent 接入指南",
	openKicker: "开源",
	openTitle: "MIT 协议，公开构建。",
	openBody:
		"抓取适配器、排序、翻译和简报都在同一个公开仓库里。可以看一个信源是怎么抓的，缺了哪个信源就提 issue，也可以在 Cloudflare 上部署你自己的一份。",
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
				"信源大约每 5 分钟刷新一次，各有各的节奏。每个板块的今日简报会随着新内容到来在一天里反复重写，过去的简报保留在归档里。",
		},
		{
			question: "和 Google News 或 RSS 阅读器有什么不同？",
			answer:
				"三点。每一条都来自一手信源，而不是别人的转载。同一件事被多家报道时会合并成一个事件，你能看到它的覆盖面有多广。每条标题都翻译成你的阅读语言并保留原文，中英文信源在同一条信息流里。",
		},
		{
			question: "翻译是怎么做的？",
			answer:
				"标题到达时由语言模型翻译，译文旁边始终显示原标题，随时可以核对。摘要和每日简报直接用你正在阅读的语言生成。",
		},
		{
			question: "需要注册吗？",
			answer:
				"不需要。阅读、板块、RSS、接口和 MCP server 对所有人开放。登录只用来在设备之间同步你关注的信源。",
		},
	],
};

const ZH_HANT: LandingStrings = {
	eyebrow: "開源 · 免費 · 無需註冊",
	heroTitle: "追蹤數百個一手信源，合併重複報導，自動翻譯。",
	heroBody: (n) =>
		`OpenTrends 讀取${n ? ` ${n} ` : "數百"}個官方部落格、研究機構、新聞編輯室和開發者社群，把多家報導的同一件事合併成一個事件並保留每個來源，再用你的語言寫一份附出處的今日簡報。`,
	seoTitle: "一手科技與 AI 資訊，合併重複報導，自動翻譯",
	seoDescription:
		"OpenTrends 追蹤 AI、硬體、生物科技、程式設計和中文網路的數百個官方部落格、研究機構、新聞編輯室和開發者社群，把多家報導的同一件事合併成一個事件並保留每個來源，再以 8 種語言寫一份附出處的每日簡報。",
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
	crossKicker: "合併報導",
	crossTitle: "同一件事，誰報導了，一眼看清。",
	crossBody:
		"大多數資訊流一次只給你一條標題。OpenTrends 分別讀取每一家，同一件事在多家出現時合併成一個事件，並列出每一個來源：官方發布、媒體報導和社群討論並排放著。我們不替你做事實查核；你能看到是誰說的，並直接去看原文。",
	crossReported: (count) => `${count} 家報導`,
	kindLabels: {
		author: "個人",
		community: "社群",
		hot: "熱榜",
		journal: "期刊",
		official: "官方",
		press: "媒體",
	},
	crossUpdated: (ago) => `更新於${ago}`,
	crossEmpty: "事件流暫時沒有內容，過幾分鐘再來看。",
	crossMore: "瀏覽今日事件",
	sourcesKicker: "信源",
	sourcesTitle: "人工精選，直達一手。",
	sourcesBody: (n) =>
		`${n ? `${n} ` : ""}個信源每一個都是人工挑選，並在它發布的地方讀取：官方新聞室和研究部落格、學術期刊、開源社群，以及很少出現在英文資訊流裡的中文平台。每個信源都有自己的頁面，列出最近內容和狀態。`,
	sourcesMore: (count) => `全部 ${count} 個信源`,
	topicSources: (count) => `${count} 個信源`,
	readKicker: "閱讀方式",
	readTitle: "用你的語言，按你的方式。",
	readBody:
		"標題自動翻譯成你的閱讀語言，原文保留在旁邊。可以按板塊看，只關注你在意的信源，或者把整個站當作一個訂閱源。",
	languagesTitle: "同一條標題，八種語言",
	languagesBody:
		"英語、簡體中文、繁體中文、俄語、德語、法語、西班牙語和葡萄牙語。",
	topicsTitle: "七個板塊",
	topicsBody: "每個板塊追蹤自己的一組信源。",
	waysTitle: "訂閱與 Agent",
	ways: [
		{ title: "RSS", body: "每個板塊都有內容訂閱源和簡報訂閱源。" },
		{ title: "JSON 介面", body: "簡報和每個板塊都是結構化資料，不需要金鑰。" },
		{
			title: "MCP server",
			body: "讓 Claude、Codex 或任何 MCP 客戶端替你讀簡報。",
		},
	],
	agentsBody:
		"Agent 讀到的和人一樣：公開的 JSON 介面、llms.txt、Agent skill 和 MCP server，都不需要 API key。",
	agentsGuide: "Agent 接入指南",
	openKicker: "開源",
	openTitle: "MIT 授權，公開建構。",
	openBody:
		"抓取適配器、排序、翻譯和簡報都在同一個公開倉庫裡。可以看一個信源是怎麼抓的，缺了哪個信源就開 issue，也可以在 Cloudflare 上部署你自己的一份。",
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
				"信源大約每 5 分鐘更新一次，各有各的節奏。每個板塊的今日簡報會隨著新內容到來在一天裡反覆重寫，過去的簡報保留在歸檔裡。",
		},
		{
			question: "和 Google News 或 RSS 閱讀器有什麼不同？",
			answer:
				"三點。每一條都來自一手信源，而不是別人的轉載。同一件事被多家報導時會合併成一個事件，你能看到它的覆蓋面有多廣。每條標題都翻譯成你的閱讀語言並保留原文，中英文信源在同一條資訊流裡。",
		},
		{
			question: "翻譯是怎麼做的？",
			answer:
				"標題到達時由語言模型翻譯，譯文旁邊始終顯示原標題，隨時可以核對。摘要和每日簡報直接用你正在閱讀的語言生成。",
		},
		{
			question: "需要註冊嗎？",
			answer:
				"不需要。閱讀、板塊、RSS、介面和 MCP server 對所有人開放。登入只用來在裝置之間同步你關注的信源。",
		},
	],
};

const STRINGS: Partial<Record<Locale, LandingStrings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function landingStrings(locale: Locale): LandingStrings {
	return STRINGS[locale] ?? EN;
}
