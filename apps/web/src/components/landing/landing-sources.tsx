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
	type WallSource,
} from "./landing-model";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	SourceLogo,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// The sources themselves: every site as a small mark with its name, own
// channels first and hot lists last, filtered by topic and folded past the
// first rows.

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
	const chips: { id: WallFilter; label: string }[] = [
		{ id: "all", label: strings.sourcesAll },
		...CONTENT_TOPICS.filter((topic) =>
			wall.some((source) => source.topics.includes(topic))
		).map((topic) => ({ id: topic, label: t(`topic.${topic}`) })),
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
							"inline-flex h-7 items-center border px-2.5 text-[12px] transition-colors",
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
					</button>
				))}
			</div>
			<ul className="mt-4 flex flex-wrap gap-2">
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
					{expanded ? strings.sourcesShowLess : strings.sourcesShowAll}
				</button>
			) : null}
		</div>
	);
}

export function LandingSources({
	localeParam,
	sourceCount,
	strings,
	wall,
}: {
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
	wall: WallSource[];
}) {
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.sourcesBody}
					kicker={strings.sourcesKicker}
					title={strings.sourcesTitle(sourceCount)}
				/>
				{wall.length > 0 ? (
					<Wall localeParam={localeParam} strings={strings} wall={wall} />
				) : null}
				{sourceCount ? (
					<div className="mt-8">
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
