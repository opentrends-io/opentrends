import { cn } from "@opentrends/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import {
	type ContentTopicId,
	LANDING_TOPIC_IDS,
	SOURCE_WALL_TILES,
	type TopicSources,
	type WallSource,
} from "./landing-model";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	SourceLogo,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// The sources themselves: a wall of their marks, filtered by topic, and
// each topic's list underneath. The wall draws every tile the same size
// so the names only appear when a tile is pointed at.

type WallFilter = "all" | ContentTopicId;

const CONTENT_TOPICS = LANDING_TOPIC_IDS.filter(
	(topic): topic is ContentTopicId => topic !== "featured"
);

function WallTile({
	localeParam,
	source,
}: {
	localeParam: LocaleParam;
	source: WallSource;
}) {
	return (
		<li>
			<Link
				aria-label={source.name}
				className="group/tile grid h-11 grid-cols-[2.75rem_0fr] items-center overflow-hidden border border-[var(--border-default)] bg-white transition-[grid-template-columns,box-shadow] duration-300 hover:grid-cols-[2.75rem_1fr] hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] focus-visible:grid-cols-[2.75rem_1fr] focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)] motion-reduce:transition-none"
				params={{ locale: localeParam, id: source.id }}
				title={source.name}
				to="/{-$locale}/sources/$id"
			>
				<span className="grid h-11 place-items-center">
					<SourceLogo className="size-[22px]" size={22} source={source} />
				</span>
				<span className="min-w-0 overflow-hidden whitespace-nowrap pr-3.5 font-medium text-[12px] text-[var(--text-primary)] opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100">
					{source.name}
				</span>
			</Link>
		</li>
	);
}

function Wall({
	localeParam,
	sourceCount,
	strings,
	topics,
	wall,
}: {
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
	topics: TopicSources[];
	wall: WallSource[];
}) {
	const t = useT();
	const [filter, setFilter] = useState<WallFilter>("all");
	const tiles = (
		filter === "all"
			? wall
			: wall.filter((source) => source.topics.includes(filter))
	).slice(0, SOURCE_WALL_TILES);
	const counts = new Map(topics.map((group) => [group.topic, group.count]));
	const chips: { id: WallFilter; label: string; count: number | null }[] = [
		{ id: "all", label: t("kind.all"), count: sourceCount },
		...CONTENT_TOPICS.filter((topic) => counts.has(topic)).map((topic) => ({
			id: topic,
			label: t(`topic.${topic}`),
			count: counts.get(topic) ?? null,
		})),
	];
	return (
		<div className="mt-10">
			<div
				aria-label={strings.sourcesKicker}
				className="flex flex-wrap gap-1.5"
				role="tablist"
			>
				{chips.map((chip) => (
					<button
						aria-selected={chip.id === filter}
						className={cn(
							"inline-flex h-7 items-center gap-1.5 border px-2.5 text-[12px] transition-colors",
							chip.id === filter
								? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--text-inverse)]"
								: "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
						)}
						key={chip.id}
						onClick={() => setFilter(chip.id)}
						role="tab"
						type="button"
					>
						{chip.label}
						{chip.count ? (
							<span className="tabular-nums opacity-70">{chip.count}</span>
						) : null}
					</button>
				))}
			</div>
			<ul className="mt-5 flex flex-wrap gap-2">
				{tiles.map((source) => (
					<WallTile key={source.id} localeParam={localeParam} source={source} />
				))}
			</ul>
		</div>
	);
}

function TopicList({
	group,
	localeParam,
	strings,
}: {
	group: TopicSources;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	const rest = group.count - group.sources.length;
	return (
		<div className="min-w-0">
			<h3 className="flex items-baseline justify-between gap-3 border-[var(--border-default)] border-b pb-2">
				<Link
					className="font-semibold text-[14px] text-[var(--text-primary)] hover:underline"
					params={{ locale: localeParam, topic: group.topic }}
					to="/{-$locale}/trends/$topic"
				>
					{t(`topic.${group.topic}`)}
				</Link>
				<span className="text-[11px] text-[var(--text-muted)] tabular-nums">
					{strings.topicSources(group.count)}
				</span>
			</h3>
			<ul className="mt-2.5 space-y-1.5">
				{group.sources.map((source) => (
					<li key={source.id}>
						<Link
							className="block truncate text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							params={{ locale: localeParam, id: source.id }}
							to="/{-$locale}/sources/$id"
						>
							{source.name}
						</Link>
					</li>
				))}
				{rest > 0 ? (
					<li>
						<Link
							className="text-[13px] text-[var(--accent-blue)] hover:underline"
							params={{ locale: localeParam, topic: group.topic }}
							to="/{-$locale}/trends/$topic"
						>
							+{rest}
						</Link>
					</li>
				) : null}
			</ul>
		</div>
	);
}

export function LandingSources({
	localeParam,
	sourceCount,
	strings,
	topics,
	wall,
}: {
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
	topics: TopicSources[];
	wall: WallSource[];
}) {
	return (
		<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.sourcesBody(sourceCount)}
					kicker={strings.sourcesKicker}
					title={strings.sourcesTitle}
				/>
				{wall.length > 0 ? (
					<Wall
						localeParam={localeParam}
						sourceCount={sourceCount}
						strings={strings}
						topics={topics}
						wall={wall}
					/>
				) : null}
				{topics.length > 0 ? (
					<div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
						{topics.map((group) => (
							<TopicList
								group={group}
								key={group.topic}
								localeParam={localeParam}
								strings={strings}
							/>
						))}
					</div>
				) : null}
				{sourceCount ? (
					<div className="mt-10">
						<Link
							className={TEXT_LINK_CLASS}
							params={{ locale: localeParam }}
							to="/{-$locale}/sources"
						>
							{strings.sourcesMore(sourceCount)}
							<ArrowRight aria-hidden />
						</Link>
					</div>
				) : null}
			</div>
		</section>
	);
}
