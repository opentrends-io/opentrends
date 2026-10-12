import type { Locale } from "@/lib/i18n";

// Landing page copy. English, Simplified and Traditional Chinese are written
// by hand; the other editions read the English page, like /agents.

export interface LandingStrings {
	agentsBody: string;
	agentsGuide: string;
	agentsTitle: string;
	briefEmpty: string;
	briefMore: string;
	briefTitle: string;
	ctaFeed: string;
	ctaGithub: string;
	eyebrow: string;
	/** The source count is null when the API could not be read. */
	heroBody: (sourceCount: number | null) => string;
	heroTitle: string;
	openSourceBody: string;
	openSourceTitle: string;
	pillars: { body: string; title: string }[];
	seoTitle: string;
	statLanguages: (count: number) => string;
	statSources: (count: number) => string;
	statTopics: (count: number) => string;
	topicSources: (count: number) => string;
	topicsBody: string;
	topicsTitle: string;
}

const EN: LandingStrings = {
	eyebrow: "Open source · Free · No account needed",
	heroTitle: "First-hand sources from around the world, in your language.",
	heroBody: (sourceCount) =>
		`OpenTrends follows ${sourceCount ?? "hundreds of"} official blogs, research labs, developer communities and Chinese platforms, translates what they publish, and writes a ten-line brief of what changed today.`,
	seoTitle: "First-hand sources from around the world, in your language",
	ctaFeed: "Read today's brief",
	ctaGithub: "View on GitHub",
	statSources: (count) => `${count} sources`,
	statTopics: (count) => `${count} topics`,
	statLanguages: (count) => `${count} languages`,
	briefTitle: "Today's brief",
	briefMore: "Read the full brief",
	briefEmpty:
		"Today's brief is still being written. Open the feed to read the sources as they come in.",
	pillars: [
		{
			title: "Straight from the source",
			body: "Official blogs, lab announcements, GitHub, Hacker News, Reddit, Product Hunt, Zhihu and more. Read the news where it starts, not where it is retold.",
		},
		{
			title: "Translated for you",
			body: "Every headline arrives in your language, with the original title kept alongside. Eight languages today.",
		},
		{
			title: "Ten lines a day",
			body: "An AI brief condenses each topic into ten takeaways, and every line links back to the sources it came from.",
		},
	],
	topicsTitle: "Pick a topic",
	topicsBody: "Each topic follows its own hand-picked list of sources.",
	topicSources: (count) => `${count} sources`,
	agentsTitle: "Built for agents too",
	agentsBody:
		"Connect the MCP server, call the JSON API, subscribe over RSS or install the agent skill. No API key needed.",
	agentsGuide: "Setup guide",
	openSourceTitle: "Open source, MIT licensed",
	openSourceBody:
		"Read the code, suggest a source that is missing, or run your own copy on Cloudflare.",
};

const ZH: LandingStrings = {
	eyebrow: "开源 · 免费 · 无需注册",
	heroTitle: "全球一手信源，用你的语言读。",
	heroBody: (sourceCount) =>
		`OpenTrends 追踪${sourceCount ? ` ${sourceCount} ` : "数百"}个官方博客、研究机构、开发者社区和中文平台，把它们发布的内容翻译过来，再写成十条今日要点。`,
	seoTitle: "全球一手信源，用你的语言读",
	ctaFeed: "阅读今日要点",
	ctaGithub: "查看 GitHub 仓库",
	statSources: (count) => `${count} 个信源`,
	statTopics: (count) => `${count} 个板块`,
	statLanguages: (count) => `${count} 种语言`,
	briefTitle: "今日要点",
	briefMore: "阅读完整要点",
	briefEmpty: "今日要点还在生成中。打开信息流，先看各信源的最新内容。",
	pillars: [
		{
			title: "直达一手信源",
			body: "官方博客、实验室公告、GitHub、Hacker News、Reddit、Product Hunt、知乎等。在消息出发的地方读，而不是转述之后。",
		},
		{
			title: "自动翻译",
			body: "每条标题都翻译成你的语言，原文标题保留在旁边。目前支持 8 种语言。",
		},
		{
			title: "每天十条要点",
			body: "AI 把每个板块浓缩成十条要点，每一条都能点回它引用的原文。",
		},
	],
	topicsTitle: "选一个板块",
	topicsBody: "每个板块都有自己精选的信源。",
	topicSources: (count) => `${count} 个信源`,
	agentsTitle: "也为 Agent 而建",
	agentsBody:
		"接入 MCP server、调用 JSON 接口、订阅 RSS，或安装 Agent skill。不需要 API key。",
	agentsGuide: "接入指南",
	openSourceTitle: "开源，MIT 协议",
	openSourceBody:
		"代码全部公开。缺了哪个信源可以来提，也可以在 Cloudflare 上部署你自己的一份。",
};

const ZH_HANT: LandingStrings = {
	eyebrow: "開源 · 免費 · 無需註冊",
	heroTitle: "全球一手信源，用你的語言讀。",
	heroBody: (sourceCount) =>
		`OpenTrends 追蹤${sourceCount ? ` ${sourceCount} ` : "數百"}個官方部落格、研究機構、開發者社群和中文平台，把它們發布的內容翻譯過來，再寫成十條今日要點。`,
	seoTitle: "全球一手信源，用你的語言讀",
	ctaFeed: "閱讀今日要點",
	ctaGithub: "查看 GitHub 倉庫",
	statSources: (count) => `${count} 個信源`,
	statTopics: (count) => `${count} 個板塊`,
	statLanguages: (count) => `${count} 種語言`,
	briefTitle: "今日要點",
	briefMore: "閱讀完整要點",
	briefEmpty: "今日要點還在生成中。打開資訊流，先看各信源的最新內容。",
	pillars: [
		{
			title: "直達一手信源",
			body: "官方部落格、實驗室公告、GitHub、Hacker News、Reddit、Product Hunt、知乎等。在消息出發的地方讀，而不是轉述之後。",
		},
		{
			title: "自動翻譯",
			body: "每條標題都翻譯成你的語言，原文標題保留在旁邊。目前支援 8 種語言。",
		},
		{
			title: "每天十條要點",
			body: "AI 把每個板塊濃縮成十條要點，每一條都能點回它引用的原文。",
		},
	],
	topicsTitle: "選一個板塊",
	topicsBody: "每個板塊都有自己精選的信源。",
	topicSources: (count) => `${count} 個信源`,
	agentsTitle: "也為 Agent 而建",
	agentsBody:
		"接入 MCP server、呼叫 JSON 介面、訂閱 RSS，或安裝 Agent skill。不需要 API key。",
	agentsGuide: "接入指南",
	openSourceTitle: "開源，MIT 授權",
	openSourceBody:
		"程式碼全部公開。缺了哪個信源可以來提，也可以在 Cloudflare 上部署你自己的一份。",
};

const STRINGS: Partial<Record<Locale, LandingStrings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function landingStrings(locale: Locale): LandingStrings {
	return STRINGS[locale] ?? EN;
}
