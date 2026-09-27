import { env } from "@opentrends/env/web";
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

const TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

const ARCHIVE_LINK_LIMIT = 7;

interface Strings {
	about: string;
	agents: string;
	agentsLink: string;
	allSources: (count: number) => string;
	archive: string;
	archiveEmpty: string;
	moreTopics: string;
	rss: string;
	summary: (count: number) => string;
}

const EN: Strings = {
	about: "About this page",
	agents: "Agents & feeds",
	agentsLink: "MCP / JSON",
	allSources: (count) => `All ${count} sources`,
	archive: "Archive",
	archiveEmpty: "fills in daily",
	moreTopics: "More topics",
	rss: "RSS",
	summary: (count) =>
		`Headlines from ${count} sources, refreshed every five minutes. Each day the stories cited by the most sources are distilled into a ten-line digest with citations; past days are kept in the archive.`,
};

const ZH: Strings = {
	about: "关于本页",
	agents: "Agent · 订阅",
	agentsLink: "MCP / JSON",
	allSources: (count) => `全部 ${count} 个来源`,
	archive: "归档",
	archiveEmpty: "逐日补齐",
	moreTopics: "更多板块",
	rss: "RSS",
	summary: (count) =>
		`聚合 ${count} 个来源的最新头条，每五分钟刷新。每天被最多来源引用的新闻浓缩成十条带引用的摘要，往日摘要保存在归档里。`,
};

const ZH_HANT: Strings = {
	about: "關於本頁",
	agents: "Agent · 訂閱",
	agentsLink: "MCP / JSON",
	allSources: (count) => `全部 ${count} 個來源`,
	archive: "歸檔",
	archiveEmpty: "逐日補齊",
	moreTopics: "更多板塊",
	rss: "RSS",
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
const LABEL_CLASS = "w-20 shrink-0 text-[var(--text-muted)]";

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
			className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] px-4 py-4 text-[12px] text-[var(--text-secondary)] leading-relaxed sm:px-6"
		>
			<div className="mx-auto grid max-w-5xl gap-x-10 gap-y-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
				<div className="min-w-0">
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
					<p className="mt-1">{strings.summary(sources.length)}</p>
					<details className="mt-1.5">
						<summary className="cursor-pointer select-none text-[var(--text-muted)] hover:text-[var(--text-primary)]">
							{strings.allSources(sources.length)}
						</summary>
						<ul className="mt-1.5 columns-2 gap-x-6 sm:columns-3 lg:columns-4">
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

				<dl className="min-w-0 space-y-1">
					<div className="flex gap-2">
						<dt className={LABEL_CLASS}>{strings.archive}</dt>
						<dd className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-0.5 tabular-nums">
							{archiveDays.length > 0 ? (
								archiveDays.map((day) => (
									<Link
										className={LINK_CLASS}
										key={day}
										params={{ day, locale: localeParam, topic: topicId }}
										to="/{-$locale}/trends/$topic/$day"
									>
										{day}
									</Link>
								))
							) : (
								<span className="text-[var(--text-muted)]">
									{strings.archiveEmpty}
								</span>
							)}
						</dd>
					</div>
					<div className="flex gap-2">
						<dt className={LABEL_CLASS}>{strings.moreTopics}</dt>
						<dd className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-0.5">
							{TOPIC_IDS.filter((id) => id !== topicId).map((id) => (
								<Link
									className={LINK_CLASS}
									key={id}
									params={{ locale: localeParam, topic: id }}
									to="/{-$locale}/trends/$topic"
								>
									{topicLabel(id, locale)}
								</Link>
							))}
						</dd>
					</div>
					<div className="flex gap-2">
						<dt className={LABEL_CLASS}>{strings.agents}</dt>
						<dd className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-0.5">
							<Link
								className={LINK_CLASS}
								params={{ locale: localeParam }}
								to="/{-$locale}/agents"
							>
								{strings.agentsLink}
							</Link>
							<a
								className={LINK_CLASS}
								href={`${env.VITE_SERVER_URL}/api/trends/${encodeURIComponent(topicId)}/feed.xml`}
							>
								{strings.rss}
							</a>
						</dd>
					</div>
				</dl>
			</div>
		</section>
	);
}
