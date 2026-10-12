import { env } from "@opentrends/env/web";
import { useState } from "react";

import type { Locale, Translator } from "@/lib/i18n";

import { dateMs, joinNames } from "./event-format";
import { formatRelativeTime } from "./relative-time";
import { SourceLogoStack } from "./source-favicon";
import type { EventFeedItem, EventFeedPublisher } from "./types";

const NAMED_PUBLISHERS = 3;
const TOPIC_TAG_LIMIT = 2;

export function eventCoverUrl(imageUrl: string): string {
	return `${env.VITE_SERVER_URL}/api/image?variant=card&url=${encodeURIComponent(imageUrl)}`;
}

function latestPublisher(
	publishers: readonly EventFeedPublisher[]
): EventFeedPublisher | undefined {
	let latest: EventFeedPublisher | undefined;
	for (const publisher of publishers) {
		if (!latest || dateMs(publisher.latestAt) > dateMs(latest.latestAt)) {
			latest = publisher;
		}
	}
	return latest;
}

// A cover that disappears when it cannot load: an empty frame or a broken
// image icon says less than no picture at all.
function StoryThumb({ imageUrl }: { imageUrl: string }) {
	const [failed, setFailed] = useState(false);
	if (failed) {
		return null;
	}
	return (
		// The error listener hides a failed decorative cover; it is not a user interaction.
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: see explanation above
		<img
			alt=""
			className="h-[72px] w-[108px] shrink-0 border border-[var(--border-subtle)] bg-[var(--surface-sidebar)] object-cover"
			decoding="async"
			height={72}
			loading="lazy"
			onError={() => setFailed(true)}
			referrerPolicy="no-referrer"
			src={eventCoverUrl(imageUrl)}
			width={108}
		/>
	);
}

export function EventStoryCard({
	event,
	locale,
	onOpen,
	rank,
	t,
	topicLabels,
}: {
	event: EventFeedItem;
	locale: Locale;
	onOpen: () => void;
	rank: number;
	t: Translator;
	topicLabels: string[];
}) {
	const publishers = event.publishers ?? [];
	const first = publishers[0];
	const latest = latestPublisher(publishers);
	const named = publishers.slice(0, NAMED_PUBLISHERS).map((p) => p.title);
	const more = publishers.length > NAMED_PUBLISHERS;
	return (
		<article className="flex min-w-0 flex-col border border-[var(--border-default)] bg-[var(--surface-card)]">
			<button
				className="group flex min-w-0 flex-1 items-start gap-3 p-3 text-left transition-colors hover:bg-[var(--state-hover-subtle)]"
				onClick={onOpen}
				type="button"
			>
				<span className="w-5 shrink-0 pt-px font-semibold text-[13px] text-[var(--text-muted)] tabular-nums">
					{rank}
				</span>
				<span className="min-w-0 flex-1">
					<span className="line-clamp-3 font-semibold text-[15px] text-[var(--text-heading)] leading-[1.35] group-hover:text-[var(--accent-blue)]">
						{event.title}
					</span>
					{event.summary ? (
						<span className="mt-1 line-clamp-2 text-[12px] text-[var(--text-secondary)] leading-[1.5]">
							{event.summary}
						</span>
					) : null}
				</span>
				{event.imageUrl ? <StoryThumb imageUrl={event.imageUrl} /> : null}
			</button>
			<div className="flex min-w-0 flex-col gap-1 border-[var(--border-subtle)] border-t px-3 py-2 text-[11px] text-[var(--text-muted)]">
				<span className="flex min-w-0 items-center gap-2">
					<SourceLogoStack
						limit={5}
						showRemaining={false}
						size="sm"
						sources={publishers.map((publisher) => ({
							homeUrl: publisher.homeUrl,
							id: publisher.id,
							label: publisher.title,
						}))}
					/>
					<span className="shrink-0 font-semibold text-[var(--text-primary)]">
						{t("events.publisherCount", { count: publishers.length })}
					</span>
					<span className="min-w-0 truncate">
						{joinNames(named, locale)}
						{more ? " …" : ""}
					</span>
				</span>
				<span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
					{first ? (
						<span suppressHydrationWarning>
							{t("events.firstReported", {
								time: formatRelativeTime(dateMs(first.firstAt), t),
							})}
						</span>
					) : null}
					{latest && first && latest.id !== first.id ? (
						<span suppressHydrationWarning>
							{t("events.latestFollowUp", {
								publisher: latest.title,
								time: formatRelativeTime(dateMs(latest.latestAt), t),
							})}
						</span>
					) : null}
					{topicLabels.slice(0, TOPIC_TAG_LIMIT).map((label) => (
						<span
							className="border border-[var(--border-default)] bg-[var(--surface-sidebar)] px-1.5 text-[var(--text-secondary)]"
							key={label}
						>
							{label}
						</span>
					))}
				</span>
			</div>
		</article>
	);
}

export function EventStorySkeleton({ rows }: { rows: number }) {
	return (
		<div
			aria-hidden="true"
			className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3"
		>
			{Array.from({ length: rows }, (_, index) => (
				<div
					className="flex flex-col border border-[var(--border-default)] bg-[var(--surface-card)]"
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
					key={index}
				>
					<div className="flex gap-3 p-3">
						<div className="h-4 w-5 bg-[var(--state-hover)] motion-safe:animate-pulse" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-[90%] bg-[var(--state-hover)] motion-safe:animate-pulse" />
							<div className="h-4 w-[60%] bg-[var(--state-hover)] motion-safe:animate-pulse" />
							<div className="h-3 w-[80%] bg-[var(--surface-sidebar)] motion-safe:animate-pulse" />
						</div>
						<div className="h-[72px] w-[108px] bg-[var(--surface-sidebar)] motion-safe:animate-pulse" />
					</div>
					<div className="space-y-1.5 border-[var(--border-subtle)] border-t px-3 py-2">
						<div className="h-3 w-[55%] bg-[var(--surface-sidebar)] motion-safe:animate-pulse" />
						<div className="h-3 w-[40%] bg-[var(--surface-sidebar)] motion-safe:animate-pulse" />
					</div>
				</div>
			))}
		</div>
	);
}
