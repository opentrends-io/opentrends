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

// The sources themselves: every site as a small mark with its name, filtered
// by topic and folded past the first rows, then each topic's list.

type WallFilter = "all" | ContentTopicId;

const CONTENT_TOPICS = LANDING_TOPIC_IDS.filter(
	(topic): topic is ContentTopicId => topic !== "featured"
);
const EAGER_TILES = 16;

function WallTile({
	eager,
	localeParam,
	source,
}: {
	eager: boolean;
	localeParam: LocaleParam;
	source: WallSource;
}) {
	return (
		<li>
			<Link
				className="inline-flex h-8 items-center gap-2 border border-[var(--border-default)] bg-[var(--surface-card)] pr-2.5 pl-1.5 text-[12px] text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--state-hover-subtle)]"
				params={{ locale: localeParam, id: source.id }}
				to="/{-$locale}/sources/$id"
			>
				<span className="inline-flex size-5 shrink-0 items-center justify-center bg-white">
					<SourceLogo
						className="size-4"
						eager={eager}
						size={16}
						source={source}
					/>
				</span>
				<span className="whitespace-nowrap">{source.name}</span>
			</Link>
		</li>
	);
}

function Wall({
	localeParam,
	strings,
	wall,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
	wall: WallSource[];
}) {
	const t = useT();
	const [filter, setFilter] = useState<WallFilter>("all");
	const [expanded, setExpanded] = useState(false);
	const matching =
		filter === "all"
			? wall
			: wall.filter((source) => source.topics.includes(filter));
	const tiles = expanded ? matching : matching.slice(0, SOURCE_WALL_TILES);
	// Chip counts are sites on the wall, so they agree with what unfolds.
	const chips: { id: WallFilter; label: string; count: number }[] = [
		{ id: "all", label: t("kind.all"), count: wall.length },
		...CONTENT_TOPICS.map((topic) => ({
			id: topic,
			label: t(`topic.${topic}`),
			count: wall.filter((source) => source.topics.includes(topic)).length,
		})).filter((chip) => chip.count > 0),
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
						onClick={() => {
							setFilter(chip.id);
							setExpanded(false);
						}}
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
				{tiles.map((source, index) => (
					<WallTile
						eager={index < EAGER_TILES}
						key={source.id}
						localeParam={localeParam}
						source={source}
					/>
				))}
			</ul>
			{matching.length > SOURCE_WALL_TILES ? (
				<button
					className={`${TEXT_LINK_CLASS} mt-4`}
					onClick={() => setExpanded((value) => !value)}
					type="button"
				>
					{expanded
						? strings.sourcesShowLess
						: strings.sourcesShowAll(matching.length)}
				</button>
			) : null}
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
							className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							params={{ locale: localeParam, id: source.id }}
							to="/{-$locale}/sources/$id"
						>
							<SourceLogo className="size-3.5" size={14} source={source} />
							<span className="truncate">{source.name}</span>
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
					<Wall localeParam={localeParam} strings={strings} wall={wall} />
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
