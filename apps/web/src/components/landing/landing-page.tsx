import { buttonVariants } from "@opentrends/ui/components/button";
import { cn } from "@opentrends/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowUpRight,
	Bot,
	Code,
	Languages,
	ListOrdered,
	Newspaper,
	Star,
} from "lucide-react";

import type { ArchivedDigestEntry } from "@/components/trends/types";
import { GITHUB_REPOSITORY_URL } from "@/functions/get-github-repository-stats";
import { LOCALES, type Locale, localePathParam, useT } from "@/lib/i18n";

import { type LandingStrings, landingStrings } from "./landing-copy";
import {
	citationHosts,
	LANDING_TOPIC_IDS,
	type LandingData,
} from "./landing-model";

// The page at `/` for first visits: what OpenTrends is, the first lines of
// today's featured brief as live proof, the topics, and the two other ways
// in (agents and the source code). Returning readers never see it; the
// route sends them to the feed.

const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";
const PILLAR_ICONS = [Newspaper, Languages, ListOrdered] as const;

const PRIMARY_BUTTON_CLASS = cn(
	buttonVariants({ size: "lg" }),
	"rounded px-4 text-[13px]"
);
const SECONDARY_BUTTON_CLASS = cn(
	buttonVariants({ size: "lg", variant: "outline" }),
	"rounded border-[var(--border-default)] bg-transparent px-4 text-[13px] text-[var(--text-primary)] hover:bg-[var(--state-hover-subtle)]"
);
const SECTION_CLASS = "border-[var(--border-default)] border-t py-12";
const SECTION_TITLE_CLASS =
	"font-semibold text-[20px] text-[var(--text-heading)] tracking-tight";
const CARD_CLASS =
	"rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)]";
const ICON_TILE_CLASS =
	"inline-flex size-8 items-center justify-center rounded-md bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]";

type LocaleParam = ReturnType<typeof localePathParam>;

function BriefLine({ line }: { line: ArchivedDigestEntry }) {
	const hosts = citationHosts(line);
	return (
		<li className="flex gap-3 px-4 py-3">
			<span className="w-4 shrink-0 pt-px text-right font-medium text-[12px] text-[var(--accent-blue)] tabular-nums">
				{line.n}
			</span>
			<div className="min-w-0">
				<p className="font-medium text-[13px] text-[var(--text-primary)] leading-snug">
					{line.takeaway}
				</p>
				{line.reason ? (
					<p className="mt-1 text-[12px] text-[var(--text-secondary)] leading-snug">
						{line.reason}
					</p>
				) : null}
				{hosts.length > 0 ? (
					<p className="mt-1.5 truncate text-[11px] text-[var(--text-muted)]">
						{hosts.join(" · ")}
					</p>
				) : null}
			</div>
		</li>
	);
}

function BriefCard({
	digest,
	localeParam,
	strings,
}: {
	digest: LandingData["digest"];
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	return (
		<section
			aria-labelledby="landing-brief-title"
			className={cn(CARD_CLASS, "shadow-[0_1px_2px_rgba(0,0,0,0.04)]")}
		>
			<header className="flex items-center justify-between gap-3 border-[var(--border-default)] border-b px-4 py-2.5">
				<h2
					className="flex items-center gap-2 font-semibold text-[13px] text-[var(--text-primary)]"
					id="landing-brief-title"
				>
					<span
						aria-hidden
						className="size-1.5 rounded-full bg-[var(--accent-green)]"
					/>
					{strings.briefTitle}
				</h2>
				<span className="text-[11px] text-[var(--text-muted)]">
					{t("topic.featured")}
				</span>
			</header>
			{digest ? (
				<ol className="divide-y divide-[var(--border-subtle)]">
					{digest.map((line) => (
						<BriefLine key={line.n} line={line} />
					))}
				</ol>
			) : (
				<p className="px-4 py-6 text-[13px] text-[var(--text-secondary)] leading-relaxed">
					{strings.briefEmpty}
				</p>
			)}
			<footer className="border-[var(--border-default)] border-t px-4 py-2.5">
				<Link
					className="inline-flex items-center gap-1 font-medium text-[12px] text-[var(--accent-blue)] hover:underline"
					params={{ locale: localeParam, topic: "featured" }}
					to="/{-$locale}/trends/$topic"
				>
					{strings.briefMore}
					<ArrowRight aria-hidden className="size-3.5" />
				</Link>
			</footer>
		</section>
	);
}

function Hero({
	data,
	localeParam,
	strings,
}: {
	data: LandingData;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const stats = [
		data.sourceCount ? strings.statSources(data.sourceCount) : null,
		strings.statTopics(LANDING_TOPIC_IDS.length),
		strings.statLanguages(LOCALES.length),
	].filter((stat): stat is string => stat !== null);
	return (
		<section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
			<div className="min-w-0">
				<p className="inline-flex min-h-6 items-center rounded-full border border-[var(--border-default)] px-2.5 text-[11px] text-[var(--text-secondary)]">
					{strings.eyebrow}
				</p>
				<h1 className="mt-4 text-balance font-semibold text-[32px] text-[var(--text-heading)] leading-[1.15] tracking-tight sm:text-[40px]">
					{strings.heroTitle}
				</h1>
				<p className="mt-4 max-w-xl text-[15px] text-[var(--text-secondary)] leading-relaxed">
					{strings.heroBody(data.sourceCount)}
				</p>
				<div className="mt-6 flex flex-wrap gap-2">
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "featured" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.ctaFeed}
						<ArrowRight aria-hidden />
					</Link>
					<a
						className={SECONDARY_BUTTON_CLASS}
						href={GITHUB_REPOSITORY_URL}
						rel="noopener"
						target="_blank"
					>
						<Star aria-hidden />
						{strings.ctaGithub}
					</a>
				</div>
				<ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[var(--text-secondary)]">
					{stats.map((stat) => (
						<li className="flex items-center gap-1.5" key={stat}>
							<span
								aria-hidden
								className="size-1 rounded-full bg-[var(--text-muted)]"
							/>
							{stat}
						</li>
					))}
				</ul>
			</div>
			<BriefCard
				digest={data.digest}
				localeParam={localeParam}
				strings={strings}
			/>
		</section>
	);
}

function Pillars({ strings }: { strings: LandingStrings }) {
	return (
		<section className={cn(SECTION_CLASS, "grid gap-8 sm:grid-cols-3")}>
			{strings.pillars.map((pillar, index) => {
				const Icon = PILLAR_ICONS[index] ?? Newspaper;
				return (
					<div className="min-w-0" key={pillar.title}>
						<span className={ICON_TILE_CLASS}>
							<Icon aria-hidden className="size-4" />
						</span>
						<h2 className="mt-3 font-semibold text-[15px] text-[var(--text-heading)]">
							{pillar.title}
						</h2>
						<p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
							{pillar.body}
						</p>
					</div>
				);
			})}
		</section>
	);
}

function Topics({
	counts,
	localeParam,
	strings,
}: {
	counts: LandingData["topicSourceCounts"];
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	return (
		<section className={SECTION_CLASS}>
			<h2 className={SECTION_TITLE_CLASS}>{strings.topicsTitle}</h2>
			<p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
				{strings.topicsBody}
			</p>
			<ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
				{LANDING_TOPIC_IDS.map((id) => {
					const count = counts[id];
					return (
						<li key={id}>
							<Link
								className="group flex h-full items-center justify-between gap-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--state-hover-subtle)]"
								params={{ locale: localeParam, topic: id }}
								to="/{-$locale}/trends/$topic"
							>
								<span className="min-w-0">
									<span className="block truncate font-medium text-[13px] text-[var(--text-primary)]">
										{t(`topic.${id}`)}
									</span>
									{count ? (
										<span className="block text-[11px] text-[var(--text-muted)]">
											{strings.topicSources(count)}
										</span>
									) : null}
								</span>
								<ArrowRight
									aria-hidden
									className="size-3.5 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
								/>
							</Link>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

function MoreWaysIn({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<section className={cn(SECTION_CLASS, "grid gap-4 pb-16 md:grid-cols-2")}>
			<div className={cn(CARD_CLASS, "flex min-w-0 flex-col p-5")}>
				<span className={ICON_TILE_CLASS}>
					<Bot aria-hidden className="size-4" />
				</span>
				<h2 className="mt-3 font-semibold text-[15px] text-[var(--text-heading)]">
					{strings.agentsTitle}
				</h2>
				<p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
					{strings.agentsBody}
				</p>
				<pre className="mt-4 whitespace-pre-wrap break-all rounded border border-[var(--border-subtle)] bg-[var(--surface-sidebar)] px-3 py-2 font-mono text-[11px] text-[var(--text-primary)]">
					<code>{MCP_COMMAND}</code>
				</pre>
				<Link
					className="mt-4 inline-flex items-center gap-1 self-start font-medium text-[12px] text-[var(--accent-blue)] hover:underline"
					params={{ locale: localeParam }}
					to="/{-$locale}/agents"
				>
					{strings.agentsGuide}
					<ArrowRight aria-hidden className="size-3.5" />
				</Link>
			</div>
			<div className={cn(CARD_CLASS, "flex min-w-0 flex-col p-5")}>
				<span className={ICON_TILE_CLASS}>
					<Code aria-hidden className="size-4" />
				</span>
				<h2 className="mt-3 font-semibold text-[15px] text-[var(--text-heading)]">
					{strings.openSourceTitle}
				</h2>
				<p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
					{strings.openSourceBody}
				</p>
				<div className="mt-auto pt-4">
					<a
						className={SECONDARY_BUTTON_CLASS}
						href={GITHUB_REPOSITORY_URL}
						rel="noopener"
						target="_blank"
					>
						GitHub
						<ArrowUpRight aria-hidden />
					</a>
				</div>
			</div>
		</section>
	);
}

export function LandingPage({
	data,
	locale,
}: {
	data: LandingData;
	locale: Locale;
}) {
	const strings = landingStrings(locale);
	const localeParam = localePathParam(locale);
	return (
		<div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
			<Hero data={data} localeParam={localeParam} strings={strings} />
			<Pillars strings={strings} />
			<Topics
				counts={data.topicSourceCounts}
				localeParam={localeParam}
				strings={strings}
			/>
			<MoreWaysIn localeParam={localeParam} strings={strings} />
		</div>
	);
}
