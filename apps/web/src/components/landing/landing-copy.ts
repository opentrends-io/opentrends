import type { Locale } from "@/lib/i18n";

// Landing page copy, following the launch film's lines. English, Simplified
// and Traditional Chinese are written by hand; the other editions read the
// English page, like /agents. Counts are null when the API could not be
// read.

export interface LandingStrings {
	agentsBody: string;
	agentsGuide: string;
	agentsKicker: string;
	agentsMeta: string;
	agentsPrompt: string;
	agentsTitle: string;
	briefBody: (sourceCount: number | null) => string;
	briefEmpty: string;
	briefKicker: string;
	briefMore: string;
	briefTitle: string;
	briefWindow: string;
	ctaFeed: string;
	ctaGithub: string;
	eventsBody: string;
	eventsExample: string;
	eventsKicker: string;
	eventsMore: string;
	eventsSources: (count: number) => string;
	eventsTitle: [string, string];
	finalTagline: string;
	funnelFrom: string;
	funnelTo: string;
	heroBody: (sourceCount: number | null) => string;
	heroTitle: [string, string];
	highSignal: string;
	live: string;
	openSourceBody: string;
	openSourceTitle: string;
	seoTitle: string;
	stats: (sourceCount: number | null) => string[];
	topicSources: (count: number) => string;
	topicsTitle: string;
	translateBadge: string;
	translateBody: string;
	translateKicker: string;
	translateLanguages: string;
	translateTitle: string;
	wallCaption: string;
}

const EN: LandingStrings = {
	live: "Live",
	heroTitle: ["The world,", "in ten lines."],
	heroBody: (sourceCount) =>
		`OpenTrends reads ${sourceCount ?? "hundreds of"} first-hand sources in 8 languages every 5 minutes, and tells you what changed today in ten cited lines.`,
	seoTitle: "The world, in ten lines",
	ctaFeed: "Read today's ten lines",
	ctaGithub: "View on GitHub",
	stats: (sourceCount) => [
		sourceCount ? `${sourceCount} sources` : "Hundreds of sources",
		"8 languages",
		"Every 5 minutes",
	],
	briefKicker: "01 · The brief",
	briefTitle: "Every line, cited.",
	briefBody: (sourceCount) =>
		`${sourceCount ?? "Hundreds of"} sources in, ten lines out. Each line says what happened and why it matters, and links to the reports it was drawn from.`,
	funnelFrom: "sources",
	funnelTo: "lines",
	briefWindow: "Today's top 10",
	briefEmpty:
		"Today's brief is still being written. Open the feed to read the sources as they come in.",
	briefMore: "Open today's brief",
	wallCaption:
		"Hand-picked: official blogs, research labs, papers, developer communities and Chinese platforms.",
	translateKicker: "02 · Translation",
	translateTitle: "Read everything in your language.",
	translateBody:
		"Headlines from every source arrive translated into your language, with the original title kept alongside. Eight reading languages.",
	translateBadge: "Auto-translated · source kept",
	translateLanguages: "Reading language",
	eventsKicker: "03 · Events",
	eventsTitle: ["Five outlets. One story.", "Merged into one event."],
	eventsBody:
		"When several outlets report the same thing, OpenTrends folds their coverage into one event. Read it once and see everyone who covered it.",
	eventsExample: "Example from 29 September 2026",
	highSignal: "High signal",
	eventsSources: (count) => `${count} sources`,
	eventsMore: "Browse today's events",
	agentsKicker: "For agents",
	agentsTitle: "Your agents can read it too.",
	agentsBody:
		"Connect the MCP server, call the JSON API, subscribe over RSS or install the agent skill. No API key needed.",
	agentsPrompt: "What happened today?",
	agentsMeta: "10 lines · with citations",
	agentsGuide: "Setup guide",
	topicsTitle: "Pick a topic",
	topicSources: (count) => `${count} sources`,
	openSourceTitle: "100% open source.",
	openSourceBody:
		"MIT licensed. Read the code, suggest a source that is missing, or run your own copy on Cloudflare.",
	finalTagline: "Read the world first-hand.",
};

const ZH: LandingStrings = {
	live: "实时",
	heroTitle: ["全世界，", "十行读懂。"],
	heroBody: (sourceCount) =>
		`OpenTrends 每 5 分钟读一遍${sourceCount ? ` ${sourceCount} ` : "数百"}个一手信息源、8 种语言，把今天发生的事写成十行带出处的摘要。`,
	seoTitle: "全世界，十行读懂",
	ctaFeed: "读今天的十行",
	ctaGithub: "查看 GitHub 仓库",
	stats: (sourceCount) => [
		sourceCount ? `${sourceCount} 个一手信息源` : "数百个一手信息源",
		"8 种语言",
		"每 5 分钟刷新",
	],
	briefKicker: "01 · 今日摘要",
	briefTitle: "每一行，都有出处。",
	briefBody: (sourceCount) =>
		`${sourceCount ? `${sourceCount} ` : "数百"}个信源进，十行摘要出。每一行写清发生了什么、为什么重要，并链接到它引用的原始报道。`,
	funnelFrom: "个信源",
	funnelTo: "行摘要",
	briefWindow: "今日 10 条",
	briefEmpty: "今日要点还在生成中。打开信息流，先看各信源的最新内容。",
	briefMore: "打开今日摘要",
	wallCaption: "精选：官方博客、研究机构、论文、开发者社区和中文平台。",
	translateKicker: "02 · 翻译",
	translateTitle: "全球一手信源，用母语直接读。",
	translateBody:
		"每个信源的标题都自动翻译成你的语言，原文标题保留在旁边。支持 8 种阅读语言。",
	translateBadge: "自动翻译 · 保留原文",
	translateLanguages: "阅读语言",
	eventsKicker: "03 · 事件",
	eventsTitle: ["五家媒体，同一件事。", "自动合并成一个事件。"],
	eventsBody:
		"多家媒体报道同一件事时，OpenTrends 把它们合并成一个事件：读一次，就能看到都有谁在报道。",
	eventsExample: "示例：2026 年 9 月 29 日",
	highSignal: "高信号",
	eventsSources: (count) => `${count} 个来源`,
	eventsMore: "浏览今日事件",
	agentsKicker: "Agent 接入",
	agentsTitle: "你的 Agent，也能读。",
	agentsBody:
		"接入 MCP server、调用 JSON 接口、订阅 RSS，或安装 Agent skill。不需要 API key。",
	agentsPrompt: "今天发生了什么？",
	agentsMeta: "10 行 · 附引用",
	agentsGuide: "接入指南",
	topicsTitle: "选一个板块",
	topicSources: (count) => `${count} 个信源`,
	openSourceTitle: "完全开源。",
	openSourceBody:
		"MIT 协议。代码全部公开，缺了哪个信源可以来提，也可以在 Cloudflare 上部署你自己的一份。",
	finalTagline: "读懂世界，从一手信息开始。",
};

const ZH_HANT: LandingStrings = {
	live: "即時",
	heroTitle: ["全世界，", "十行讀懂。"],
	heroBody: (sourceCount) =>
		`OpenTrends 每 5 分鐘讀一遍${sourceCount ? ` ${sourceCount} ` : "數百"}個一手資訊源、8 種語言，把今天發生的事寫成十行附出處的摘要。`,
	seoTitle: "全世界，十行讀懂",
	ctaFeed: "讀今天的十行",
	ctaGithub: "查看 GitHub 倉庫",
	stats: (sourceCount) => [
		sourceCount ? `${sourceCount} 個一手資訊源` : "數百個一手資訊源",
		"8 種語言",
		"每 5 分鐘更新",
	],
	briefKicker: "01 · 今日摘要",
	briefTitle: "每一行，都有出處。",
	briefBody: (sourceCount) =>
		`${sourceCount ? `${sourceCount} ` : "數百"}個信源進，十行摘要出。每一行寫清發生了什麼、為什麼重要，並連結到它引用的原始報導。`,
	funnelFrom: "個信源",
	funnelTo: "行摘要",
	briefWindow: "今日 10 條",
	briefEmpty: "今日要點還在生成中。打開資訊流，先看各信源的最新內容。",
	briefMore: "打開今日摘要",
	wallCaption: "精選：官方部落格、研究機構、論文、開發者社群和中文平台。",
	translateKicker: "02 · 翻譯",
	translateTitle: "全球一手信源，用母語直接讀。",
	translateBody:
		"每個信源的標題都自動翻譯成你的語言，原文標題保留在旁邊。支援 8 種閱讀語言。",
	translateBadge: "自動翻譯 · 保留原文",
	translateLanguages: "閱讀語言",
	eventsKicker: "03 · 事件",
	eventsTitle: ["五家媒體，同一件事。", "自動合併成一個事件。"],
	eventsBody:
		"多家媒體報導同一件事時，OpenTrends 把它們合併成一個事件：讀一次，就能看到都有誰在報導。",
	eventsExample: "示例：2026 年 9 月 29 日",
	highSignal: "高訊號",
	eventsSources: (count) => `${count} 個來源`,
	eventsMore: "瀏覽今日事件",
	agentsKicker: "Agent 接入",
	agentsTitle: "你的 Agent，也能讀。",
	agentsBody:
		"接入 MCP server、呼叫 JSON 介面、訂閱 RSS，或安裝 Agent skill。不需要 API key。",
	agentsPrompt: "今天發生了什麼？",
	agentsMeta: "10 行 · 附引用",
	agentsGuide: "接入指南",
	topicsTitle: "選一個板塊",
	topicSources: (count) => `${count} 個信源`,
	openSourceTitle: "完全開源。",
	openSourceBody:
		"MIT 授權。程式碼全部公開，缺了哪個信源可以來提，也可以在 Cloudflare 上部署你自己的一份。",
	finalTagline: "讀懂世界，從一手資訊開始。",
};

const STRINGS: Partial<Record<Locale, LandingStrings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function landingStrings(locale: Locale): LandingStrings {
	return STRINGS[locale] ?? EN;
}
