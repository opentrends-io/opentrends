import type { Translator } from "@/lib/i18n";

import { dateMs, publisherName } from "./event-format";
import { formatRelativeTime } from "./relative-time";
import type { EventFeedItem } from "./types";

const COLLAPSED_ROWS = 8;

const FOOTER_BUTTON_CLASS =
	"inline-flex h-8 items-center border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--state-hover-subtle)] hover:text-[var(--text-primary)] disabled:opacity-50";

// Stories only one publisher has reported so far: a plain list, newest
// first, each row opening the article itself. Folded to a few rows so the
// page leads with what several publishers confirm.
export function EventBriefList({
	events,
	expanded,
	hasNextPage,
	isFetchingNextPage,
	isPending,
	onExpand,
	onLoadMore,
	t,
}: {
	events: readonly EventFeedItem[];
	expanded: boolean;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	isPending: boolean;
	onExpand: () => void;
	onLoadMore: () => void;
	t: Translator;
}) {
	const visible = expanded ? events : events.slice(0, COLLAPSED_ROWS);
	const folded = !expanded && events.length > COLLAPSED_ROWS;
	return (
		<section className="space-y-2">
			<header className="flex flex-wrap items-baseline gap-x-2">
				<h2 className="font-semibold text-[15px] text-[var(--text-heading)]">
					{t("events.briefs")}
				</h2>
				<p className="text-[12px] text-[var(--text-muted)]">
					{t("events.briefsHint")}
				</p>
			</header>
			{isPending && events.length === 0 ? (
				<div className="h-64 border border-[var(--border-default)] bg-[var(--surface-card)] motion-safe:animate-pulse" />
			) : (
				<ul className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] bg-[var(--surface-card)]">
					{visible.map((event) => (
						<li key={event.eventId}>
							<a
								className="flex min-w-0 items-center gap-3 px-3 py-2 text-[13px] text-[var(--text-primary)] transition-colors visited:text-[#9b9893] hover:bg-[var(--state-hover-subtle)] hover:text-[var(--accent-blue)] dark:visited:text-[#6f685f]"
								href={event.primarySource?.url}
								rel="noopener noreferrer"
								target="_blank"
								title={event.summary}
							>
								<span
									className="w-16 shrink-0 text-[11px] text-[var(--text-muted)] tabular-nums"
									suppressHydrationWarning
								>
									{formatRelativeTime(dateMs(event.firstSeenAt), t)}
								</span>
								<span className="min-w-0 flex-1 truncate">{event.title}</span>
								{event.primarySource ? (
									<span className="hidden shrink-0 text-[11px] text-[var(--text-muted)] sm:inline">
										{publisherName(event.primarySource.title)}
									</span>
								) : null}
							</a>
						</li>
					))}
				</ul>
			)}
			<div className="flex justify-center">
				{folded ? (
					<button
						className={FOOTER_BUTTON_CLASS}
						onClick={onExpand}
						type="button"
					>
						{t("events.showBriefs")}
					</button>
				) : null}
				{!folded && hasNextPage ? (
					<button
						className={FOOTER_BUTTON_CLASS}
						disabled={isFetchingNextPage}
						onClick={onLoadMore}
						type="button"
					>
						{isFetchingNextPage
							? t("events.loadingMore")
							: t("events.loadMore")}
					</button>
				) : null}
			</div>
		</section>
	);
}
