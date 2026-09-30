import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@opentrends/ui/components/dialog";
import { ScrollArea } from "@opentrends/ui/components/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

import { useLocale, useT } from "@/lib/i18n";

import { dateMs, formatReportTime, publisherName } from "./event-format";
import { SourceFavicon } from "./source-favicon";
import { trendEventDetailQueryOptions } from "./trends-query";
import type { EventDetailData, EventFeedItem } from "./types";

type SourceItem = EventDetailData["sourceItems"][number];

const TRAILING_QUERY_RE = /[?#].*$/;

// Each report in the order it came out; the first one is where the story
// broke. A publisher's section feeds carry the same article, so one link is
// listed once.
function timeline(items: readonly SourceItem[]): SourceItem[] {
	const byUrl = new Map<string, SourceItem>();
	for (const item of [...items].sort(
		(a, b) => dateMs(a.publishedAt) - dateMs(b.publishedAt)
	)) {
		const key = item.url.replace(TRAILING_QUERY_RE, "");
		if (!byUrl.has(key)) {
			byUrl.set(key, item);
		}
	}
	return [...byUrl.values()];
}

export function EventDetailDialog({
	event,
	onOpenChange,
	open,
}: {
	event: EventFeedItem | undefined;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const t = useT();
	const locale = useLocale();
	const detailQuery = useQuery({
		...trendEventDetailQueryOptions(
			event?.eventId ?? "",
			event?.topicId,
			locale
		),
		enabled: open && Boolean(event),
	});
	const sources = useMemo(
		() => new Map((event?.sources ?? []).map((s) => [s.sourceId, s])),
		[event]
	);
	const reports = timeline(detailQuery.data?.sourceItems ?? []);
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="leading-snug">
						{event?.title ?? t("events.heading")}
					</DialogTitle>
				</DialogHeader>
				<ScrollArea className="min-h-0 flex-1 overflow-hidden">
					<div className="flex flex-col gap-3 p-1">
						{event?.summary ? (
							<p className="text-[13px] text-[var(--text-secondary)] leading-[1.6]">
								{event.summary}
							</p>
						) : null}
						<h3 className="font-semibold text-[12px] text-[var(--text-muted)]">
							{t("events.reports")}
							{event?.publishers
								? ` · ${t("events.publisherCount", { count: event.publishers.length })}`
								: ""}
						</h3>
						{detailQuery.isPending ? (
							<div className="h-40 border border-[var(--border-default)] bg-[var(--surface-sidebar)] motion-safe:animate-pulse" />
						) : null}
						{detailQuery.error ? (
							<p className="text-[12px] text-[var(--accent-red)]">
								{t("events.detailLoadError")}
							</p>
						) : null}
						{reports.length > 0 ? (
							<ol className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)]">
								{reports.map((item, index) => {
									const source = sources.get(item.sourceId);
									return (
										<li key={`${item.sourceId}:${item.itemId}`}>
											<a
												className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--state-hover-subtle)]"
												href={item.url}
												rel="noopener noreferrer"
												target="_blank"
											>
												<span className="w-20 shrink-0 pt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
													{formatReportTime(item.publishedAt, locale)}
												</span>
												<span className="min-w-0 flex-1">
													<span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
														<SourceFavicon
															homeUrl={source?.homeUrl}
															size={12}
														/>
														{publisherName(source?.title ?? item.sourceId)}
														{index === 0 ? (
															<span className="border border-[var(--accent-blue)] px-1 text-[10px] text-[var(--accent-blue)] leading-4">
																{t("events.firstReport")}
															</span>
														) : null}
													</span>
													<span className="mt-0.5 line-clamp-2 font-medium text-[13px] text-[var(--text-primary)] leading-[1.45] group-hover:text-[var(--accent-blue)]">
														{item.title}
													</span>
												</span>
												<ArrowUpRight className="mt-1 size-3 shrink-0 text-[var(--text-muted)]" />
											</a>
										</li>
									);
								})}
							</ol>
						) : null}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
