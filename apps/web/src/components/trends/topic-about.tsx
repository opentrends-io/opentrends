import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
	type Locale,
	localePathParam,
	type TranslationKey,
	translate,
} from "@/lib/i18n";

import { digestDaysQueryOptions, trendsPageQueryOptions } from "./trends-query";

// What a topic page is, in a few lines inside the footer: what feeds it,
// how the digest is made, where the archive is. It is server-rendered so a
// crawler reads the page's subject in words; the full source list is in
// the HTML but folded.

const ARCHIVE_LINK_LIMIT = 7;

interface Strings {
	about: string;
	allSources: (count: number) => string;
	archive: string;
	archiveEmpty: string;
	summary: (count: number) => string;
}

const EN: Strings = {
	about: "About this page",
	allSources: (count) => `All ${count} sources`,
	archive: "Archive",
	archiveEmpty: "fills in daily",
	summary: (count) =>
		`Headlines from ${count} sources, refreshed every five minutes. Each day the stories cited by the most sources are distilled into a ten-line digest with citations; past days are kept in the archive.`,
};

const ZH: Strings = {
	about: "关于本页",
	allSources: (count) => `全部 ${count} 个来源`,
	archive: "归档",
	archiveEmpty: "逐日补齐",
	summary: (count) =>
		`聚合 ${count} 个来源的最新头条，每五分钟刷新。每天被最多来源引用的新闻浓缩成十条带引用的摘要，往日摘要保存在归档里。`,
};

const ZH_HANT: Strings = {
	about: "關於本頁",
	allSources: (count) => `全部 ${count} 個來源`,
	archive: "歸檔",
	archiveEmpty: "逐日補齊",
	summary: (count) =>
		`聚合 ${count} 個來源的最新頭條，每五分鐘更新。每天被最多來源引用的新聞濃縮成十條帶引用的摘要，往日摘要保存在歸檔裡。`,
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

// Rendered inside the site footer on a topic page. The page data is
// already in the query cache (the route loader put it there, on the server
// too), so this never fetches on its own.
export function TopicAbout({
	locale,
	topicId,
}: {
	locale: Locale;
	topicId: string;
}) {
	const strings = getStrings(locale);
	const localeParam = localePathParam(locale);
	const page = useQuery({
		...trendsPageQueryOptions(topicId, locale),
		enabled: false,
	});
	const days = useQuery(digestDaysQueryOptions(topicId, locale));
	if (!page.data) {
		return null;
	}
	const sources = page.data.sections.flatMap((section) => section.sources);
	const archiveDays = (days.data ?? []).slice(0, ARCHIVE_LINK_LIMIT);
	const label = topicLabel(topicId, locale);

	return (
		<section
			aria-labelledby="topic-about-heading"
			className="px-3 pb-3 text-[10.5px] text-[var(--text-muted)] leading-relaxed sm:px-4"
		>
			<p>
				<h2
					className="inline font-medium text-[10.5px]"
					id="topic-about-heading"
				>
					{strings.about} · {label}
					{page.data.description ? ` — ${page.data.description}` : ""}
				</h2>{" "}
				{strings.summary(sources.length)} {strings.archive}:{" "}
				{archiveDays.length > 0
					? archiveDays.map((day, index) => (
							<span key={day}>
								<Link
									className="tabular-nums hover:text-[var(--text-primary)] hover:underline"
									params={{ day, locale: localeParam, topic: topicId }}
									to="/{-$locale}/trends/$topic/$day"
								>
									{day}
								</Link>
								{index < archiveDays.length - 1 ? " · " : ""}
							</span>
						))
					: strings.archiveEmpty}
			</p>
			<details>
				<summary className="cursor-pointer select-none hover:text-[var(--text-primary)]">
					{strings.allSources(sources.length)}
				</summary>
				<p className="mt-0.5">
					{sources.map((source, index) => (
						<span key={source.sourceId}>
							<Link
								className="hover:text-[var(--text-primary)] hover:underline"
								params={{ id: source.sourceId, locale: localeParam }}
								to="/{-$locale}/sources/$id"
							>
								{source.title}
							</Link>
							{index < sources.length - 1 ? " · " : ""}
						</span>
					))}
				</p>
			</details>
		</section>
	);
}
