import { cn } from "@opentrends/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, CircleCheck } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { eventExample } from "./landing-examples";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	PANEL_CLASS,
	SectionHeader,
	SourceBadge,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// Highlight three: five outlets' headlines on the same story, and the one
// event OpenTrends makes of them.

export function LandingEvents({
	locale,
	localeParam,
	strings,
}: {
	locale: Locale;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	const example = eventExample(locale);
	return (
		<section className="landing-glow border-[var(--stage-line)] border-t py-24 sm:py-32">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.eventsBody}
					kicker={strings.eventsKicker}
					title={
						<>
							<span className="block text-[var(--stage-muted)]">
								{strings.eventsTitle[0]}
							</span>
							<span className="block">{strings.eventsTitle[1]}</span>
						</>
					}
				/>
				<div className="mt-14 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-8">
					<ul className="space-y-2">
						{example.outlets.map((outlet) => (
							<li
								className="flex items-start gap-3 rounded-xl border border-[var(--stage-line)] bg-white/[0.02] px-4 py-3"
								key={outlet.source}
							>
								<SourceBadge badge={outlet.badge} className="mt-0.5" />
								<div className="min-w-0">
									<p className="text-[11px] text-[var(--stage-faint)]">
										{outlet.source}
									</p>
									<p className="mt-0.5 text-[14px] text-[var(--stage-muted)] leading-snug">
										{outlet.title}
									</p>
								</div>
							</li>
						))}
					</ul>
					<div
						aria-hidden
						className="flex justify-center text-[var(--stage-blue-soft)]"
					>
						<ArrowDown className="size-7 lg:hidden" />
						<ArrowRight className="hidden size-8 lg:block" />
					</div>
					<article
						className={cn(
							PANEL_CLASS,
							"border-[rgba(120,164,255,0.35)] p-6 shadow-[0_0_90px_-10px_rgba(21,93,255,0.45)] sm:p-7"
						)}
					>
						<h3 className="landing-display font-bold text-[24px] leading-tight sm:text-[28px]">
							{example.title}
						</h3>
						<p className="mt-3 text-[14px] text-[var(--stage-muted)] leading-relaxed">
							{example.summary}
						</p>
						<span className="mt-5 inline-flex h-7 items-center gap-1.5 rounded-md border border-[rgba(120,164,255,0.5)] bg-[rgba(120,164,255,0.1)] px-2 font-semibold text-[12px] text-[var(--stage-blue-soft)]">
							<CircleCheck aria-hidden className="size-3.5" />
							{strings.highSignal}
						</span>
						<div className="mt-4 flex flex-wrap items-center gap-2.5 text-[12px] text-[var(--stage-faint)]">
							<TopicTag label={t("topic.ai")} topic="ai" />
							<span className="flex -space-x-1.5">
								{example.outlets.map((outlet) => (
									<SourceBadge
										badge={outlet.badge}
										className="ring-2 ring-[var(--stage-panel)]"
										key={outlet.source}
									/>
								))}
							</span>
							<span className="font-semibold text-[var(--stage-muted)]">
								{strings.eventsSources(example.outlets.length)}
							</span>
						</div>
						<p className="mt-5 border-[var(--stage-line)] border-t pt-4 text-[12px] text-[var(--stage-faint)]">
							{example.outlets.map((outlet) => outlet.source).join(" · ")}
						</p>
					</article>
				</div>
				<div className="mt-10 flex flex-wrap items-center justify-between gap-4">
					<p className="landing-mono text-[10px] text-[var(--stage-faint)]">
						{strings.eventsExample}
					</p>
					<Link
						className={TEXT_LINK_CLASS}
						params={{ locale: localeParam }}
						to="/{-$locale}/events"
					>
						{strings.eventsMore}
						<ArrowRight aria-hidden />
					</Link>
				</div>
			</div>
		</section>
	);
}
