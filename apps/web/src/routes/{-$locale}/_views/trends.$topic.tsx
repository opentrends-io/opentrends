/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming requires $topic segment. */
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	redirect,
} from "@tanstack/react-router";
import { Star } from "lucide-react";
import {
	FOLLOWED_TOPIC_ID,
	useFollowedSources,
} from "@/components/trends/followed-sources";
import { TrendsTopicNotFoundError } from "@/components/trends/load-trends";
import {
	loadTrendsForSsr,
	readApiJsonForSsr,
} from "@/components/trends/load-trends-ssr";
import { readLocalPreference } from "@/components/trends/source-preferences";
import { TrendsPage } from "@/components/trends/trends-page";
import {
	digestDaysQueryOptions,
	ssrDigestQueryOptions,
	trendsPageQueryOptions,
} from "@/components/trends/trends-query";
import { SourceGridSkeleton } from "@/components/trends/trends-skeleton";
import type { DigestJsonData, TrendsPageData } from "@/components/trends/types";
import {
	isLocale,
	type Locale,
	localePathParam,
	resolveLocale,
	type TranslationKey,
	translate,
	useLocale,
	useT,
} from "@/lib/i18n";
import { buildSeo, localizedPath, SITE_URL } from "@/lib/seo";
import {
	breadcrumbList,
	digestItemList,
	type JsonLdScript,
} from "@/lib/structured-data";
import { isSeoTopicId, topicSeo } from "@/lib/topic-seo";

const TOPIC_SLUG_SEPARATOR_RE = /[-_]+/;

const TOPIC_TITLE_KEYS = {
	mine: "topic.mine",
	featured: "topic.featured",
	ai: "topic.ai",
	embodied: "topic.embodied",
	hardware: "topic.hardware",
	biotech: "topic.biotech",
	programming: "topic.programming",
	cn: "topic.cn",
} as const satisfies Record<string, TranslationKey>;

function humanizeTopicSlug(topic: string): string {
	return topic
		.split(TOPIC_SLUG_SEPARATOR_RE)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getTopicLabel(topic: string, locale: Locale): string {
	const key = TOPIC_TITLE_KEYS[topic as keyof typeof TOPIC_TITLE_KEYS];
	return key ? translate(locale, key) : humanizeTopicSlug(topic);
}

function buildTopicTitle(topicLabel: string, locale: Locale): string {
	if (locale === "zh") {
		return `${topicLabel}趋势`;
	}
	if (locale === "zh-Hant") {
		return `${topicLabel}趨勢`;
	}
	if (locale === "ru") {
		return `Тренды: ${topicLabel}`;
	}
	return `${topicLabel} Trends`;
}

function buildTopicDescription(topicLabel: string, locale: Locale): string {
	if (locale === "zh") {
		return `OpenTrends 持续聚合${topicLabel}领域的热门新闻、社区讨论和研究动态。`;
	}
	if (locale === "zh-Hant") {
		return `OpenTrends 持續聚合${topicLabel}領域的熱門新聞、社群討論和研究動態。`;
	}
	if (locale === "ru") {
		return `OpenTrends непрерывно собирает популярные новости, обсуждения и исследования по теме ${topicLabel}.`;
	}
	return `Trending ${topicLabel} news aggregated from curated sources, updated continuously by OpenTrends.`;
}

// Breadcrumbs for every topic page, and the ten digest lines as an
// ItemList when the server had them.
function structuredData(params: {
	digest: DigestJsonData | null;
	locale: Locale;
	title: string;
	topic: string;
	topicLabel: string;
}): JsonLdScript[] {
	const url = (path: string) =>
		`${SITE_URL}${localizedPath(path, params.locale) ?? path}`;
	const base = url(`/trends/${params.topic}`);
	const list = digestItemList({
		entries: params.digest?.entries ?? [],
		name: params.title,
		url: base,
	});
	return [
		breadcrumbList([
			{ name: "OpenTrends", url: url("/") },
			{ name: params.topicLabel, url: base },
		]),
		...(list ? [list] : []),
	];
}

// Throws for a URL that is not a topic page: an unknown locale, the retired
// "brain" topic (moved to biotech), and anything but the known topics, which
// is a real 404 rather than an empty page that answers 200.
function checkTopicParams(params: { locale?: string; topic: string }): void {
	if (params.locale && !isLocale(params.locale)) {
		throw notFound();
	}
	if (params.topic === "brain") {
		throw redirect({
			to: "/{-$locale}/trends/$topic",
			params: { locale: params.locale, topic: "biotech" },
		});
	}
	if (params.topic !== FOLLOWED_TOPIC_ID && !isSeoTopicId(params.topic)) {
		throw notFound();
	}
}

export const Route = createFileRoute("/{-$locale}/_views/trends/$topic")({
	component: TrendsTopicComponent,
	loader: async ({ context, params }) => {
		checkTopicParams(params);

		const locale = resolveLocale(params.locale);
		// The followed page depends on the reader's own list, which only the
		// browser knows; on the client it is read from storage here so the
		// page arrives with the navigation instead of after a placeholder.
		if (params.topic === FOLLOWED_TOPIC_ID) {
			if (!import.meta.env.SSR) {
				const followedIds =
					readLocalPreference(FOLLOWED_TOPIC_ID)?.orderedSourceIds ?? [];
				if (followedIds.length > 0) {
					await context.queryClient.ensureQueryData(
						trendsPageQueryOptions(FOLLOWED_TOPIC_ID, locale, followedIds)
					);
				}
			}
			return;
		}
		if (import.meta.env.SSR) {
			// The archive day list rides along so the page's footer links are
			// in the server-rendered HTML.
			// The finished digest is read alongside the page so its ten lines
			// are in the first HTML; a digest still being written is skipped.
			const [page, days, digest] = await Promise.all([
				loadTrendsForSsr(params.topic, locale),
				readApiJsonForSsr<{ days?: string[] }>(
					`/api/trends/${encodeURIComponent(params.topic)}/digest-days?lang=${locale}`
				),
				readApiJsonForSsr<DigestJsonData>(
					`/api/trends/${encodeURIComponent(params.topic)}/summary?format=json&window=today&lang=${locale}`
				),
			]);
			const ssrDigest =
				digest.status === 200 && Array.isArray(digest.data?.entries)
					? digest.data
					: null;
			if (ssrDigest) {
				context.queryClient.setQueryData(
					ssrDigestQueryOptions(params.topic, locale).queryKey,
					ssrDigest
				);
			}
			if (page) {
				context.queryClient.setQueryData(
					trendsPageQueryOptions(params.topic, locale).queryKey,
					page
				);
			}
			if (days.data?.days) {
				context.queryClient.setQueryData(
					digestDaysQueryOptions(params.topic, locale).queryKey,
					days.data.days
				);
			}
			return { digest: ssrDigest };
		}

		await context.queryClient.ensureQueryData(
			trendsPageQueryOptions(params.topic, locale)
		);
		return { digest: null };
	},
	head: ({ loaderData, params }) => {
		const topic = params.topic;
		const locale = resolveLocale(params.locale);
		const topicLabel = getTopicLabel(topic, locale);
		const seo = topicSeo(topic, locale, topicLabel);
		const title = seo?.title ?? buildTopicTitle(topicLabel, locale);
		const head = buildSeo({
			title,
			description:
				seo?.description ?? buildTopicDescription(topicLabel, locale),
			path: `/trends/${topic}`,
			locale,
			// A reader's own page has nothing for a crawler; an unknown topic is
			// a 404.
			noindex: topic === FOLLOWED_TOPIC_ID || !isSeoTopicId(topic),
		});
		return {
			...head,
			scripts: structuredData({
				digest: loaderData?.digest ?? null,
				locale,
				title,
				topic,
				topicLabel,
			}),
		};
	},
});

// Nothing followed yet: point at the star on every card.
function FollowedEmptyState() {
	const t = useT();
	const locale = useLocale();
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--surface-app)] px-6 py-20 text-center">
			<Star aria-hidden className="size-6 text-[var(--text-muted)]" />
			<p className="max-w-sm text-[13px] text-[var(--text-secondary)]">
				{t("followed.empty")}
			</p>
			<Link
				className="text-[13px] text-[var(--accent-blue)] hover:underline"
				params={{ locale: localePathParam(locale), topic: "featured" }}
				to="/{-$locale}/trends/$topic"
			>
				{t("followed.browseFeatured")}
			</Link>
		</main>
	);
}

function TrendsTopicComponent() {
	const params = Route.useParams();
	const locale = resolveLocale(params.locale);
	if (params.topic === FOLLOWED_TOPIC_ID) {
		return <FollowedTopicComponent locale={locale} />;
	}
	return <TopicComponent locale={locale} topic={params.topic} />;
}

function FollowedTopicComponent({ locale }: { locale: Locale }) {
	const { followedIds } = useFollowedSources();
	const enabled = followedIds.length > 0;
	const trends = useQuery<TrendsPageData, Error>({
		...trendsPageQueryOptions(FOLLOWED_TOPIC_ID, locale, followedIds),
		enabled,
	});
	if (!enabled) {
		return <FollowedEmptyState />;
	}
	if (trends.isPending) {
		return <SourceGridSkeleton />;
	}
	if (trends.error) {
		throw trends.error;
	}
	const page = trends.data;
	return (
		<TrendsPage
			key={`${page.id}:${locale}:${followedIds.join(",")}`}
			page={page}
		/>
	);
}

function TopicComponent({ locale, topic }: { locale: Locale; topic: string }) {
	const trends = useQuery<TrendsPageData, Error>({
		...trendsPageQueryOptions(topic, locale),
	});

	if (trends.isPending) {
		return <SourceGridSkeleton />;
	}

	if (trends.error) {
		if (trends.error instanceof TrendsTopicNotFoundError) {
			throw notFound();
		}
		throw trends.error;
	}

	const page = trends.data;
	return (
		<TrendsPage key={`${page.id}:${locale}:${page.updatedAt}`} page={page} />
	);
}
