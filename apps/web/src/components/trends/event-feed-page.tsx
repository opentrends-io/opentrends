import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { localePathParam, type Translator, useLocale, useT } from "@/lib/i18n";

import { EventBriefList } from "./event-brief-list";
import { EventDetailDialog } from "./event-detail-dialog";
import { EventPagesStrip } from "./event-pages-strip";
import { EventStoryCard, EventStorySkeleton } from "./event-story-card";
import {
	loadTrendEvents,
	TrendEventsEmbeddingNotConfiguredError,
	TrendsTopicNotFoundError,
} from "./load-trends";
import { eventStoriesQueryOptions } from "./trends-query";
import type { EventFeedItem } from "./types";
import { ViewSwitch } from "./view-switch";

interface EventFeedPageProps {
	selectedTopic?: string;
}

const TOPIC_IDS = [
	"featured",
	"ai",
	"embodied",
	"hardware",
	"biotech",
	"programming",
	"cn",
] as const;

const BRIEF_PAGE_SIZE = 30;
const STORY_SKELETON_ROWS = 6;

const NOTICE_CLASS =
	"flex min-h-[120px] items-center justify-center border border-[var(--border-default)] bg-[var(--surface-card)] px-6 text-center text-[13px] text-[var(--text-secondary)]";

function getTopicLabel(topicId: string, t: Translator): string {
	const known = TOPIC_IDS.find((id) => id === topicId);
	return known ? t(`topic.${known}`) : topicId;
}

function uniqueEvents(events: readonly EventFeedItem[]): EventFeedItem[] {
	return [...new Map(events.map((event) => [event.eventId, event])).values()];
}

function rethrowUnexpected(error: Error | null): void {
	if (error instanceof TrendsTopicNotFoundError) {
		throw notFound();
	}
	if (error && !(error instanceof TrendEventsEmbeddingNotConfiguredError)) {
		throw error;
	}
}

// The events page answers one question: which stories are several
// publishers reporting? Those lead, ranked by how much they are reported
// right now; what only one publisher has covered follows as a folded list.
export function EventFeedPage({ selectedTopic }: EventFeedPageProps) {
	const locale = useLocale();
	const localeParam = localePathParam(locale);
	const t = useT();
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	const [briefsExpanded, setBriefsExpanded] = useState(false);
	const storiesQuery = useQuery(
		eventStoriesQueryOptions(selectedTopic, locale)
	);
	const briefsQuery = useInfiniteQuery({
		queryKey: ["trend-events", "briefs", selectedTopic ?? "all", locale],
		queryFn: ({ pageParam }) =>
			loadTrendEvents(
				selectedTopic,
				pageParam,
				BRIEF_PAGE_SIZE,
				locale,
				"briefs"
			),
		getNextPageParam: (lastPage) => lastPage.nextOffset,
		gcTime: 30 * 60_000,
		initialPageParam: 0,
		refetchOnWindowFocus: false,
		staleTime: 10 * 60_000,
	});
	const stories = storiesQuery.data?.events ?? [];
	const briefs = useMemo(
		() =>
			uniqueEvents(
				briefsQuery.data?.pages.flatMap((page) => page.events) ?? []
			),
		[briefsQuery.data]
	);
	const selectedEvent = stories.find(
		(event) => event.eventId === selectedEventId
	);

	rethrowUnexpected(storiesQuery.error);
	rethrowUnexpected(briefsQuery.error);

	let storyContent: ReactNode;
	if (storiesQuery.error instanceof TrendEventsEmbeddingNotConfiguredError) {
		storyContent = (
			<div className={NOTICE_CLASS}>{t("events.embeddingRequired")}</div>
		);
	} else if (storiesQuery.isPending) {
		storyContent = <EventStorySkeleton rows={STORY_SKELETON_ROWS} />;
	} else if (stories.length === 0) {
		storyContent = (
			<div className={NOTICE_CLASS}>{t("events.storiesEmpty")}</div>
		);
	} else {
		storyContent = (
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
				{stories.map((event, index) => (
					<EventStoryCard
						event={event}
						key={event.eventId}
						locale={locale}
						onOpen={() => setSelectedEventId(event.eventId)}
						rank={index + 1}
						t={t}
						topicLabels={(event.topicIds ?? [event.topicId]).map((id) =>
							getTopicLabel(id, t)
						)}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="min-w-0 bg-[var(--surface-app)] text-[var(--text-primary)]">
			<div className="flex h-10 items-center justify-between gap-3 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-3 sm:px-4">
				<ViewSwitch
					localeParam={localeParam}
					topicId={selectedTopic}
					view="events"
				/>
				{storiesQuery.isPending ? (
					<span
						aria-live="polite"
						className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]"
					>
						<LoaderCircle className="size-3.5 text-[var(--accent-blue)] motion-safe:animate-spin" />
						{t("events.loading")}
					</span>
				) : (
					<span className="text-[11px] text-[var(--text-muted)]">
						{t("events.storyCount", { count: stories.length })}
					</span>
				)}
			</div>
			<div className="space-y-6 p-3 sm:p-4">
				<EventPagesStrip />
				<section className="space-y-2">
					<header className="flex flex-wrap items-baseline gap-x-2">
						<h2 className="font-semibold text-[15px] text-[var(--text-heading)]">
							{t("events.stories")}
						</h2>
						<p className="text-[12px] text-[var(--text-muted)]">
							{t("events.storiesHint")}
						</p>
					</header>
					{storyContent}
				</section>
				<EventBriefList
					events={briefs}
					expanded={briefsExpanded}
					hasNextPage={briefsQuery.hasNextPage}
					isFetchingNextPage={briefsQuery.isFetchingNextPage}
					isPending={briefsQuery.isPending}
					onExpand={() => setBriefsExpanded(true)}
					onLoadMore={() => {
						briefsQuery.fetchNextPage().catch(() => undefined);
					}}
					t={t}
				/>
			</div>
			<EventDetailDialog
				event={selectedEvent}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedEventId(null);
					}
				}}
				open={Boolean(selectedEventId)}
			/>
		</div>
	);
}
