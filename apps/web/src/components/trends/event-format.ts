import type { Locale } from "@/lib/i18n";

const SECTION_SEPARATOR = " · ";

// "TechCrunch · AI" names a section; readers know the publisher.
export function publisherName(sourceName: string): string {
	const index = sourceName.indexOf(SECTION_SEPARATOR);
	return index > 0 ? sourceName.slice(0, index) : sourceName;
}

export function dateMs(value: string | undefined): number {
	const time = value ? Date.parse(value) : Number.NaN;
	return Number.isFinite(time) ? time : Date.now();
}

// "9/29 17:15" in the reader's locale: a report's place on a timeline.
export function formatReportTime(value: string | undefined, locale: Locale) {
	if (!value) {
		return "";
	}
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		hour: "2-digit",
		hourCycle: "h23",
		minute: "2-digit",
		month: "numeric",
	}).format(new Date(value));
}

export function joinNames(names: readonly string[], locale: Locale): string {
	return names.join(locale.startsWith("zh") ? "、" : ", ");
}
