import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
	type Locale,
	localePathParam,
	type TranslationKey,
	translate,
} from "@/lib/i18n";

import { digestDaysQueryOptions, trendsPageQueryOptions } from "./trends-query";

// Two small pieces the footer shows on a topic page: the archived digest
// days (the only links to those pages besides the sitemap) and, as small
// print at the very bottom, the page's sources, each linking to its own
// page. Both read the page from the query cache the route loader filled,
// on the server too, so they never fetch on their own.

const ARCHIVE_LINK_LIMIT = 7;

interface Strings {
	archive: string;
	sources: (label: string, count: number) => string;
}

const EN: Strings = {
	archive: "Past digests",
	sources: (label, count) => `${label} · ${count} sources`,
};

const ZH: Strings = {
	archive: "往日摘要",
	sources: (label, count) => `${label} · ${count} 个来源`,
};

const ZH_HANT: Strings = {
	archive: "往日摘要",
	sources: (label, count) => `${label} · ${count} 個來源`,
};

const STRINGS: Partial<Record<Locale, Strings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

function getStrings(locale: Locale): Strings {
	return STRINGS[locale] ?? EN;
}

function topicLabel(topic: string, locale: Locale): string {
	const key = `topic.${topic}` as TranslationKey;
	const label = translate(locale, key);
	return label === key ? topic : label;
}

export function TopicArchiveLinks({
	locale,
	topicId,
}: {
	locale: Locale;
	topicId: string;
}) {
	const strings = getStrings(locale);
	const days = useQuery(digestDaysQueryOptions(topicId, locale));
	const archiveDays = (days.data ?? []).slice(0, ARCHIVE_LINK_LIMIT);
	if (archiveDays.length === 0) {
		return null;
	}
	return (
		<p className="mt-3 text-[11px] text-[var(--text-muted)]">
			<span>{strings.archive}:</span>{" "}
			{archiveDays.map((day, index) => (
				<span key={day}>
					<Link
						className="text-[var(--text-secondary)] tabular-nums transition-colors hover:text-[var(--text-primary)]"
						params={{ day, locale: localePathParam(locale), topic: topicId }}
						to="/{-$locale}/trends/$topic/$day"
					>
						{day}
					</Link>
					{index < archiveDays.length - 1 ? " · " : ""}
				</span>
			))}
		</p>
	);
}

export function TopicSourceLine({
	locale,
	topicId,
}: {
	locale: Locale;
	topicId: string;
}) {
	const strings = getStrings(locale);
	const page = useQuery({
		...trendsPageQueryOptions(topicId, locale),
		enabled: false,
	});
	if (!page.data) {
		return null;
	}
	const sources = page.data.sections.flatMap((section) => section.sources);
	const label = topicLabel(topicId, locale);
	return (
		<p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
			<span>{strings.sources(label, sources.length)}:</span>{" "}
			{sources.map((source, index) => (
				<span key={source.sourceId}>
					<Link
						className="transition-colors hover:text-[var(--text-primary)]"
						params={{ id: source.sourceId, locale: localePathParam(locale) }}
						to="/{-$locale}/sources/$id"
					>
						{source.title}
					</Link>
					{index < sources.length - 1 ? " · " : ""}
				</span>
			))}
		</p>
	);
}
