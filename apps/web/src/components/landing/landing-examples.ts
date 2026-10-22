import type { Locale } from "@/lib/i18n";

import type { SourceKind } from "./landing-model";

// Worked examples that do not depend on the API, so the page reads the
// same when the service is down: one headline in every reading language,
// one story as several outlets reported it, and a reader's followed page.
// Taken from opentrends.io on 29 September 2026.

export interface TranslationExample {
	code: string;
	label: string;
	locale: Locale;
	text: string;
}

const TRANSLATIONS: readonly TranslationExample[] = [
	{
		locale: "en",
		code: "EN",
		label: "English",
		text: "AMD to acquire World Labs for $8.2 billion",
	},
	{
		locale: "zh",
		code: "简",
		label: "简体中文",
		text: "AMD 将以 82 亿美元收购 World Labs",
	},
	{
		locale: "zh-Hant",
		code: "繁",
		label: "繁體中文",
		text: "AMD 將以 82 億美元收購 World Labs",
	},
	{
		locale: "ru",
		code: "RU",
		label: "Русский",
		text: "AMD покупает World Labs за 8,2 млрд долларов",
	},
	{
		locale: "de-DE",
		code: "DE",
		label: "Deutsch",
		text: "AMD übernimmt World Labs für 8,2 Mrd. Dollar",
	},
	{
		locale: "fr-FR",
		code: "FR",
		label: "Français",
		text: "AMD rachète World Labs pour 8,2 milliards de dollars",
	},
	{
		locale: "es-ES",
		code: "ES",
		label: "Español",
		text: "AMD comprará World Labs por 8.200 millones de dólares",
	},
	{
		locale: "pt-BR",
		code: "PT",
		label: "Português",
		text: "AMD vai comprar a World Labs por US$ 8,2 bilhões",
	},
];

// The original headline as the outlet published it.
export const TRANSLATION_ORIGINAL = {
	source: "The Verge",
	homeUrl: "https://www.theverge.com/",
	title:
		"AMD is acquiring AI company World Labs in a deal worth more than $8 billion",
};

export function translationExamples(
	locale: Locale
): readonly TranslationExample[] {
	const own = TRANSLATIONS.filter((example) => example.locale === locale);
	const rest = TRANSLATIONS.filter((example) => example.locale !== locale);
	return [...own, ...rest];
}

export interface OutletExample {
	homeUrl: string;
	kind: SourceKind;
	source: string;
	title: string;
}

export interface EventExample {
	date: string;
	outlets: readonly OutletExample[];
	summary: string;
	title: string;
}

const OUTLET_HOMES = {
	ars: "https://arstechnica.com/",
	engadget: "https://www.engadget.com/",
	kr36: "https://36kr.com/",
	tc: "https://techcrunch.com/",
	verge: "https://www.theverge.com/",
} as const;

// Only sources on the server's event-eligible list take part in events,
// and that list is the press, so the example shows press outlets only.
const EVENT_EN: EventExample = {
	date: "2026-09-29",
	title: "AMD to acquire World Labs for $8.2 billion",
	summary:
		"AMD will buy the spatial-intelligence startup for $8.2 billion in cash and stock, folding its world-model team into AMD's AI group. Five outlets reported it within two hours.",
	outlets: [
		{
			source: "TechCrunch",
			homeUrl: OUTLET_HOMES.tc,
			kind: "press",
			title: "AMD to acquire World Labs in $8.2B deal",
		},
		{
			source: "The Verge",
			homeUrl: OUTLET_HOMES.verge,
			kind: "press",
			title: "AMD just bought a spatial intelligence startup for $8.2 billion",
		},
		{
			source: "Ars Technica",
			homeUrl: OUTLET_HOMES.ars,
			kind: "press",
			title:
				"AMD's $8.2 billion World Labs purchase is a bet on 3D world models",
		},
		{
			source: "Engadget",
			homeUrl: OUTLET_HOMES.engadget,
			kind: "press",
			title: "AMD is acquiring World Labs for $8.2 billion",
		},
		{
			source: "36Kr",
			homeUrl: OUTLET_HOMES.kr36,
			kind: "press",
			title: "AMD 宣布以 82 亿美元收购 World Labs，押注空间智能",
		},
	],
};

const EVENT_ZH: EventExample = {
	date: "2026-09-29",
	title: "AMD 将以 82 亿美元收购 World Labs",
	summary:
		"AMD 将以 82 亿美元现金加股票收购空间智能创业公司 World Labs，其世界模型团队并入 AMD 的 AI 部门。两小时内五家媒体先后报道。",
	outlets: [
		{
			source: "TechCrunch",
			homeUrl: OUTLET_HOMES.tc,
			kind: "press",
			title: "AMD 以 82 亿美元收购 World Labs",
		},
		{
			source: "The Verge",
			homeUrl: OUTLET_HOMES.verge,
			kind: "press",
			title: "AMD 刚花 82 亿美元买下一家空间智能创业公司",
		},
		{
			source: "Ars Technica",
			homeUrl: OUTLET_HOMES.ars,
			kind: "press",
			title: "AMD 82 亿美元收购 World Labs，押注 3D 世界模型",
		},
		{
			source: "Engadget",
			homeUrl: OUTLET_HOMES.engadget,
			kind: "press",
			title: "AMD 正以 82 亿美元收购 World Labs",
		},
		{
			source: "36Kr",
			homeUrl: OUTLET_HOMES.kr36,
			kind: "press",
			title: "AMD 宣布以 82 亿美元收购 World Labs，押注空间智能",
		},
	],
};

const EVENT_ZH_HANT: EventExample = {
	date: "2026-09-29",
	title: "AMD 將以 82 億美元收購 World Labs",
	summary:
		"AMD 將以 82 億美元現金加股票收購空間智慧新創公司 World Labs，其世界模型團隊併入 AMD 的 AI 部門。兩小時內五家媒體先後報導。",
	outlets: [
		{
			source: "TechCrunch",
			homeUrl: OUTLET_HOMES.tc,
			kind: "press",
			title: "AMD 以 82 億美元收購 World Labs",
		},
		{
			source: "The Verge",
			homeUrl: OUTLET_HOMES.verge,
			kind: "press",
			title: "AMD 剛花 82 億美元買下一家空間智慧新創公司",
		},
		{
			source: "Ars Technica",
			homeUrl: OUTLET_HOMES.ars,
			kind: "press",
			title: "AMD 82 億美元收購 World Labs，押注 3D 世界模型",
		},
		{
			source: "Engadget",
			homeUrl: OUTLET_HOMES.engadget,
			kind: "press",
			title: "AMD 正以 82 億美元收購 World Labs",
		},
		{
			source: "36Kr",
			homeUrl: OUTLET_HOMES.kr36,
			kind: "press",
			title: "AMD 宣布以 82 亿美元收购 World Labs，押注空间智能",
		},
	],
};

export function eventExample(locale: Locale): EventExample {
	if (locale === "zh") {
		return EVENT_ZH;
	}
	if (locale === "zh-Hant") {
		return EVENT_ZH_HANT;
	}
	return EVENT_EN;
}

export interface FollowItemExample {
	ago: string;
	title: string;
}

export interface FollowSourceExample {
	ago: string;
	homeUrl: string;
	items: readonly FollowItemExample[];
	name: string;
}

export interface FollowBriefLine {
	n: number;
	reason: string;
	takeaway: string;
}

export interface FollowExample {
	brief: readonly FollowBriefLine[];
	sources: readonly FollowSourceExample[];
}

const FOLLOW_HOMES = {
	anthropic: "https://www.anthropic.com/news",
	deepmind: "https://deepmind.google/discover/blog/",
	openai: "https://openai.com/news/",
} as const;

const FOLLOW_EN: FollowExample = {
	brief: [
		{
			n: 1,
			takeaway: "All three labs talked about agent reliability today",
			reason:
				"OpenAI shipped platform tools for agents; DeepMind released an evaluation benchmark",
		},
		{
			n: 2,
			takeaway: "Anthropic updated its usage policy, effective next month",
			reason: "Tighter terms for automated accounts and high-risk uses",
		},
		{
			n: 3,
			takeaway: "OpenAI extended data residency to more regions",
			reason: "For enterprise customers with local storage requirements",
		},
	],
	sources: [
		{
			name: "OpenAI News",
			homeUrl: FOLLOW_HOMES.openai,
			ago: "2h",
			items: [
				{
					title: "New developer platform tools for building agents",
					ago: "2h",
				},
				{ title: "Expanding data residency to more regions", ago: "6h" },
				{ title: "Usage policy update for 2026", ago: "1d" },
			],
		},
		{
			name: "Anthropic News",
			homeUrl: FOLLOW_HOMES.anthropic,
			ago: "3h",
			items: [
				{ title: "An update to our usage policy", ago: "3h" },
				{
					title: "Building long-running agents: lessons from production",
					ago: "9h",
				},
				{ title: "Expanding Claude availability to more regions", ago: "2d" },
			],
		},
		{
			name: "Google DeepMind Blog",
			homeUrl: FOLLOW_HOMES.deepmind,
			ago: "4h",
			items: [
				{ title: "A new benchmark for evaluating AI agents", ago: "4h" },
				{ title: "Using AI to accelerate materials discovery", ago: "1d" },
				{
					title: "Our approach to responsible frontier model development",
					ago: "3d",
				},
			],
		},
	],
};

const FOLLOW_ZH: FollowExample = {
	brief: [
		{
			n: 1,
			takeaway: "三家实验室今天都在谈 Agent 的可靠性",
			reason: "OpenAI 发布面向 Agent 的平台工具，DeepMind 推出评测基准",
		},
		{
			n: 2,
			takeaway: "Anthropic 更新使用政策，下月生效",
			reason: "主要收紧自动化账户和高风险用途的条款",
		},
		{
			n: 3,
			takeaway: "OpenAI 把数据驻留扩展到更多地区",
			reason: "面向有本地存储要求的企业客户",
		},
	],
	sources: [
		{
			name: "OpenAI News",
			homeUrl: FOLLOW_HOMES.openai,
			ago: "2 小时前",
			items: [
				{ title: "面向 Agent 开发者的平台更新", ago: "2 小时前" },
				{ title: "数据驻留扩展至更多地区", ago: "6 小时前" },
				{ title: "2026 年使用政策更新", ago: "1 天前" },
			],
		},
		{
			name: "Anthropic News",
			homeUrl: FOLLOW_HOMES.anthropic,
			ago: "3 小时前",
			items: [
				{ title: "使用政策更新", ago: "3 小时前" },
				{ title: "长时间运行 Agent 的工程实践", ago: "9 小时前" },
				{ title: "Claude 在更多地区上线", ago: "2 天前" },
			],
		},
		{
			name: "Google DeepMind Blog",
			homeUrl: FOLLOW_HOMES.deepmind,
			ago: "4 小时前",
			items: [
				{ title: "一个评测 AI Agent 的新基准", ago: "4 小时前" },
				{ title: "用 AI 加速材料发现", ago: "1 天前" },
				{ title: "我们负责任开发前沿模型的方法", ago: "3 天前" },
			],
		},
	],
};

const FOLLOW_ZH_HANT: FollowExample = {
	brief: [
		{
			n: 1,
			takeaway: "三家實驗室今天都在談 Agent 的可靠性",
			reason: "OpenAI 發布面向 Agent 的平台工具，DeepMind 推出評測基準",
		},
		{
			n: 2,
			takeaway: "Anthropic 更新使用政策，下月生效",
			reason: "主要收緊自動化帳戶和高風險用途的條款",
		},
		{
			n: 3,
			takeaway: "OpenAI 把資料駐留擴展到更多地區",
			reason: "面向有本地儲存要求的企業客戶",
		},
	],
	sources: [
		{
			name: "OpenAI News",
			homeUrl: FOLLOW_HOMES.openai,
			ago: "2 小時前",
			items: [
				{ title: "面向 Agent 開發者的平台更新", ago: "2 小時前" },
				{ title: "資料駐留擴展至更多地區", ago: "6 小時前" },
				{ title: "2026 年使用政策更新", ago: "1 天前" },
			],
		},
		{
			name: "Anthropic News",
			homeUrl: FOLLOW_HOMES.anthropic,
			ago: "3 小時前",
			items: [
				{ title: "使用政策更新", ago: "3 小時前" },
				{ title: "長時間運行 Agent 的工程實踐", ago: "9 小時前" },
				{ title: "Claude 在更多地區上線", ago: "2 天前" },
			],
		},
		{
			name: "Google DeepMind Blog",
			homeUrl: FOLLOW_HOMES.deepmind,
			ago: "4 小時前",
			items: [
				{ title: "一個評測 AI Agent 的新基準", ago: "4 小時前" },
				{ title: "用 AI 加速材料發現", ago: "1 天前" },
				{ title: "我們負責任開發前沿模型的方法", ago: "3 天前" },
			],
		},
	],
};

export function followExample(locale: Locale): FollowExample {
	if (locale === "zh") {
		return FOLLOW_ZH;
	}
	if (locale === "zh-Hant") {
		return FOLLOW_ZH_HANT;
	}
	return FOLLOW_EN;
}
