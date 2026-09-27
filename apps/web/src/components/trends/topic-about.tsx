import { env } from "@opentrends/env/web";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
	type Locale,
	localePathParam,
	type TranslationKey,
	translate,
} from "@/lib/i18n";

import { digestDaysQueryOptions } from "./trends-query";
import type { TrendsPageData } from "./types";

// What a topic page is, in prose, below the cards: which sources feed it,
// how the digest is made, where the archive and the other topics are. It
// is server-rendered so a crawler reads the page's subject in words, and
// it sits at the very bottom so a reader who came for the cards never has
// to scroll past it.

const TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

const ARCHIVE_LINK_LIMIT = 14;

interface Strings {
	about: string;
	agents: string;
	agentsBody: string;
	agentsLink: string;
	archive: string;
	archiveEmpty: string;
	digest: string;
	howTo: string;
	moreTopics: string;
	rss: string;
	sources: (count: number) => string;
	sourcesTail: string;
}

const EN: Strings = {
	about: "About this page",
	agents: "For agents and feed readers",
	agentsBody:
		"The same digest is available as JSON, RSS and over MCP, so an agent or a feed reader can follow this topic without scraping the page.",
	agentsLink: "Set up an agent",
	archive: "Daily digest archive",
	archiveEmpty:
		"The archive fills in day by day as digests are generated; check back tomorrow.",
	digest:
		"Every day the stories cited by the most sources are distilled into a ten-line digest with numbered citations, so a minute's read shows what mattered and each claim can be checked against the original reporting. The digest at the top of this page updates through the day; past days are kept in the archive below.",
	howTo:
		"Use the view switch to move between the recommended feed, the source cards and the event stream. Star a source to follow it and build a page of your own; hide the ones you never read; drag cards into the order you prefer. Titles are translated into eight languages, so the same page reads naturally wherever you are.",
	moreTopics: "More topics",
	rss: "RSS feed",
	sources: (count) =>
		`This page gathers the latest headlines from ${count} sources, refreshed every five minutes:`,
	sourcesTail: "Each source has its own page with its recent items.",
};

const ZH: Strings = {
	about: "关于本页",
	agents: "给 Agent 和订阅器",
	agentsBody:
		"同一份摘要也提供 JSON、RSS 和 MCP 三种形式，Agent 或 RSS 阅读器可以直接订阅这个板块，不必抓网页。",
	agentsLink: "接入 Agent",
	archive: "每日摘要归档",
	archiveEmpty: "归档会随每天的摘要生成逐日补齐，明天再来看看。",
	digest:
		"每天，被最多来源引用的新闻会被浓缩成十条带编号引用的摘要：一分钟看完今天发生了什么，每一条都能回溯到原始报道。页面顶部的摘要在一天内持续更新，往日的摘要保存在下面的归档里。",
	howTo:
		"用视图切换在推荐流、来源卡片和事件流之间切换。给来源点星即可关注，组成自己的页面；不看的来源可以隐藏；卡片可以拖成你习惯的顺序。标题会翻译成八种语言，在哪里读都顺手。",
	moreTopics: "更多板块",
	rss: "RSS 订阅",
	sources: (count) => `本页聚合 ${count} 个来源的最新头条，每五分钟刷新：`,
	sourcesTail: "每个来源都有自己的页面，列出它最近的条目。",
};

const ZH_HANT: Strings = {
	about: "關於本頁",
	agents: "給 Agent 和訂閱器",
	agentsBody:
		"同一份摘要也提供 JSON、RSS 和 MCP 三種形式，Agent 或 RSS 閱讀器可以直接訂閱這個板塊，不必抓網頁。",
	agentsLink: "接入 Agent",
	archive: "每日摘要歸檔",
	archiveEmpty: "歸檔會隨每天的摘要產生逐日補齊，明天再來看看。",
	digest:
		"每天，被最多來源引用的新聞會被濃縮成十條帶編號引用的摘要：一分鐘看完今天發生了什麼，每一條都能回溯到原始報導。頁面頂部的摘要在一天內持續更新，往日的摘要保存在下面的歸檔裡。",
	howTo:
		"用檢視切換在推薦流、來源卡片和事件流之間切換。給來源點星即可關注，組成自己的頁面；不看的來源可以隱藏；卡片可以拖成你習慣的順序。標題會翻譯成八種語言，在哪裡讀都順手。",
	moreTopics: "更多板塊",
	rss: "RSS 訂閱",
	sources: (count) => `本頁聚合 ${count} 個來源的最新頭條，每五分鐘更新：`,
	sourcesTail: "每個來源都有自己的頁面，列出它最近的條目。",
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

const SECTION_TITLE_CLASS =
	"mt-5 mb-1.5 font-semibold text-[12px] text-[var(--text-primary)]";
const BODY_CLASS = "text-[12px] text-[var(--text-secondary)] leading-relaxed";
const LINK_CLASS = "text-[var(--accent-blue)] hover:underline";

function Section({ children, title }: { children: ReactNode; title: string }) {
	return (
		<>
			<h3 className={SECTION_TITLE_CLASS}>{title}</h3>
			{children}
		</>
	);
}

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
			className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] px-4 py-6 sm:px-6"
		>
			<div className="mx-auto max-w-3xl">
				<h2
					className="font-semibold text-[13px] text-[var(--text-primary)]"
					id="topic-about-heading"
				>
					{strings.about} · {label}
				</h2>
				{page.description ? (
					<p className={`mt-1.5 ${BODY_CLASS}`}>{page.description}</p>
				) : null}
				<p className={`mt-3 ${BODY_CLASS}`}>
					{strings.sources(sources.length)}{" "}
					{sources.map((source, index) => (
						<span key={source.sourceId}>
							<Link
								className={LINK_CLASS}
								params={{ id: source.sourceId, locale: localeParam }}
								to="/{-$locale}/sources/$id"
							>
								{source.title}
							</Link>
							{index < sources.length - 1 ? ", " : "."}
						</span>
					))}{" "}
					{strings.sourcesTail}
				</p>
				<p className={`mt-3 ${BODY_CLASS}`}>{strings.digest}</p>
				<p className={`mt-3 ${BODY_CLASS}`}>{strings.howTo}</p>

				<Section title={strings.archive}>
					{archiveDays.length > 0 ? (
						<ul className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
							{archiveDays.map((day) => (
								<li key={day}>
									<Link
										className={`${LINK_CLASS} tabular-nums`}
										params={{ day, locale: localeParam, topic: topicId }}
										to="/{-$locale}/trends/$topic/$day"
									>
										{day}
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className={BODY_CLASS}>{strings.archiveEmpty}</p>
					)}
				</Section>

				<Section title={strings.moreTopics}>
					<ul className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
						{TOPIC_IDS.filter((id) => id !== topicId).map((id) => (
							<li key={id}>
								<Link
									className={LINK_CLASS}
									params={{ locale: localeParam, topic: id }}
									to="/{-$locale}/trends/$topic"
								>
									{topicLabel(id, locale)}
								</Link>
							</li>
						))}
					</ul>
				</Section>

				<Section title={strings.agents}>
					<p className={BODY_CLASS}>
						{strings.agentsBody}{" "}
						<Link
							className={LINK_CLASS}
							params={{ locale: localeParam }}
							to="/{-$locale}/agents"
						>
							{strings.agentsLink}
						</Link>
						{" · "}
						<a
							className={LINK_CLASS}
							href={`${env.VITE_SERVER_URL}/api/trends/${encodeURIComponent(topicId)}/feed.xml`}
						>
							{strings.rss}
						</a>
					</p>
				</Section>
			</div>
		</section>
	);
}
