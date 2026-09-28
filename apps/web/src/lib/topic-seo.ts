import type { Locale } from "./i18n";

// What each topic page is about, in the words people search for. One
// subject per page: the title carries it, the description repeats it in a
// sentence, and the keywords are its close variants only. Locales without
// their own entry fall back to the English subject with a localized frame.

export interface TopicSeo {
	description: string;
	keywords: string[];
	title: string;
}

export type SeoTopicId =
	| "featured"
	| "ai"
	| "embodied"
	| "hardware"
	| "biotech"
	| "programming"
	| "cn";

const EN: Record<SeoTopicId, TopicSeo> = {
	featured: {
		title: "Tech News Today",
		description:
			"Today's most-cited technology stories from Hacker News, The Verge, TechCrunch, Reuters and twenty more sources, distilled into a ten-line digest with citations. Refreshed every five minutes.",
		keywords: ["tech news", "tech news today"],
	},
	ai: {
		title: "AI News Today",
		description:
			"Today's AI news from research labs, product blogs and developer communities, ranked by how many sources report each story and distilled into a ten-line digest with citations. Refreshed every five minutes.",
		keywords: ["AI news", "AI news today", "artificial intelligence news"],
	},
	embodied: {
		title: "Robotics & Embodied AI News",
		description:
			"Humanoid robots, embodied AI research and robotics industry news from labs, companies and communities, distilled into a daily digest with citations.",
		keywords: ["robotics news", "embodied AI", "humanoid robot news"],
	},
	hardware: {
		title: "Hardware & Chip News",
		description:
			"Semiconductors, consumer devices, maker hardware and chip industry news from the sources that break it, distilled into a daily digest with citations.",
		keywords: ["hardware news", "semiconductor news", "chip news"],
	},
	biotech: {
		title: "Biotech News Today",
		description:
			"Biotechnology, drug development and life-science research news from journals, companies and communities, distilled into a daily digest with citations.",
		keywords: ["biotech news", "biotechnology news", "life science news"],
	},
	programming: {
		title: "Developer News & Trending Repositories",
		description:
			"What developers are reading and starring today: GitHub trending, Hacker News, engineering blogs and language communities, distilled into a daily digest with citations.",
		keywords: ["developer news", "programming news", "GitHub trending"],
	},
	cn: {
		title: "Chinese Internet Trending Topics",
		description:
			"What is trending on the Chinese internet today: Weibo, Zhihu, 36Kr, IT之家 and developer communities, translated and distilled into a daily digest with citations.",
		keywords: ["China tech news", "Weibo trending", "Zhihu hot list"],
	},
};

const ZH: Record<SeoTopicId, TopicSeo> = {
	featured: {
		title: "今日科技热点",
		description:
			"Hacker News、The Verge、TechCrunch、路透等二十多个来源今天报道最多的科技新闻，浓缩成十条带引用的摘要，每五分钟刷新。",
		keywords: ["科技热点", "今日科技新闻"],
	},
	ai: {
		title: "AI 资讯今日热点",
		description:
			"研究机构、产品博客和开发者社区今天的 AI 新闻，按被多少来源报道排序，浓缩成十条带引用的摘要，每五分钟刷新。",
		keywords: ["AI 资讯", "AI 新闻", "人工智能新闻"],
	},
	embodied: {
		title: "机器人与具身智能资讯",
		description:
			"人形机器人、具身智能研究和机器人产业新闻，来自实验室、公司和社区，每天浓缩成一份带引用的摘要。",
		keywords: ["机器人资讯", "具身智能", "人形机器人新闻"],
	},
	hardware: {
		title: "硬件与芯片资讯",
		description:
			"半导体、消费电子、创客硬件和芯片产业新闻，来自最早报道的那些来源，每天浓缩成一份带引用的摘要。",
		keywords: ["硬件资讯", "半导体新闻", "芯片新闻"],
	},
	biotech: {
		title: "生物科技资讯",
		description:
			"生物技术、药物研发和生命科学研究新闻，来自期刊、公司和社区，每天浓缩成一份带引用的摘要。",
		keywords: ["生物科技资讯", "生物技术新闻", "生命科学新闻"],
	},
	programming: {
		title: "编程与开发者热点",
		description:
			"开发者今天在读什么、在 star 什么：GitHub 趋势、Hacker News、工程博客和语言社区，每天浓缩成一份带引用的摘要。",
		keywords: ["开发者资讯", "编程新闻", "GitHub 趋势"],
	},
	cn: {
		title: "中文互联网热榜",
		description:
			"微博、知乎、36氪、IT之家和开发者社区今天在热议什么，每天浓缩成一份带引用的摘要。",
		keywords: ["中文热榜", "微博热搜", "知乎热榜"],
	},
};

const ZH_HANT: Record<SeoTopicId, TopicSeo> = {
	featured: {
		title: "今日科技熱點",
		description:
			"Hacker News、The Verge、TechCrunch、路透等二十多個來源今天報導最多的科技新聞，濃縮成十條帶引用的摘要，每五分鐘更新。",
		keywords: ["科技熱點", "今日科技新聞"],
	},
	ai: {
		title: "AI 資訊今日熱點",
		description:
			"研究機構、產品部落格和開發者社群今天的 AI 新聞，按被多少來源報導排序，濃縮成十條帶引用的摘要，每五分鐘更新。",
		keywords: ["AI 資訊", "AI 新聞", "人工智慧新聞"],
	},
	embodied: {
		title: "機器人與具身智慧資訊",
		description:
			"人形機器人、具身智慧研究和機器人產業新聞，來自實驗室、公司和社群，每天濃縮成一份帶引用的摘要。",
		keywords: ["機器人資訊", "具身智慧", "人形機器人新聞"],
	},
	hardware: {
		title: "硬體與晶片資訊",
		description:
			"半導體、消費電子、創客硬體和晶片產業新聞，來自最早報導的那些來源，每天濃縮成一份帶引用的摘要。",
		keywords: ["硬體資訊", "半導體新聞", "晶片新聞"],
	},
	biotech: {
		title: "生物科技資訊",
		description:
			"生物技術、藥物研發和生命科學研究新聞，來自期刊、公司和社群，每天濃縮成一份帶引用的摘要。",
		keywords: ["生物科技資訊", "生物技術新聞", "生命科學新聞"],
	},
	programming: {
		title: "程式設計與開發者熱點",
		description:
			"開發者今天在讀什麼、在 star 什麼：GitHub 趨勢、Hacker News、工程部落格和語言社群，每天濃縮成一份帶引用的摘要。",
		keywords: ["開發者資訊", "程式設計新聞", "GitHub 趨勢"],
	},
	cn: {
		title: "中文網路熱榜",
		description:
			"微博、知乎、36氪、IT之家和開發者社群今天在熱議什麼，每天濃縮成一份帶引用的摘要。",
		keywords: ["中文熱榜", "微博熱搜", "知乎熱榜"],
	},
};

const BY_LOCALE: Partial<Record<Locale, Record<SeoTopicId, TopicSeo>>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

export function isSeoTopicId(topic: string): topic is SeoTopicId {
	return topic in EN;
}

// Locales without their own copy keep the English subject, since that is
// what their readers type too, framed by the localized topic label.
export function topicSeo(
	topic: string,
	locale: Locale,
	localizedLabel: string
): TopicSeo | undefined {
	if (!isSeoTopicId(topic)) {
		return;
	}
	const own = BY_LOCALE[locale]?.[topic];
	if (own) {
		return own;
	}
	const en = EN[topic];
	return {
		description: `${localizedLabel} — ${en.description}`,
		keywords: [localizedLabel, ...en.keywords],
		title: `${localizedLabel} · ${en.title}`,
	};
}
