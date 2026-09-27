import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
	type Locale,
	localePathParam,
	type TranslationKey,
	translate,
} from "@/lib/i18n";

import { digestDaysQueryOptions } from "./trends-query";
import type { TrendsPageData } from "./types";

// What a topic page is, in a few lines below the cards: what feeds it, how
// the digest is made, where the archive and the other topics are. It is
// server-rendered so a crawler reads the page's subject in words, and kept
// to a short strip so a reader who came for the cards barely notices it.
// The full source list is in the HTML but folded.

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

const LINK_CLASS = "text-[var(--accent-blue)] hover:underline";

export function TopicAbout({
	locale,
	page,
	topicId,
}: {
	locale: Locale;
	page: TrendsPageData;
	topicId: string;
}) {
	const strings = getStrings(locale);
	const localeParam = localePathParam(locale);
	const days = useQuery(digestDaysQueryOptions(topicId, locale));
	const sources = page.sections.flatMap((section) => section.sources);
	const archiveDays = (days.data ?? []).slice(0, ARCHIVE_LINK_LIMIT);
	const label = topicLabel(topicId, locale);

	return (
		<section
			aria-labelledby="topic-about-heading"
			className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] px-4 py-5 text-[12px] text-[var(--text-secondary)] leading-relaxed sm:px-6"
		>
			<div className="mx-auto max-w-6xl">
				<h2
					className="font-semibold text-[12px] text-[var(--text-primary)]"
					id="topic-about-heading"
				>
					{strings.about} · {label}
					{page.description ? (
						<span className="font-normal text-[var(--text-muted)]">
							{" "}
							— {page.description}
						</span>
					) : null}
				</h2>
				<p className="mt-1 max-w-3xl">
					{strings.summary(sources.length)}{" "}
					<span className="text-[var(--text-muted)]">{strings.archive}:</span>{" "}
					{archiveDays.length > 0 ? (
						archiveDays.map((day, index) => (
							<span key={day}>
								<Link
									className={`${LINK_CLASS} tabular-nums`}
									params={{ day, locale: localeParam, topic: topicId }}
									to="/{-$locale}/trends/$topic/$day"
								>
									{day}
								</Link>
								{index < archiveDays.length - 1 ? " · " : ""}
							</span>
						))
					) : (
						<span className="text-[var(--text-muted)]">
							{strings.archiveEmpty}
						</span>
					)}
				</p>
				<details className="mt-1.5">
					<summary className="cursor-pointer select-none text-[var(--text-muted)] hover:text-[var(--text-primary)]">
						{strings.allSources(sources.length)}
					</summary>
					<ul className="mt-1.5 columns-2 gap-x-6 sm:columns-3 lg:columns-5">
						{sources.map((source) => (
							<li className="truncate" key={source.sourceId}>
								<Link
									className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:underline"
									params={{ id: source.sourceId, locale: localeParam }}
									to="/{-$locale}/sources/$id"
								>
									{source.title}
								</Link>
							</li>
						))}
					</ul>
				</details>
			</div>
		</section>
	);
}
