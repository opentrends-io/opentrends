import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";

import { trendEventDetailQueryOptions } from "../trends/trends-query";
import type { LandingStrings } from "./landing-copy";
import { eventExample } from "./landing-examples";
import {
	type ContentTopicId,
	eventOutlets,
	eventSpanHours,
	LANDING_TOPIC_IDS,
	type LandingEvent,
	type SourceKind,
	type WallSource,
} from "./landing-model";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	SourceMark,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// One story as several outlets reported it, and the one event made of
// them. Today's event from the live feed when several sites reported one;
// otherwise the fixed example, labelled as such. The feed names the
// outlets; their own headlines arrive from the event's detail after
// hydration, so the server render never waits for them.

interface Outlet {
	homeUrl: string;
	kind: SourceKind | null;
	name: string;
	original?: string;
	title: string;
}

// Each outlet's own headline, as the event detail reports it.
type Headlines = Map<string, { original?: string; title: string }>;

interface EventView {
	first: string;
	hours: number;
	live: boolean;
	original?: string;
	outlets: Outlet[];
	summary?: string;
	title: string;
	topic: ContentTopicId | null;
}

function asSource(outlet: Outlet): WallSource {
	return {
		homeUrl: outlet.homeUrl,
		id: outlet.name,
		kind: outlet.kind,
		name: outlet.name,
		topics: [],
	};
}

function contentTopic(topic: string): ContentTopicId | null {
	return (LANDING_TOPIC_IDS as readonly string[]).includes(topic) &&
		topic !== "featured"
		? (topic as ContentTopicId)
		: null;
}

function liveView(event: LandingEvent, headlines: Headlines): EventView {
	const outlets = eventOutlets(event).map((source) => ({
		homeUrl: source.homeUrl ?? "",
		original: headlines.get(source.sourceId)?.original,
		kind: source.kind ?? null,
		name: source.name ?? source.sourceId,
		title: headlines.get(source.sourceId)?.title ?? source.title,
	}));
	const primary = event.primarySource
		? event.sources.find(
				(source) => source.sourceId === event.primarySource?.sourceId
			)
		: undefined;
	return {
		first: primary?.name ?? outlets[0]?.name ?? "",
		hours: eventSpanHours(event),
		live: true,
		original:
			event.original?.title && event.original.title !== event.title
				? event.original.title
				: undefined,
		outlets,
		summary: event.summary,
		title: event.title,
		topic: contentTopic(event.topicId),
	};
}

function exampleView(locale: Locale): EventView {
	const example = eventExample(locale);
	return {
		first: example.outlets[0]?.source ?? "",
		hours: 2,
		live: false,
		outlets: example.outlets.map((outlet) => ({
			homeUrl: outlet.homeUrl,
			kind: outlet.kind,
			name: outlet.source,
			title: outlet.title,
		})),
		summary: example.summary,
		title: example.title,
		topic: "ai",
	};
}

const MAX_OUTLETS = 5;

export function LandingEvents({
	event,
	locale,
	localeParam,
	strings,
}: {
	event: LandingEvent | null;
	locale: Locale;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	const detail = useQuery({
		...trendEventDetailQueryOptions(event?.eventId ?? "", "featured", locale),
		enabled: Boolean(event),
	});
	const headlines: Headlines = new Map(
		(detail.data?.sourceItems ?? []).map((item) => [
			item.sourceId,
			{
				original:
					item.original?.title && item.original.title !== item.title
						? item.original.title
						: undefined,
				title: item.title,
			},
		])
	);
	const view = event ? liveView(event, headlines) : exampleView(locale);
	const outlets = view.outlets.slice(0, MAX_OUTLETS);
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.eventsBody}
					kicker={strings.eventsKicker}
					title={strings.eventsTitle}
				/>
				<div className="mt-10 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
					<ul className="space-y-2">
						{outlets.map((outlet) => (
							<li
								className={`${CARD_CLASS} flex items-start gap-3 px-4 py-3`}
								key={`${outlet.name}:${outlet.title}`}
							>
								<SourceMark size="sm" source={asSource(outlet)} />
								<div className="min-w-0">
									<p className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
										{outlet.name}
										{outlet.kind ? (
											<span>{strings.kindLabels[outlet.kind]}</span>
										) : null}
									</p>
									{outlet.title === outlet.name ? null : (
										<p className="mt-0.5 text-[13px] text-[var(--text-secondary)] leading-snug">
											{outlet.title}
										</p>
									)}
									{outlet.original ? (
										<p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
											{outlet.original}
										</p>
									) : null}
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
					</div>
					<article
						className={`${CARD_CLASS} border-[var(--accent-blue)] p-5 shadow-[0_12px_32px_-12px_rgba(26,78,220,0.25)] sm:p-6`}
					>
						<p className="flex flex-wrap items-center gap-2 text-[11px]">
							<span
								className={
									view.live
										? "inline-flex h-5 items-center bg-[var(--accent-blue-bg)] px-1.5 font-medium text-[var(--accent-blue)]"
										: "inline-flex h-5 items-center border border-[var(--border-default)] px-1.5 text-[var(--text-muted)]"
								}
							>
								{view.live ? strings.eventsLive : strings.eventsExample}
							</span>
							{view.topic ? (
								<TopicTag label={t(`topic.${view.topic}`)} topic={view.topic} />
							) : null}
						</p>
						<h3 className="mt-3 font-semibold text-[20px] text-[var(--text-heading)] leading-tight">
							{view.title}
						</h3>
						{view.original ? (
							<p className="mt-1.5 text-[12px] text-[var(--text-muted)] leading-snug">
								<span className="mr-1 font-medium">
									{strings.eventsOriginal}
								</span>
								{view.original}
							</p>
						) : null}
						{view.summary ? (
							<p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
								{view.summary}
							</p>
						) : null}
						<p className="mt-4 flex flex-wrap items-center gap-2.5 text-[12px] text-[var(--text-muted)]">
							<span className="flex -space-x-1">
								{outlets.map((outlet) => (
									<SourceMark
										key={outlet.name}
										size="sm"
										source={asSource(outlet)}
									/>
								))}
							</span>
							<span className="font-medium text-[var(--text-secondary)]">
								{strings.eventsMergeLine(
									view.outlets.length,
									view.first,
									view.hours
								)}
							</span>
						</p>
					</article>
				</div>
				<div className="mt-8">
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
