import type { Locale } from "@/lib/i18n";

// The worked examples the launch film shows, taken from opentrends.io on
// 2026-09-29: one headline in every reading language, and five outlets'
// coverage of the same story merged into one event.

export interface ExampleBadge {
	bg: string;
	t: string;
}

const BADGES = {
	bloomberg: { t: "B", bg: "#1A1A1A" },
	hn: { t: "Y", bg: "#FF6600" },
	reuters: { t: "R", bg: "#FA6400" },
	tc: { t: "TC", bg: "#0A9E01" },
	verge: { t: "V", bg: "#5200FF" },
} as const satisfies Record<string, ExampleBadge>;

export interface TranslationExample {
	code: string;
	label: string;
	text: string;
}

// In the order the film walks through them; the reader's own language is
// moved to the front.
const TRANSLATIONS: readonly (TranslationExample & { locale: Locale })[] = [
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

export function translationExamples(
	locale: Locale
): readonly TranslationExample[] {
	const own = TRANSLATIONS.filter((example) => example.locale === locale);
	const rest = TRANSLATIONS.filter((example) => example.locale !== locale);
	return [...own, ...rest];
}

export interface OutletExample {
	badge: ExampleBadge;
	source: string;
	title: string;
}

export interface EventExample {
	outlets: readonly OutletExample[];
	summary: string;
	title: string;
}

const EVENT_EN: EventExample = {
	title: "AMD to acquire World Labs for $8.2 billion",
	summary:
		"The all-stock deal brings the spatial-intelligence lab into AMD's push into 'physical AI'.",
	outlets: [
		{
			source: "Hacker News",
			badge: BADGES.hn,
			title: "World Labs Is Joining AMD",
		},
		{
			source: "Bloomberg",
			badge: BADGES.bloomberg,
			title: "AMD to Buy Fei-Fei Li’s World Labs AI Startup for $8.2 Billion",
		},
		{
			source: "TechCrunch",
			badge: BADGES.tc,
			title: "AMD will acquire Fei-Fei Li’s World Labs for $8.2 billion",
		},
		{
			source: "The Verge",
			badge: BADGES.verge,
			title:
				"AMD is acquiring AI company World Labs in a deal worth more than $8 billion",
		},
		{
			source: "Reuters",
			badge: BADGES.reuters,
			title:
				"AMD to buy Fei-Fei Li's World Labs in $8.2 billion bet on 'physical AI'",
		},
	],
};

const EVENT_ZH: EventExample = {
	title: "AMD 将以 82 亿美元收购 World Labs",
	summary: "全股票交易，空间智能实验室并入 AMD 的「物理 AI」布局。",
	outlets: [
		{ source: "Hacker News", badge: BADGES.hn, title: "World Labs 将加入 AMD" },
		{
			source: "Bloomberg",
			badge: BADGES.bloomberg,
			title: "AMD 将以 82 亿美元收购李飞飞的 World Labs 人工智能初创公司",
		},
		{
			source: "TechCrunch",
			badge: BADGES.tc,
			title: "AMD 将以 82 亿美元收购李飞飞的 World Labs",
		},
		{
			source: "The Verge",
			badge: BADGES.verge,
			title: "AMD 以超过 80 亿美元收购人工智能公司 World Labs",
		},
		{
			source: "Reuters",
			badge: BADGES.reuters,
			title: "AMD 以 82 亿美元收购李飞飞的 World Labs，押注「物理 AI」",
		},
	],
};

const EVENT_ZH_HANT: EventExample = {
	title: "AMD 將以 82 億美元收購 World Labs",
	summary: "全股票交易，空間智慧實驗室併入 AMD 的「物理 AI」布局。",
	outlets: [
		{ source: "Hacker News", badge: BADGES.hn, title: "World Labs 將加入 AMD" },
		{
			source: "Bloomberg",
			badge: BADGES.bloomberg,
			title: "AMD 將以 82 億美元收購李飛飛的 World Labs 人工智慧新創公司",
		},
		{
			source: "TechCrunch",
			badge: BADGES.tc,
			title: "AMD 將以 82 億美元收購李飛飛的 World Labs",
		},
		{
			source: "The Verge",
			badge: BADGES.verge,
			title: "AMD 以超過 80 億美元收購人工智慧公司 World Labs",
		},
		{
			source: "Reuters",
			badge: BADGES.reuters,
			title: "AMD 以 82 億美元收購李飛飛的 World Labs，押注「物理 AI」",
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
