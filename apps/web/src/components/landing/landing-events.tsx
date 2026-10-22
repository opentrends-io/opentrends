import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, CircleCheck } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { eventExample } from "./landing-examples";
import type { WallSource } from "./landing-model";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	SourceMark,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// One story as five outlets reported it, and the one event OpenTrends
// makes of them. A fixed example rather than the live feed, so the
// section reads the same whatever the API is doing.

function asSource(outlet: {
	homeUrl: string;
	source: string;
	kind: WallSource["kind"];
}): WallSource {
	return {
		homeUrl: outlet.homeUrl,
		id: outlet.source,
		kind: outlet.kind,
		name: outlet.source,
		topics: [],
	};
}

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
		<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.eventsBody}
					kicker={strings.eventsKicker}
					title={strings.eventsTitle}
				/>
				<div className="mt-10 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
					<ul className="space-y-2">
						{example.outlets.map((outlet) => (
							<li
								className={`${CARD_CLASS} flex items-start gap-3 px-4 py-3`}
								key={outlet.source}
							>
								<SourceMark size="sm" source={asSource(outlet)} />
								<div className="min-w-0">
									<p className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
										{outlet.source}
										<span>{strings.kindLabels[outlet.kind]}</span>
									</p>
									<p className="mt-0.5 text-[13px] text-[var(--text-secondary)] leading-snug">
										{outlet.title}
									</p>
								</div>
							</li>
						))}
					</ul>
					<div
						aria-hidden
						className="flex flex-col items-center gap-1 text-[11px] text-[var(--text-muted)]"
					>
						<ArrowDown className="size-5 text-[var(--accent-blue)] lg:hidden" />
						<ArrowRight className="hidden size-6 text-[var(--accent-blue)] lg:block" />
						<span className="max-w-24 text-center">{strings.eventsMerged}</span>
					</div>
					<article
						className={`${CARD_CLASS} border-[var(--accent-blue)] p-5 shadow-[0_12px_32px_-12px_rgba(26,78,220,0.25)] sm:p-6`}
					>
						<h3 className="font-semibold text-[20px] text-[var(--text-heading)] leading-tight">
							{example.title}
						</h3>
						<p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
							{example.summary}
						</p>
						<span className="mt-4 inline-flex h-7 items-center gap-1.5 border border-[var(--accent-blue)] bg-[var(--accent-blue-bg)] px-2 font-medium text-[12px] text-[var(--accent-blue)]">
							<CircleCheck aria-hidden className="size-3.5" />
							{strings.eventsHighSignal}
						</span>
						<div className="mt-4 flex flex-wrap items-center gap-2.5 text-[12px] text-[var(--text-muted)]">
							<TopicTag label={t("topic.ai")} topic="ai" />
							<span className="flex -space-x-1">
								{example.outlets.map((outlet) => (
									<SourceMark
										key={outlet.source}
										size="sm"
										source={asSource(outlet)}
									/>
								))}
							</span>
							<span className="font-medium text-[var(--text-secondary)]">
								{strings.eventsReported(example.outlets.length)}
							</span>
						</div>
						<p className="mt-4 border-[var(--border-subtle)] border-t pt-3 text-[12px] text-[var(--text-muted)]">
							{example.outlets.map((outlet) => outlet.source).join(" · ")}
						</p>
					</article>
				</div>
				<div className="mt-8 flex flex-wrap items-center justify-between gap-4">
					<p className="text-[11px] text-[var(--text-muted)]">
						{strings.eventsExampleNote(example.date)}
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
