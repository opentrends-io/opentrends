import { cn } from "@opentrends/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Code } from "lucide-react";

import type { ArchivedDigestEntry } from "@/components/trends/types";
import { GITHUB_REPOSITORY_URL } from "@/functions/get-github-repository-stats";
import { useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { LANDING_TOPIC_IDS, type LandingData } from "./landing-model";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	PANEL_CLASS,
	PRIMARY_BUTTON_CLASS,
	SECONDARY_BUTTON_CLASS,
	SectionHeader,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// The film's last beats: agents reading the same brief over MCP, the
// topics, the source code, and the line to leave on.

const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";
const TERMINAL_LINES = 4;

function Terminal({
	digest,
	strings,
}: {
	digest: ArchivedDigestEntry[] | null;
	strings: LandingStrings;
}) {
	const lines = (digest ?? []).slice(0, TERMINAL_LINES);
	return (
		<div
			className={cn(
				PANEL_CLASS,
				"overflow-hidden bg-[var(--stage-ink)] font-mono text-[12px] leading-relaxed"
			)}
		>
			<div className="flex h-9 items-center gap-1.5 border-[var(--stage-line)] border-b px-4">
				<span className="size-2.5 rounded-full bg-white/15" />
				<span className="size-2.5 rounded-full bg-white/15" />
				<span className="size-2.5 rounded-full bg-white/15" />
			</div>
			<div className="space-y-3 p-4 sm:p-5">
				<p className="text-[var(--stage-faint)] [overflow-wrap:anywhere]">
					<span className="text-[var(--stage-green)]">$</span> {MCP_COMMAND}
				</p>
				<p className="text-[var(--stage-text)]">
					<span className="text-[var(--stage-blue-soft)]">›</span>{" "}
					{strings.agentsPrompt}
				</p>
				<p className="text-[var(--stage-muted)]">
					<span className="text-[var(--stage-orange)]">●</span> get_digest(
					<span className="text-[var(--stage-ice)]">topic</span>: "featured",{" "}
					<span className="text-[var(--stage-ice)]">window</span>: "today")
					<span className="block pl-4 text-[var(--stage-faint)]">
						{strings.agentsMeta}
					</span>
				</p>
				{lines.length > 0 ? (
					<ol className="space-y-1 pl-4">
						{lines.map((line) => (
							<li className="flex gap-2" key={line.n}>
								<span className="w-4 shrink-0 text-[var(--stage-faint)]">
									{line.n}
								</span>
								<span className="min-w-0 truncate text-[var(--stage-text)]">
									{line.takeaway}
								</span>
								{line.citations?.[0] ? (
									<span className="shrink-0 text-[var(--stage-blue-soft)]">
										[{line.citations[0].n}]
									</span>
								) : null}
							</li>
						))}
					</ol>
				) : null}
			</div>
		</div>
	);
}

function Agents({
	digest,
	localeParam,
	strings,
}: {
	digest: ArchivedDigestEntry[] | null;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<section className="border-[var(--stage-line)] border-t py-24 sm:py-32">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16`}
			>
				<div>
					<SectionHeader
						body={strings.agentsBody}
						kicker={strings.agentsKicker}
						title={strings.agentsTitle}
					/>
					<Link
						className={cn(TEXT_LINK_CLASS, "mt-6")}
						params={{ locale: localeParam }}
						to="/{-$locale}/agents"
					>
						{strings.agentsGuide}
						<ArrowRight aria-hidden />
					</Link>
				</div>
				<Terminal digest={digest} strings={strings} />
			</div>
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
		<nav aria-label={strings.topicsTitle}>
			<h2 className="landing-mono text-[11px] text-[var(--stage-blue-soft)]">
				{strings.topicsTitle}
			</h2>
			<ul className="mt-5 flex flex-wrap gap-2">
				{LANDING_TOPIC_IDS.map((id) => {
					const count = counts[id];
					return (
						<li key={id}>
							<Link
								className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-[var(--stage-line)] bg-white/[0.03] px-4 text-[14px] text-[var(--stage-text)] outline-none transition-colors hover:border-[var(--stage-line-strong)] hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-[var(--stage-blue-soft)]"
								params={{ locale: localeParam, topic: id }}
								to="/{-$locale}/trends/$topic"
							>
								<span className="font-medium">{t(`topic.${id}`)}</span>
								{count ? (
									<span className="text-[12px] text-[var(--stage-faint)] tabular-nums">
										{strings.topicSources(count)}
									</span>
								) : null}
								<ArrowRight
									aria-hidden
									className="size-3.5 text-[var(--stage-faint)] transition-transform group-hover:translate-x-0.5"
								/>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

function OpenSource({ strings }: { strings: LandingStrings }) {
	return (
		<div className={cn(PANEL_CLASS, "flex flex-col gap-5 p-6 sm:p-7")}>
			<span className="inline-flex size-10 items-center justify-center rounded-xl bg-[rgba(120,164,255,0.14)] text-[var(--stage-blue-soft)]">
				<Code aria-hidden className="size-5" />
			</span>
			<div>
				<h2 className="landing-display font-bold text-[26px] leading-tight">
					{strings.openSourceTitle}
				</h2>
				<p className="mt-2 text-[14px] text-[var(--stage-muted)] leading-relaxed">
					{strings.openSourceBody}
				</p>
			</div>
			<a
				className={cn(SECONDARY_BUTTON_CLASS, "self-start")}
				href={GITHUB_REPOSITORY_URL}
				rel="noopener"
				target="_blank"
			>
				GitHub
				<ArrowUpRight aria-hidden />
			</a>
		</div>
	);
}

export function LandingFinale({
	data,
	localeParam,
	strings,
}: {
	data: LandingData;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<>
			<Agents
				digest={data.digest}
				localeParam={localeParam}
				strings={strings}
			/>
			<section className="border-[var(--stage-line)] border-t py-24 sm:py-28">
				<div
					className={`${CONTAINER_CLASS} grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center`}
				>
					<Topics
						counts={data.topicSourceCounts}
						localeParam={localeParam}
						strings={strings}
					/>
					<OpenSource strings={strings} />
				</div>
			</section>
			<section className="landing-glow relative overflow-hidden border-[var(--stage-line)] border-t">
				<div
					className={`${CONTAINER_CLASS} flex flex-col items-center py-28 text-center sm:py-36`}
				>
					<img
						alt=""
						className="size-12 drop-shadow-[0_0_24px_rgba(21,93,255,0.85)]"
						height={48}
						src="/logo-mark.svg"
						width={48}
					/>
					<p className="landing-display mt-8 text-balance font-extrabold text-[40px] leading-[1.05] sm:text-[60px]">
						{strings.finalTagline}
					</p>
					<Link
						className={cn(PRIMARY_BUTTON_CLASS, "mt-10")}
						params={{ locale: localeParam, topic: "featured" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.ctaFeed}
						<ArrowRight aria-hidden />
					</Link>
					<p className="landing-mono mt-8 text-[10px] text-[var(--stage-faint)]">
						opentrends.io · MIT License
					</p>
				</div>
			</section>
		</>
	);
}
