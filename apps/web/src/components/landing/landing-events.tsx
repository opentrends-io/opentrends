import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { formatRelativeTime } from "@/components/trends/relative-time";
import { useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import type { CrossCheckedStory } from "./landing-model";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	SourceMark,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// The differentiator: the stories the most outlets are reporting right
// now, each with the outlets listed, straight from the live events feed.

function StoryCard({
	story,
	strings,
}: {
	story: CrossCheckedStory;
	strings: LandingStrings;
}) {
	const t = useT();
	const Title = story.url ? "a" : "span";
	const updated = story.updatedAt
		? formatRelativeTime(story.updatedAt, t)
		: null;
	return (
		<article className={`${CARD_CLASS} flex flex-col p-5`}>
			<div className="flex items-center justify-between gap-3">
				<span className="font-medium text-[12px] text-[var(--accent-blue)]">
					{strings.crossReported(story.outlets.length)}
				</span>
				{story.topic ? (
					<TopicTag label={t(`topic.${story.topic}`)} topic={story.topic} />
				) : null}
			</div>
			<h3 className="mt-3 font-semibold text-[16px] text-[var(--text-heading)] leading-snug">
				<Title
					className="hover:underline"
					{...(story.url
						? { href: story.url, rel: "noopener", target: "_blank" }
						: {})}
				>
					{story.title}
					{story.url ? (
						<ArrowUpRight
							aria-hidden
							className="ml-1 inline size-3.5 text-[var(--text-muted)]"
						/>
					) : null}
				</Title>
			</h3>
			{story.summary ? (
				<p className="mt-2 line-clamp-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
					{story.summary}
				</p>
			) : null}
			<ul className="mt-4 flex flex-col gap-1.5 border-[var(--border-subtle)] border-t pt-4">
				{story.outlets.map((outlet) => (
					<li
						className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]"
						key={outlet.id}
					>
						<SourceMark size="sm" source={outlet} />
						<span className="truncate">{outlet.name}</span>
						{outlet.kind ? (
							<span
								className={
									outlet.kind === "official"
										? "ml-auto shrink-0 bg-[var(--accent-blue-bg)] px-1 font-medium text-[10px] text-[var(--accent-blue)]"
										: "ml-auto shrink-0 text-[10px] text-[var(--text-muted)]"
								}
							>
								{strings.kindLabels[outlet.kind]}
							</span>
						) : null}
					</li>
				))}
			</ul>
			{updated ? (
				<p className="mt-3 text-[11px] text-[var(--text-muted)]">
					{strings.crossUpdated(updated)}
				</p>
			) : null}
		</article>
	);
}

export function LandingEvents({
	localeParam,
	stories,
	strings,
}: {
	localeParam: LocaleParam;
	stories: CrossCheckedStory[];
	strings: LandingStrings;
}) {
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.crossBody}
					kicker={strings.crossKicker}
					title={strings.crossTitle}
				/>
				{stories.length > 0 ? (
					<div className="mt-10 grid gap-4 md:grid-cols-3">
						{stories.map((story) => (
							<StoryCard key={story.id} story={story} strings={strings} />
						))}
					</div>
				) : (
					<p
						className={`${CARD_CLASS} mt-10 px-5 py-8 text-[13px] text-[var(--text-secondary)]`}
					>
						{strings.crossEmpty}
					</p>
				)}
				<div className="mt-6">
					<Link
						className={TEXT_LINK_CLASS}
						params={{ locale: localeParam }}
						to="/{-$locale}/events"
					>
						{strings.crossMore}
						<ArrowRight aria-hidden />
					</Link>
				</div>
			</div>
		</section>
	);
}
