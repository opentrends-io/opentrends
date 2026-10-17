import type { Locale } from "@/lib/i18n";

// One real headline (opentrends.io, 29 September 2026) in every reading
// language, to show translation rather than describe it. The reader's own
// language comes first.

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

export function translationExamples(
	locale: Locale
): readonly TranslationExample[] {
	const own = TRANSLATIONS.filter((example) => example.locale === locale);
	const rest = TRANSLATIONS.filter((example) => example.locale !== locale);
	return [...own, ...rest];
}
