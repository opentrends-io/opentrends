import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import {
	briefDemo,
	type FollowSourceExample,
	followExample,
} from "./landing-examples";
import {
	AppWindow,
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SectionHeader,
	SourceLogo,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// Make the radar yours: follow and order sources, read the day's brief,
// and name the same sources to your own agent. Fixed examples dated
// 29 September 2026, so the section reads the same whatever the API is
// doing.

const EXAMPLE_DATE = "2026-09-29";
const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";
// The topic the three followed sources live in; get_source needs both.
const AGENT_TOPIC = "ai";

function SourceCard({ source }: { source: FollowSourceExample }) {
	return (
		<div className="min-w-0 border-[var(--border-default)] border-r last:border-r-0 max-md:border-r-0 max-md:border-b max-md:last:border-b-0">
			<div className="flex items-center gap-2 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-3 py-2 text-[12px]">
				<span className="inline-flex size-5 items-center justify-center border border-[var(--border-default)] bg-white">
					<SourceLogo
						className="size-3.5"
						size={14}
						source={{
							homeUrl: source.homeUrl,
							id: source.name,
							kind: "official",
							name: source.name,
							topics: [],
						}}
					/>
				</span>
				<span className="truncate font-semibold text-[var(--text-primary)]">
					{source.name}
				</span>
			</div>
			<ol className="divide-y divide-[var(--border-subtle)]">
				{source.items.map((item, index) => (
					<li className="flex gap-2.5 px-3 py-2.5" key={item.title}>
						<span className="w-4 shrink-0 font-mono text-[10px] text-[var(--text-muted)] leading-[1.6]">
							{String(index + 1).padStart(2, "0")}
						</span>
						<p className="min-w-0 text-[12px] text-[var(--text-primary)] leading-snug">
							{item.title}
						</p>
					</li>
				))}
			</ol>
		</div>
	);
}

function Step({
	body,
	index,
	title,
}: {
	body: string;
	index: number;
	title: string;
}) {
	return (
		<div className="max-w-md">
			<p className="font-mono text-[11px] text-[var(--accent-blue)]">
				{String(index).padStart(2, "0")}
			</p>
			<h3 className="mt-1 font-semibold text-[18px] text-[var(--text-heading)] leading-tight">
				{title}
			</h3>
			<p className="mt-2 text-[14px] text-[var(--text-secondary)] leading-relaxed">
				{body}
			</p>
		</div>
	);
}

function ExampleNote({ strings }: { strings: LandingStrings }) {
	return (
		<p className="mt-2 text-right text-[11px] text-[var(--text-muted)]">
			{strings.eventsExampleNote(EXAMPLE_DATE)}
		</p>
	);
}

// The agent is told the source names and calls get_source for each; it
// cannot see the list kept in the browser.
function AgentTerminal({
	sources,
	strings,
}: {
	sources: readonly FollowSourceExample[];
	strings: LandingStrings;
}) {
	return (
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
					{strings.agentsSourcePrompt}
				</p>
				<div className="space-y-0.5 text-[var(--text-secondary)]">
					{sources.map((source) => (
						<p className="[overflow-wrap:anywhere]" key={source.id}>
							<span className="text-[var(--accent-orange)]">●</span> get_source(
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
	);
}

export function LandingCustomize({
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
	const t = useT();
	const follow = followExample(locale);
	const brief = briefDemo(locale);
	return (
		<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.customizeBody(sourceCount)}
					kicker={strings.customizeKicker}
					title={strings.customizeTitle}
				/>

				<div className="mt-12 grid items-center gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
					<Step
						body={strings.customizeFollow.body}
						index={1}
						title={strings.customizeFollow.title}
					/>
					<div>
						<AppWindow>
							<div className="flex items-center gap-2 border-[var(--border-default)] border-b px-4 py-2 text-[11px] text-[var(--text-muted)]">
								<span className="font-semibold text-[var(--text-primary)]">
									{strings.followBriefLabel}
								</span>
								<span>·</span>
								<span>{strings.followDemoSources}</span>
							</div>
							<div className="grid md:grid-cols-3">
								{follow.sources.map((source) => (
									<SourceCard key={source.name} source={source} />
								))}
							</div>
						</AppWindow>
						<ExampleNote strings={strings} />
					</div>
				</div>

				<div className="mt-16 grid items-center gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
					<Step
						body={strings.customizeBrief.body}
						index={2}
						title={strings.customizeBrief.title}
					/>
					<div>
						<AppWindow>
							<div className="flex items-center justify-between gap-3 border-[var(--border-default)] border-b px-4 py-2.5 text-[12px]">
								<span className="font-semibold text-[var(--text-primary)]">
									{strings.briefDemoLabel}
								</span>
								<span className="text-[11px] text-[var(--text-muted)]">
									{strings.briefCited}
								</span>
							</div>
							<ol className="divide-y divide-[var(--border-subtle)]">
								{brief.map((line) => (
									<li className="flex gap-3 px-4 py-2.5" key={line.n}>
										<span className="w-4 shrink-0 text-right text-[12px] text-[var(--text-muted)] tabular-nums leading-[1.5]">
											{line.n}
										</span>
										<p className="min-w-0 flex-1 text-[13px] leading-[1.5]">
											<span className="mr-1.5 inline-flex translate-y-[-1px] align-middle">
												<TopicTag
													label={t(`topic.${line.topic}`)}
													topic={line.topic}
												/>
											</span>
											<span className="font-semibold text-[var(--text-primary)]">
												{line.takeaway}
											</span>
											<span className="text-[var(--text-secondary)]">
												{" "}
												— {line.reason}
											</span>
										</p>
									</li>
								))}
							</ol>
						</AppWindow>
						<ExampleNote strings={strings} />
					</div>
				</div>

				<div className="mt-16 grid items-center gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
					<div>
						<Step
							body={strings.customizeAgent.body}
							index={3}
							title={strings.customizeAgent.title}
						/>
						<Link
							className={`${TEXT_LINK_CLASS} mt-4`}
							params={{ locale: localeParam }}
							to="/{-$locale}/agents"
						>
							{strings.agentsGuide}
							<ArrowRight aria-hidden />
						</Link>
					</div>
					<div>
						<AgentTerminal sources={follow.sources} strings={strings} />
						<ExampleNote strings={strings} />
					</div>
				</div>

				<dl className="mt-12 grid gap-x-8 gap-y-5 border-[var(--border-default)] border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
					{strings.agentsWays.map((way) => (
						<div key={way.title}>
							<dt className="font-medium text-[13px] text-[var(--text-primary)]">
								{way.title}
							</dt>
							<dd className="mt-0.5 text-[12px] text-[var(--text-secondary)] leading-relaxed">
								{way.body}
							</dd>
						</div>
					))}
				</dl>
				<div className="mt-8">
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "mine" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.followCta}
						<ArrowRight aria-hidden />
					</Link>
				</div>
			</div>
		</section>
	);
}
