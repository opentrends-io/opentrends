import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import type { ArchivedDigestEntry } from "@/components/trends/types";

import type { LandingStrings } from "./landing-copy";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// Agents get the same brief as people. The terminal shows an MCP client
// reading today's real brief; the list names every way in.

const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";
const TERMINAL_LINES = 4;

function Terminal({
	lines,
	strings,
}: {
	lines: ArchivedDigestEntry[];
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
					{strings.agentsPrompt}
				</p>
				<p className="text-[var(--text-secondary)]">
					<span className="text-[var(--accent-orange)]">●</span> get_digest(
					<span className="text-[var(--text-primary)]">topic</span>: "featured",{" "}
					<span className="text-[var(--text-primary)]">window</span>: "today")
					<span className="block pl-4 text-[var(--text-muted)]">
						{strings.agentsMeta}
					</span>
				</p>
				{lines.length > 0 ? (
					<ol className="space-y-1 pl-4">
						{lines.map((line) => (
							<li className="flex gap-2" key={line.n}>
								<span className="w-4 shrink-0 text-[var(--text-muted)]">
									{line.n}
								</span>
								<span className="min-w-0 truncate text-[var(--text-primary)]">
									{line.takeaway}
								</span>
								{line.citations?.[0] ? (
									<span className="shrink-0 text-[var(--accent-blue)]">
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

export function LandingAgents({
	lines,
	localeParam,
	strings,
}: {
	lines: ArchivedDigestEntry[];
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div
				className={`${CONTAINER_CLASS} grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16`}
			>
				<div>
					<SectionHeader
						body={strings.agentsBody}
						kicker={strings.agentsKicker}
						title={strings.agentsTitle}
					/>
					<dl className="mt-6 divide-y divide-[var(--border-subtle)] border-[var(--border-subtle)] border-y">
						{strings.agentsWays.map((way) => (
							<div className="py-3" key={way.title}>
								<dt className="font-medium text-[14px] text-[var(--text-primary)]">
									{way.title}
								</dt>
								<dd className="mt-0.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
									{way.body}
								</dd>
							</div>
						))}
					</dl>
					<Link
						className={`${TEXT_LINK_CLASS} mt-5`}
						params={{ locale: localeParam }}
						to="/{-$locale}/agents"
					>
						{strings.agentsGuide}
						<ArrowRight aria-hidden />
					</Link>
				</div>
				<Terminal lines={lines.slice(0, TERMINAL_LINES)} strings={strings} />
			</div>
		</section>
	);
}
