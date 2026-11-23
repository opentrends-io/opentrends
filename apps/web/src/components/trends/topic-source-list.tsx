import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { toolButtonClassName } from "@/components/chrome-styles";
import { type Locale, translate } from "@/lib/i18n";
import { TrendsTopicNotFoundError } from "./load-trends";
import { TrendsPage } from "./trends-page";
import { trendsPageQueryOptions } from "./trends-query";
import { SourceGridSkeleton } from "./trends-skeleton";

export function TopicSourceList({
	locale,
	sourceIds,
	topic,
}: {
	locale: Locale;
	sourceIds?: readonly string[];
	topic: string;
}) {
	const query = useQuery(trendsPageQueryOptions(topic, locale, sourceIds));
	if (query.error instanceof TrendsTopicNotFoundError && !sourceIds) {
		throw notFound();
	}
	const page = query.data;
	if (page) {
		return (
			<TrendsPage
				key={`${page.id}:${locale}:${sourceIds?.join(",") ?? page.updatedAt}`}
				page={page}
			/>
		);
	}
	if (query.isPending) {
		return <SourceGridSkeleton />;
	}
	return (
		<div className="flex items-center justify-center gap-3 p-6 text-[var(--text-secondary)] text-sm">
			<p role="status">{translate(locale, "feed.loadError")}</p>
			<button
				className={toolButtonClassName}
				disabled={query.isFetching}
				onClick={() => query.refetch()}
				type="button"
			>
				{translate(locale, "feed.retry")}
			</button>
		</div>
	);
}
