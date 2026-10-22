import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { formatRelativeTime } from "@/components/trends/relative-time";
import { useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import type { CrossCheckedStory } from "./landing-model";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	proxiedImage,
	SectionHeader,
	SourceMark,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// The events the most outlets are reporting right now, each with its
// cover, its outlets by role, and when it was last seen. Straight from the
// live events feed.

const COVER_WIDTH = 640;
const COVER_HEIGHT = 360;

// A cover that quietly disappears when the upstream image cannot be
// fetched, instead of leaving a broken-image box in the card.
function Cover({ src }: { src: string }) {
	const [failed, setFailed] = useState(false);
	if (failed) {
		return null;
	}
	return (
		// The error listener hides a failed decorative cover; it is not a user interaction.
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: see explanation above
		<img
			alt=""
			className="aspect-video w-full border-[var(--border-subtle)] border-b bg-[var(--surface-sidebar)] object-cover"
			decoding="async"
			height={COVER_HEIGHT}
			loading="lazy"
			onError={() => setFailed(true)}
			src={proxiedImage(src, "card")}
			width={COVER_WIDTH}
		/>
	);
}

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
		<article className={`${CARD_CLASS} flex flex-col overflow-hidden`}>
			{story.image ? <Cover src={story.image} /> : null}
			<div className="flex flex-1 flex-col p-5">
				<div className="flex items-center justify-between gap-3">
					<span className="font-medium text-[12px] text-[var(--accent-blue)]">
						{strings.eventsReported(story.outlets.length)}
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
					<p className="mt-auto pt-3 text-[11px] text-[var(--text-muted)]">
						{strings.eventsUpdated(updated)}
					</p>
				) : null}
			</div>
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
		<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.eventsBody}
					kicker={strings.eventsKicker}
					title={strings.eventsTitle}
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
						{strings.eventsEmpty}
					</p>
				)}
				<div className="mt-6">
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
