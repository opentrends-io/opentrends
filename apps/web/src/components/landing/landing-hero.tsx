import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Check, Languages, UserRound } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";
import { useIsReturningReader } from "@/lib/returning-reader";

import type { LandingStrings } from "./landing-copy";
import { languageFeed } from "./landing-examples";
import {
	AppWindow,
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SECONDARY_BUTTON_CLASS,
	SourceLogo,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// The first screen: a radar shared by people and AI. One door for each,
// and underneath, the same three items as a person reads them and as an
// agent receives them.

const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";
const HERO_ITEMS = 3;
const EXAMPLE_DATE = "2026-09-29";

function ContinueReading({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const returning = useIsReturningReader();
	if (!returning) {
		return null;
	}
	return (
		<Link
			className={TEXT_LINK_CLASS}
			params={{ locale: localeParam, topic: "featured" }}
			to="/{-$locale}/trends/$topic"
		>
			{strings.continueReading}
			<ArrowRight aria-hidden />
		</Link>
	);
}

function PeoplePanel({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const t = useT();
	const items = languageFeed(locale).slice(0, HERO_ITEMS);
	return (
		<AppWindow>
			<div className="flex items-center gap-2 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-4 py-2 text-[12px]">
				<UserRound aria-hidden className="size-3.5 text-[var(--accent-blue)]" />
				<span className="font-semibold text-[var(--text-primary)]">
					{strings.heroForPeople}
				</span>
				<span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
					<Languages aria-hidden className="size-3.5" />
					{strings.heroPeopleNote}
				</span>
			</div>
			<ol className="divide-y divide-[var(--border-subtle)]">
				{items.map((item) => (
					<li className="flex gap-3 px-4 py-3" key={item.source}>
						<span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border border-[var(--border-default)] bg-white">
							<SourceLogo
								className="size-3.5"
								eager
								size={14}
								source={{
									homeUrl: item.homeUrl,
									id: item.source,
									kind: item.kind,
									name: item.source,
									topics: [],
								}}
							/>
						</span>
						<div className="min-w-0">
							<p className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
								{item.source}
								<TopicTag label={t(`topic.${item.topic}`)} topic={item.topic} />
							</p>
							<p className="mt-0.5 font-medium text-[13px] text-[var(--text-primary)] leading-snug">
								{item.translated}
							</p>
							{item.original === item.translated ? null : (
								<p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
									<span className="mr-1 font-medium">{item.originalLang}</span>
									{item.original}
								</p>
							)}
						</div>
					</li>
				))}
			</ol>
		</AppWindow>
	);
}

function AgentPanel({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const items = languageFeed(locale).slice(0, HERO_ITEMS);
	return (
		<div
			className={`${CARD_CLASS} flex h-full flex-col overflow-hidden font-mono text-[12px] leading-relaxed`}
		>
			<div className="flex items-center gap-2 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-4 py-2 font-sans text-[12px]">
				<Bot aria-hidden className="size-3.5 text-[var(--accent-blue)]" />
				<span className="font-semibold text-[var(--text-primary)]">
					{strings.heroForAgents}
				</span>
				<span className="ml-auto text-[11px] text-[var(--text-muted)]">
					{strings.heroAgentNote}
				</span>
			</div>
			<div className="space-y-2.5 p-4">
				<p className="text-[var(--text-muted)] [overflow-wrap:anywhere]">
					<span className="text-[var(--accent-green)]">$</span> {MCP_COMMAND}
				</p>
				<p className="text-[var(--text-primary)]">
					<span className="text-[var(--accent-blue)]">›</span>{" "}
					{strings.agentsPrompt}
				</p>
				<p className="text-[var(--text-secondary)]">
					<span className="text-[var(--accent-orange)]">●</span> get_digest(
					<span className="text-[var(--text-primary)]">topic</span>: "featured")
				</p>
				<ol className="space-y-1 pl-4">
					{items.map((item, index) => (
						<li className="flex gap-2" key={item.source}>
							<span className="w-3 shrink-0 text-[var(--text-muted)]">
								{index + 1}
							</span>
							<span className="min-w-0 truncate text-[var(--text-primary)]">
								{item.translated}
							</span>
							<span className="shrink-0 text-[var(--accent-blue)]">
								[{index + 1}]
							</span>
						</li>
					))}
				</ol>
			</div>
		</div>
	);
}

export function LandingHero({
	locale,
	localeParam,
	sourceCount,
	strings,
}: {
	locale: Locale;
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
}) {
	return (
		<section className="bg-[var(--surface-app)]">
			<div className={`${CONTAINER_CLASS} pt-16 pb-10 sm:pt-20`}>
				<p className="text-[12px] text-[var(--text-muted)]">
					{strings.eyebrow}
				</p>
				<h1 className="mt-4 max-w-3xl text-balance font-semibold text-[34px] text-[var(--text-heading)] leading-[1.12] tracking-tight sm:text-[46px]">
					{strings.heroTitle}
				</h1>
				<p className="mt-5 max-w-2xl text-[16px] text-[var(--text-secondary)] leading-relaxed sm:text-[18px]">
					{strings.heroBody(sourceCount)}
				</p>
				<ul className="mt-5 grid gap-2 text-[14px] text-[var(--text-primary)] sm:grid-cols-2">
					{strings.heroPoints.map((point) => (
						<li className="flex items-start gap-2" key={point}>
							<Check
								aria-hidden
								className="mt-[3px] size-3.5 shrink-0 text-[var(--accent-blue)]"
							/>
							{point}
						</li>
					))}
				</ul>
				<div className="mt-7 flex flex-wrap items-center gap-3">
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "featured" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.ctaFeed}
						<ArrowRight aria-hidden />
					</Link>
					<Link
						className={SECONDARY_BUTTON_CLASS}
						params={{ locale: localeParam }}
						to="/{-$locale}/agents"
					>
						<Bot aria-hidden />
						{strings.ctaAgent}
					</Link>
					<ContinueReading localeParam={localeParam} strings={strings} />
				</div>
			</div>
			<div className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)]">
				<div className={`${CONTAINER_CLASS} pt-10 sm:pt-14`}>
					<div className="grid gap-4 lg:grid-cols-2">
						<PeoplePanel locale={locale} strings={strings} />
						<AgentPanel locale={locale} strings={strings} />
					</div>
					<p className="mt-2 text-right text-[11px] text-[var(--text-muted)]">
						{strings.eventsExampleNote(EXAMPLE_DATE)}
					</p>
				</div>
				<p className="pt-6 pb-8 text-center text-[12px] text-[var(--text-muted)]">
					{strings.mechanism(sourceCount)}
				</p>
			</div>
		</section>
	);
}
