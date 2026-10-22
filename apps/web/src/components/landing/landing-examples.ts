import type { Locale } from "@/lib/i18n";

import type { ContentTopicId, SourceKind } from "./landing-model";

// Worked examples that do not depend on the API, so the page reads the
// same when the service is down: a feed read in one language, one story
// as several outlets reported it, a reader's followed page, and a brief.
// Generic by design: nothing here is a checkable dated announcement.

export const LANGUAGE_LABELS: Record<Locale, string> = {
	en: "English",
	zh: "简体中文",
	"zh-Hant": "繁體中文",
	ru: "Русский",
	"de-DE": "Deutsch",
	"fr-FR": "Français",
	"es-ES": "Español",
	"pt-BR": "Português",
};

export interface LanguageFeedItem {
	homeUrl: string;
	kind: SourceKind;
	original: string;
	// The original's language, as the feed labels it.
	originalLang: string;
	source: string;
	topic: ContentTopicId;
	translated: string;
}

interface LanguageFeedSeed {
	homeUrl: string;
	kind: SourceKind;
	originalLang: string;
	originalLocale: Locale;
	source: string;
	texts: Record<Locale, string>;
	topic: ContentTopicId;
}

// Two English originals and two Chinese originals, so the row of originals
// itself shows "collected from two languages, read in one".
const LANGUAGE_FEED: readonly LanguageFeedSeed[] = [
	{
		source: "Hacker News",
		homeUrl: "https://news.ycombinator.com/",
		kind: "community",
		topic: "programming",
		originalLang: "EN",
		originalLocale: "en",
		texts: {
			en: "Show HN: I replaced my RSS reader with a 200-line script",
			zh: "Show HN：我用一个 200 行的脚本替掉了 RSS 阅读器",
			"zh-Hant": "Show HN：我用一個 200 行的腳本取代了 RSS 閱讀器",
			ru: "Show HN: я заменил RSS-ридер скриптом на 200 строк",
			"de-DE":
				"Show HN: Ich habe meinen RSS-Reader durch ein 200-Zeilen-Skript ersetzt",
			"fr-FR":
				"Show HN : j'ai remplacé mon lecteur RSS par un script de 200 lignes",
			"es-ES":
				"Show HN: he sustituido mi lector RSS por un script de 200 líneas",
			"pt-BR": "Show HN: troquei meu leitor de RSS por um script de 200 linhas",
		},
	},
	{
		source: "TechCrunch",
		homeUrl: "https://techcrunch.com/",
		kind: "press",
		topic: "embodied",
		originalLang: "EN",
		originalLocale: "en",
		texts: {
			en: "A humanoid robotics startup raises $300M to put robots on factory floors",
			zh: "一家人形机器人创业公司融资 3 亿美元，目标是进工厂",
			"zh-Hant": "一家人形機器人新創公司募資 3 億美元，目標是進工廠",
			ru: "Стартап гуманоидных роботов привлёк $300 млн, чтобы вывести роботов на заводы",
			"de-DE":
				"Humanoid-Robotik-Start-up sammelt 300 Mio. Dollar, um Roboter in Fabriken zu bringen",
			"fr-FR":
				"Une start-up de robots humanoïdes lève 300 M$ pour les envoyer en usine",
			"es-ES":
				"Una startup de robots humanoides recauda 300 M$ para llevarlos a las fábricas",
			"pt-BR":
				"Startup de robôs humanoides capta US$ 300 mi para levá-los ao chão de fábrica",
		},
	},
	{
		source: "36Kr",
		homeUrl: "https://36kr.com/",
		kind: "press",
		topic: "cn",
		originalLang: "中文",
		originalLocale: "zh",
		texts: {
			en: "A Chinese open-source model tops the coding leaderboard; the team behind it has 30 people",
			zh: "国产开源大模型登顶代码榜单，背后是一家 30 人团队",
			"zh-Hant": "國產開源大模型登頂程式碼榜單，背後是一家 30 人團隊",
			ru: "Китайская открытая модель возглавила рейтинг по программированию; за ней стоит команда из 30 человек",
			"de-DE":
				"Chinesisches Open-Source-Modell führt das Coding-Ranking an, dahinter steht ein 30-köpfiges Team",
			"fr-FR":
				"Un modèle open source chinois prend la tête du classement de code ; derrière, une équipe de 30 personnes",
			"es-ES":
				"Un modelo chino de código abierto lidera el ranking de programación; detrás hay un equipo de 30 personas",
			"pt-BR":
				"Modelo chinês de código aberto lidera o ranking de programação; por trás, uma equipe de 30 pessoas",
		},
	},
	{
		source: "V2EX",
		homeUrl: "https://www.v2ex.com/",
		kind: "community",
		topic: "cn",
		originalLang: "中文",
		originalLocale: "zh",
		texts: {
			en: "What local model are you running for coding these days? Looking for recommendations",
			zh: "大家现在本地跑什么模型写代码？求推荐",
			"zh-Hant": "大家現在本地跑什麼模型寫程式？求推薦",
			ru: "Какую локальную модель вы сейчас используете для кода? Посоветуйте",
			"de-DE":
				"Welches lokale Modell nutzt ihr gerade zum Programmieren? Bitte um Empfehlungen",
			"fr-FR":
				"Quel modèle local utilisez-vous pour coder en ce moment ? Je cherche des recommandations",
			"es-ES":
				"¿Qué modelo local usáis ahora para programar? Busco recomendaciones",
			"pt-BR":
				"Qual modelo local vocês estão rodando para programar? Aceito recomendações",
		},
	},
];

// The feed as a reader of `locale` sees it: every headline in that
// language, the original underneath.
export function languageFeed(locale: Locale): LanguageFeedItem[] {
	return LANGUAGE_FEED.map((seed) => ({
		homeUrl: seed.homeUrl,
		kind: seed.kind,
		original: seed.texts[seed.originalLocale],
		originalLang: seed.originalLang,
		source: seed.source,
		topic: seed.topic,
		translated: seed.texts[locale],
	}));
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
	title: string;
}

export interface FollowSourceExample {
	homeUrl: string;
	id: string;
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
			id: "openai-news",
			homeUrl: FOLLOW_HOMES.openai,
			items: [
				{
					title: "New developer platform tools for building agents",
				},
				{ title: "Expanding data residency to more regions" },
				{ title: "Usage policy update for 2026" },
			],
		},
		{
			name: "Anthropic News",
			id: "anthropic-news",
			homeUrl: FOLLOW_HOMES.anthropic,
			items: [
				{ title: "An update to our usage policy" },
				{
					title: "Building long-running agents: lessons from production",
				},
				{ title: "Expanding Claude availability to more regions" },
			],
		},
		{
			name: "Google DeepMind Blog",
			id: "deepmind-blog",
			homeUrl: FOLLOW_HOMES.deepmind,
			items: [
				{ title: "A new benchmark for evaluating AI agents" },
				{ title: "Using AI to accelerate materials discovery" },
				{
					title: "Our approach to responsible frontier model development",
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
			id: "openai-news",
			homeUrl: FOLLOW_HOMES.openai,
			items: [
				{ title: "面向 Agent 开发者的平台更新" },
				{ title: "数据驻留扩展至更多地区" },
				{ title: "2026 年使用政策更新" },
			],
		},
		{
			name: "Anthropic News",
			id: "anthropic-news",
			homeUrl: FOLLOW_HOMES.anthropic,
			items: [
				{ title: "使用政策更新" },
				{ title: "长时间运行 Agent 的工程实践" },
				{ title: "Claude 在更多地区上线" },
			],
		},
		{
			name: "Google DeepMind Blog",
			id: "deepmind-blog",
			homeUrl: FOLLOW_HOMES.deepmind,
			items: [
				{ title: "一个评测 AI Agent 的新基准" },
				{ title: "用 AI 加速材料发现" },
				{ title: "我们负责任开发前沿模型的方法" },
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
			id: "openai-news",
			homeUrl: FOLLOW_HOMES.openai,
			items: [
				{ title: "面向 Agent 開發者的平台更新" },
				{ title: "資料駐留擴展至更多地區" },
				{ title: "2026 年使用政策更新" },
			],
		},
		{
			name: "Anthropic News",
			id: "anthropic-news",
			homeUrl: FOLLOW_HOMES.anthropic,
			items: [
				{ title: "使用政策更新" },
				{ title: "長時間運行 Agent 的工程實踐" },
				{ title: "Claude 在更多地區上線" },
			],
		},
		{
			name: "Google DeepMind Blog",
			id: "deepmind-blog",
			homeUrl: FOLLOW_HOMES.deepmind,
			items: [
				{ title: "一個評測 AI Agent 的新基準" },
				{ title: "用 AI 加速材料發現" },
				{ title: "我們負責任開發前沿模型的方法" },
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

export interface BriefDemoLine {
	n: number;
	reason: string;
	sources: readonly string[];
	takeaway: string;
	topic: ContentTopicId;
}

const BRIEF_EN: readonly BriefDemoLine[] = [
	{
		n: 1,
		topic: "ai",
		takeaway: "A lab halves the API price of its reasoning model",
		reason: "The price war moves from training to inference",
		sources: ["The Decoder", "VentureBeat · AI"],
	},
	{
		n: 2,
		topic: "ai",
		takeaway:
			"An open model ties the closed leader on a coding benchmark for the first time",
		reason: "A local coding assistant is now good enough",
		sources: ["Hugging Face Blog", "r/LocalLLaMA"],
	},
	{
		n: 3,
		topic: "embodied",
		takeaway:
			"Three humanoid-robot makers announce factory pilots in the same week",
		reason: "Embodied AI moves from demos to orders",
		sources: ["The Robot Report", "IEEE Spectrum Robotics"],
	},
	{
		n: 4,
		topic: "hardware",
		takeaway: "A consumer AI-glasses maker reports a million units shipped",
		reason: "Glasses become the second screen after the phone",
		sources: ["The Verge · Gadgets"],
	},
	{
		n: 5,
		topic: "biotech",
		takeaway:
			"A brain-computer interface trial reaches 90 characters a minute by thought",
		reason: "Close to able-bodied typing speed",
		sources: ["Nature", "Neuroscience News"],
	},
	{
		n: 6,
		topic: "programming",
		takeaway: "A major code editor makes agent mode the default",
		reason: "The default way to write code just changed",
		sources: ["Hacker News"],
	},
	{
		n: 7,
		topic: "programming",
		takeaway: "A two-person open-source framework tops GitHub Trending",
		reason: "Tiny teams still set the developer-tool agenda",
		sources: ["GitHub Trending"],
	},
	{
		n: 8,
		topic: "cn",
		takeaway:
			"A Chinese tech giant drops its model API below 1 yuan per million tokens",
		reason: "Inference in China is nearing free",
		sources: ["36Kr", "IT之家"],
	},
	{
		n: 9,
		topic: "cn",
		takeaway:
			"Several Chinese automakers push city driver-assistance to all users in one week",
		reason: "Driver assistance enters its mass phase",
		sources: ["爱范儿", "极客公园"],
	},
	{
		n: 10,
		topic: "hardware",
		takeaway: "A desktop NPU runs a 70B model locally",
		reason: "Large models start leaving the data center",
		sources: ["Tom's Hardware", "ServeTheHome"],
	},
];

const BRIEF_ZH: readonly BriefDemoLine[] = [
	{
		n: 1,
		topic: "ai",
		takeaway: "一家实验室把推理模型的 API 价格砍半",
		reason: "价格战从训练转到推理",
		sources: ["The Decoder", "VentureBeat · AI"],
	},
	{
		n: 2,
		topic: "ai",
		takeaway: "开源模型在代码榜单上首次追平闭源第一",
		reason: "本地跑代码助手够用了",
		sources: ["Hugging Face Blog", "r/LocalLLaMA"],
	},
	{
		n: 3,
		topic: "embodied",
		takeaway: "三家人形机器人公司同一周宣布进厂试点",
		reason: "具身智能从演示走向订单",
		sources: ["The Robot Report", "IEEE Spectrum Robotics"],
	},
	{
		n: 4,
		topic: "hardware",
		takeaway: "一款消费级 AI 眼镜宣布出货过百万台",
		reason: "眼镜成了手机之后的第二块屏",
		sources: ["The Verge · Gadgets"],
	},
	{
		n: 5,
		topic: "biotech",
		takeaway: "脑机接口试验让受试者用意念打字每分钟 90 字",
		reason: "已接近健全人的输入速度",
		sources: ["Nature", "Neuroscience News"],
	},
	{
		n: 6,
		topic: "programming",
		takeaway: "一款主流代码编辑器把 Agent 模式设为默认",
		reason: "写代码的默认姿势变了",
		sources: ["Hacker News"],
	},
	{
		n: 7,
		topic: "programming",
		takeaway: "一个两人团队的开源框架登上 GitHub 趋势榜首",
		reason: "小团队仍能定义开发者工具",
		sources: ["GitHub Trending"],
	},
	{
		n: 8,
		topic: "cn",
		takeaway: "国内一家大厂把模型 API 降到每百万 token 不到一元",
		reason: "国内推理成本逼近零",
		sources: ["36 氪", "IT之家"],
	},
	{
		n: 9,
		topic: "cn",
		takeaway: "几家国内车企同周向全部用户推送城市辅助驾驶",
		reason: "辅助驾驶进入普及期",
		sources: ["爱范儿", "极客公园"],
	},
	{
		n: 10,
		topic: "hardware",
		takeaway: "一款桌面 NPU 芯片让 70B 模型本地可跑",
		reason: "大模型开始离开数据中心",
		sources: ["Tom's Hardware", "ServeTheHome"],
	},
];

const BRIEF_ZH_HANT: readonly BriefDemoLine[] = [
	{
		n: 1,
		topic: "ai",
		takeaway: "一家實驗室把推理模型的 API 價格砍半",
		reason: "價格戰從訓練轉到推理",
		sources: ["The Decoder", "VentureBeat · AI"],
	},
	{
		n: 2,
		topic: "ai",
		takeaway: "開源模型在程式碼榜單上首次追平閉源第一",
		reason: "本地跑程式助手夠用了",
		sources: ["Hugging Face Blog", "r/LocalLLaMA"],
	},
	{
		n: 3,
		topic: "embodied",
		takeaway: "三家人形機器人公司同一週宣布進廠試點",
		reason: "具身智慧從展示走向訂單",
		sources: ["The Robot Report", "IEEE Spectrum Robotics"],
	},
	{
		n: 4,
		topic: "hardware",
		takeaway: "一款消費級 AI 眼鏡宣布出貨破百萬台",
		reason: "眼鏡成了手機之後的第二塊螢幕",
		sources: ["The Verge · Gadgets"],
	},
	{
		n: 5,
		topic: "biotech",
		takeaway: "腦機介面試驗讓受試者用意念打字每分鐘 90 字",
		reason: "已接近健全人的輸入速度",
		sources: ["Nature", "Neuroscience News"],
	},
	{
		n: 6,
		topic: "programming",
		takeaway: "一款主流程式編輯器把 Agent 模式設為預設",
		reason: "寫程式的預設姿勢變了",
		sources: ["Hacker News"],
	},
	{
		n: 7,
		topic: "programming",
		takeaway: "一個兩人團隊的開源框架登上 GitHub 趨勢榜首",
		reason: "小團隊仍能定義開發者工具",
		sources: ["GitHub Trending"],
	},
	{
		n: 8,
		topic: "cn",
		takeaway: "中國一家大廠把模型 API 降到每百萬 token 不到一元",
		reason: "中國推理成本逼近零",
		sources: ["36 氪", "IT之家"],
	},
	{
		n: 9,
		topic: "cn",
		takeaway: "幾家中國車企同週向全部用戶推送城市輔助駕駛",
		reason: "輔助駕駛進入普及期",
		sources: ["愛范兒", "極客公園"],
	},
	{
		n: 10,
		topic: "hardware",
		takeaway: "一款桌面 NPU 晶片讓 70B 模型本地可跑",
		reason: "大模型開始離開資料中心",
		sources: ["Tom's Hardware", "ServeTheHome"],
	},
];

export function briefDemo(locale: Locale): readonly BriefDemoLine[] {
	if (locale === "zh") {
		return BRIEF_ZH;
	}
	if (locale === "zh-Hant") {
		return BRIEF_ZH_HANT;
	}
	return BRIEF_EN;
}
