import { env } from "@opentrends/env/web";
import { Link, useMatch } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Rss } from "lucide-react";

import { GITHUB_REPOSITORY_URL } from "@/functions/get-github-repository-stats";
import {
	LOCALES,
	type Locale,
	localePathParam,
	useLocale,
	useT,
} from "@/lib/i18n";

import Logo from "./logo";
import { TopicArchiveLinks } from "./trends/topic-about";

// The site footer: brand and contact on the left, three short link columns,
// and a bottom bar with the copyright and the other language editions.

const TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

const SUPPORT_EMAIL = "support@opentrends.io";
const LAUNCH_YEAR = 2026;

// Short names for the language row; the full labels are for the switcher.
const LANGUAGE_NAMES: Record<Locale, string> = {
	en: "English",
	zh: "简体中文",
	"zh-Hant": "繁體中文",
	ru: "Русский",
	"fr-FR": "Français",
	"es-ES": "Español",
	"de-DE": "Deutsch",
	"pt-BR": "Português",
};

interface Strings {
	agents: string;
	api: string;
	archive: string;
	explore: string;
	guide: string;
	languages: string;
	llms: string;
	rights: string;
	rss: string;
	topics: string;
}

const EN: Strings = {
	agents: "For agents",
	api: "JSON API",
	archive: "Digest archive",
	guide: "Setup guide",
	explore: "Explore",
	languages: "Languages",
	llms: "llms.txt",
	rights: "All rights reserved.",
	rss: "RSS feed",
	topics: "Topics",
};

const ZH: Strings = {
	agents: "Agent 接入",
	api: "JSON 接口",
	archive: "摘要归档",
	guide: "接入指南",
	explore: "浏览",
	languages: "语言",
	llms: "llms.txt",
	rights: "保留所有权利。",
	rss: "RSS 订阅",
	topics: "板块",
};

const ZH_HANT: Strings = {
	agents: "Agent 接入",
	api: "JSON 介面",
	archive: "摘要歸檔",
	guide: "接入指南",
	explore: "瀏覽",
	languages: "語言",
	llms: "llms.txt",
	rights: "保留所有權利。",
	rss: "RSS 訂閱",
	topics: "板塊",
};

const STRINGS: Partial<Record<Locale, Strings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

const HEADING_CLASS =
	"mb-2.5 font-semibold text-[11px] text-[var(--text-primary)] uppercase tracking-wider";
const LINK_CLASS =
	"text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]";
const PILL_LINK_CLASS =
	"inline-flex h-7 items-center gap-1 rounded border border-[var(--border-default)] px-2.5 text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]";

export default function Footer() {
	const t = useT();
	const locale = useLocale();
	const localeParam = localePathParam(locale);
	const strings = STRINGS[locale] ?? EN;
	// On a topic page the brand column also carries that page's summary.
	const topicMatch = useMatch({
		from: "/{-$locale}/_views/trends/$topic",
		shouldThrow: false,
	});
	const aboutTopic =
		topicMatch && topicMatch.params.topic !== "mine"
			? topicMatch.params.topic
			: undefined;
	const exploreLinks = [
		{ to: "/{-$locale}/events", label: t("nav.events") },
		{ to: "/{-$locale}/sources", label: t("nav.sources") },
		{
			to: "/{-$locale}/trends/$topic/archive",
			params: { topic: "featured" },
			label: strings.archive,
		},
	] as const;
	const agentLinks = [
		{ href: undefined, to: "/{-$locale}/agents", label: strings.guide },
		{
			href: `${env.VITE_SERVER_URL}/api/trends/featured/feed.xml`,
			to: undefined,
			label: strings.rss,
		},
		{ href: "/llms.txt", to: undefined, label: strings.llms },
	] as const;

	return (
		<footer className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] text-[12px]">
			<div className="grid gap-8 px-6 py-7 sm:px-10 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
				<div className="min-w-0">
					<Link
						aria-label={t("nav.homeAria")}
						className="inline-flex h-5 items-center leading-none"
						params={{ locale: localeParam }}
						to="/{-$locale}"
					>
						<Logo />
					</Link>
					<p className="mt-2.5 max-w-xs text-[var(--text-secondary)] leading-relaxed">
						{t("footer.tagline")}
					</p>
					<div className="mt-3.5 flex flex-wrap items-center gap-2">
						<a
							className={PILL_LINK_CLASS}
							href={GITHUB_REPOSITORY_URL}
							rel="noopener"
							target="_blank"
						>
							{t("footer.github")}
							<ArrowUpRight className="size-3" />
						</a>
						<a className={PILL_LINK_CLASS} href={`mailto:${SUPPORT_EMAIL}`}>
							<Mail className="size-3" />
							{SUPPORT_EMAIL}
						</a>
						<a
							className={PILL_LINK_CLASS}
							href={`${env.VITE_SERVER_URL}/api/trends/featured/feed.xml`}
						>
							<Rss className="size-3" />
							RSS
						</a>
					</div>
					{aboutTopic ? (
						<TopicArchiveLinks locale={locale} topicId={aboutTopic} />
					) : null}
				</div>

				<nav aria-label={strings.topics}>
					<h3 className={HEADING_CLASS}>{strings.topics}</h3>
					<ul className="space-y-1.5">
						{TOPIC_IDS.map((topicId) => (
							<li key={topicId}>
								<Link
									className={LINK_CLASS}
									params={{ locale: localeParam, topic: topicId }}
									to="/{-$locale}/trends/$topic"
								>
									{t(`topic.${topicId}`)}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				<nav aria-label={strings.explore}>
					<h3 className={HEADING_CLASS}>{strings.explore}</h3>
					<ul className="space-y-1.5">
						{exploreLinks.map((link) => (
							<li key={link.label}>
								<Link
									className={LINK_CLASS}
									params={{
										locale: localeParam,
										...("params" in link ? link.params : {}),
									}}
									to={link.to}
								>
									{link.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				<nav aria-label={strings.agents}>
					<h3 className={HEADING_CLASS}>{strings.agents}</h3>
					<ul className="space-y-1.5">
						{agentLinks.map((link) => (
							<li key={link.label}>
								{link.to ? (
									<Link
										className={LINK_CLASS}
										params={{ locale: localeParam }}
										to={link.to}
									>
										{link.label}
									</Link>
								) : (
									<a className={LINK_CLASS} href={link.href}>
										{link.label}
									</a>
								)}
							</li>
						))}
					</ul>
				</nav>
			</div>

			<div className="border-[var(--border-subtle)] border-t">
				<div className="flex flex-col gap-2 px-6 py-3 text-[11px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-10">
					<p>
						© {LAUNCH_YEAR} OpenTrends. {strings.rights}
					</p>
					<nav
						aria-label={strings.languages}
						className="flex flex-wrap gap-x-3 gap-y-1"
					>
						{LOCALES.map((code) => (
							<Link
								aria-current={code === locale ? "true" : undefined}
								className={
									code === locale
										? "text-[var(--text-primary)]"
										: "transition-colors hover:text-[var(--text-primary)]"
								}
								hrefLang={code}
								key={code}
								params={{ locale: localePathParam(code) }}
								to="/{-$locale}"
							>
								{LANGUAGE_NAMES[code]}
							</Link>
						))}
					</nav>
				</div>
			</div>
		</footer>
	);
}
