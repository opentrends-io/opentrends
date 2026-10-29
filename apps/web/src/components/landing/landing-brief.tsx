import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { briefDemo, followExample } from "./landing-examples";
import {
	type ContentTopicId,
	LANDING_TOPIC_IDS,
	type LandingDigest,
} from "./landing-model";
import {
	AppWindow,
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SectionHeader,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// The day's brief as the page serves it, and the same data as an agent
// pulls it. Today's featured brief when the API has one; otherwise the
// fixed example, labelled as such.

const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";
const AGENT_TOPIC = "ai";
const BRIEF_LINES = 10;

interface BriefLine {
	citations: { n: number; url?: string }[];
	n: number;
	reason?: string;
	takeaway: string;
	topic: ContentTopicId | null;
}

function contentTopic(topic: string | undefined): ContentTopicId | null {
	return topic &&
		(LANDING_TOPIC_IDS as readonly string[]).includes(topic) &&
		topic !== "featured"
		? (topic as ContentTopicId)
		: null;
}

function liveLines(digest: LandingDigest): BriefLine[] {
	return digest.entries.slice(0, BRIEF_LINES).map((entry) => ({
		citations: (entry.citations ?? []).map((citation) => ({
			n: citation.n,
			url: citation.url,
		})),
		n: entry.n,
		reason: entry.reason,
		takeaway: entry.takeaway,
		topic: contentTopic(entry.citations?.[0]?.topic),
	}));
}

function exampleLines(locale: Locale): BriefLine[] {
	return briefDemo(locale).map((line) => ({
		citations: line.sources.map((_, index) => ({ n: index + 1 })),
		n: line.n,
		reason: line.reason,
		takeaway: line.takeaway,
		topic: line.topic,
	}));
}

// A fixed time zone on both sides of hydration: Beijing for the Chinese
// pages, UTC elsewhere.
function briefTime(generatedAt: number, locale: Locale): string {
	const chinese = locale === "zh" || locale === "zh-Hant";
	const time = new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		hour12: false,
		minute: "2-digit",
		timeZone: chinese ? "Asia/Shanghai" : "UTC",
	}).format(new Date(generatedAt));
	return chinese ? time : `${time} UTC`;
}

function Citation({ citation }: { citation: BriefLine["citations"][number] }) {
	const label = `[${citation.n}]`;
	if (!citation.url) {
		return <span className="text-[var(--accent-blue)]">{label}</span>;
	}
	return (
		<a
			className="text-[var(--accent-blue)] hover:underline"
			href={citation.url}
			rel="noopener"
			target="_blank"
		>
			{label}
		</a>
	);
}

// What the window's header says: when the brief was written, that it is
// live without a time, or that it is the example.
function briefLabel(
	digest: LandingDigest | null,
	locale: Locale,
	strings: LandingStrings
): string {
	if (!digest) {
		return strings.briefExample;
	}
	if (digest.generatedAt === undefined) {
		return strings.eventsLive;
	}
	return strings.briefLive(briefTime(digest.generatedAt, locale));
}

function Brief({
	digest,
	locale,
	strings,
}: {
	digest: LandingDigest | null;
	locale: Locale;
	strings: LandingStrings;
}) {
	const t = useT();
	const lines = digest ? liveLines(digest) : exampleLines(locale);
	const label = briefLabel(digest, locale, strings);
	return (
		<AppWindow>
			<div className="flex items-center justify-between gap-3 border-[var(--border-default)] border-b px-4 py-2.5 text-[12px]">
				<span
					className={
						digest
							? "font-semibold text-[var(--accent-blue)]"
							: "font-semibold text-[var(--text-muted)]"
					}
				>
					{label}
				</span>
				<span className="text-[11px] text-[var(--text-muted)]">
					{strings.briefCited}
				</span>
			</div>
			<ol className="divide-y divide-[var(--border-subtle)]">
				{lines.map((line) => (
					<li className="flex gap-3 px-4 py-2.5" key={line.n}>
						<span className="w-4 shrink-0 text-right text-[12px] text-[var(--text-muted)] tabular-nums leading-[1.5]">
							{line.n}
						</span>
						<p className="min-w-0 flex-1 text-[13px] leading-[1.5]">
							{line.topic ? (
								<span className="mr-1.5 inline-flex translate-y-[-1px] align-middle">
									<TopicTag
										label={t(`topic.${line.topic}`)}
										topic={line.topic}
									/>
								</span>
							) : null}
							<span className="font-semibold text-[var(--text-primary)]">
								{line.takeaway}
							</span>
							{line.reason ? (
								<span className="text-[var(--text-secondary)]">
									{" "}
									— {line.reason}
								</span>
							) : null}
							{line.citations.length > 0 ? (
								<span className="ml-1.5 inline-flex gap-1 text-[11px]">
									{line.citations.map((citation) => (
										<Citation citation={citation} key={citation.n} />
									))}
								</span>
							) : null}
						</p>
					</li>
				))}
			</ol>
		</AppWindow>
	);
}

// The agent is told the source names, looks their ids up and pulls each;
// it cannot see the list kept in the browser.
function AgentTerminal({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const sources = followExample(locale).sources;
	return (
		<div>
			<div
				className={`${CARD_CLASS} overflow-hidden font-mono text-[12px] leading-relaxed`}
			>
				<div className="flex h-8 items-center gap-1.5 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-3">
					<span className="size-2.5 rounded-full bg-[#dcdcd8]" />
					<span className="size-2.5 rounded-full bg-[#dcdcd8]" />
					<span className="size-2.5 rounded-full bg-[#dcdcd8]" />
				</div>
				<div className="space-y-3 p-4 sm:p-5">
					<p className="text-[var(--text-muted)] [overflow-wrap:anywhere]">
						<span className="text-[var(--accent-green)]">$</span> {MCP_COMMAND}
					</p>
					<p className="text-[var(--text-primary)]">
						<span className="text-[var(--accent-blue)]">›</span>{" "}
						{strings.agentPrompt}
					</p>
					<p className="text-[var(--text-secondary)]">
						<span className="text-[var(--accent-orange)]">●</span> get_topic(
						<span className="text-[var(--text-primary)]">topic</span>: "
						{AGENT_TOPIC}")
						<span className="block pl-4 text-[var(--text-muted)]">
							{sources.map((source) => source.id).join(" · ")}
						</span>
					</p>
					<div className="space-y-0.5 text-[var(--text-secondary)]">
						{sources.map((source) => (
							<p className="[overflow-wrap:anywhere]" key={source.id}>
								<span className="text-[var(--accent-orange)]">●</span>{" "}
								get_source(
								<span className="text-[var(--text-primary)]">topic</span>: "
								{AGENT_TOPIC}",{" "}
								<span className="text-[var(--text-primary)]">sourceId</span>: "
								{source.id}")
							</p>
						))}
					</div>
					<ul className="space-y-1 pl-4">
						{sources.map((source) => (
							<li className="flex gap-2" key={source.id}>
								<span className="shrink-0 text-[var(--text-muted)]">
									{source.name}
								</span>
								<span className="min-w-0 truncate text-[var(--text-primary)]">
									{source.items[0]?.title}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
			<p className="mt-2 text-right text-[11px] text-[var(--text-muted)]">
				{strings.briefExample}
			</p>
		</div>
	);
}

export function LandingBrief({
	digest,
	locale,
	localeParam,
	strings,
}: {
	digest: LandingDigest | null;
	locale: Locale;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<div className="flex flex-wrap items-end justify-between gap-6">
					<SectionHeader
						body={strings.briefBody}
						kicker={strings.briefKicker}
						title={strings.briefTitle}
					/>
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "mine" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.followCta}
						<ArrowRight aria-hidden />
					</Link>
				</div>
				<div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
					<Brief digest={digest} locale={locale} strings={strings} />
					<div>
						<h3 className="font-semibold text-[18px] text-[var(--text-heading)] leading-tight">
							{strings.agentTitle}
						</h3>
						<p className="mt-2 text-[14px] text-[var(--text-secondary)] leading-relaxed">
							{strings.agentBody}
						</p>
						<p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
							<span className="text-[var(--text-muted)]">
								{strings.agentWays}
							</span>
							<Link
								className={TEXT_LINK_CLASS}
								params={{ locale: localeParam }}
								to="/{-$locale}/agents"
							>
								{strings.agentGuide}
								<ArrowRight aria-hidden />
							</Link>
						</p>
						<div className="mt-5">
							<AgentTerminal locale={locale} strings={strings} />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
