/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming requires the $id segment. */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { SourceNotFoundError } from "@/components/trends/load-trends";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { formatRelativeTime } from "@/components/trends/relative-time";
import { SourceFavicon } from "@/components/trends/source-favicon";
import { sourceDetailQueryOptions } from "@/components/trends/trends-query";
import type { SourceDetailData } from "@/components/trends/types";
import {
	isLocale,
	type Locale,
	localePathParam,
	resolveLocale,
	type TranslationKey,
	translate,
	useT,
} from "@/lib/i18n";
import { buildSeo } from "@/lib/seo";

// A source's own page: what it is, which topics carry it, and its latest
// items, at a permanent address.

interface Strings {
	description: (name: string, note: string | undefined) => string;
	empty: string;
	follow: (topic: string) => string;
	latest: (name: string) => string;
	provider: Record<SourceDetailData["provider"], string>;
	title: (name: string) => string;
	topics: string;
	visit: (name: string) => string;
}

const EN: Strings = {
	description: (name, note) =>
		`${note ? `${note} ` : ""}The latest headlines from ${name}, refreshed every few minutes and translated by OpenTrends.`,
	empty: "No items fetched yet.",
	follow: (topic) => `Follow it on the ${topic} page`,
	latest: (name) => `Latest from ${name}`,
	provider: {
		native: "Read directly from the site",
		rss: "Read from its RSS feed",
		rsshub: "Read through RSSHub",
	},
	topics: "Appears in",
	title: (name) => `${name}: latest headlines`,
	visit: (name) => `Open ${name}`,
};

const ZH: Strings = {
	description: (name, note) =>
		`${note ? `${note} ` : ""}${name} 的最新头条，每几分钟刷新，由 OpenTrends 翻译。`,
	empty: "还没有抓到条目。",
	follow: (topic) => `在${topic}页面关注它`,
	latest: (name) => `${name} 最新`,
	provider: {
		native: "直接从站点读取",
		rss: "读取它的 RSS",
		rsshub: "经 RSSHub 读取",
	},
	topics: "所属板块",
	title: (name) => `${name} 最新头条`,
	visit: (name) => `打开 ${name}`,
};

const ZH_HANT: Strings = {
	description: (name, note) =>
		`${note ? `${note} ` : ""}${name} 的最新頭條，每幾分鐘更新，由 OpenTrends 翻譯。`,
	empty: "還沒有抓到條目。",
	follow: (topic) => `在${topic}頁面關注它`,
	latest: (name) => `${name} 最新`,
	provider: {
		native: "直接從站點讀取",
		rss: "讀取它的 RSS",
		rsshub: "經 RSSHub 讀取",
	},
	topics: "所屬板塊",
	title: (name) => `${name} 最新頭條`,
	visit: (name) => `打開 ${name}`,
};

const STRINGS: Partial<Record<Locale, Strings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

function getStrings(locale: Locale): Strings {
	return STRINGS[locale] ?? EN;
}

function topicLabel(topic: string, locale: Locale, fallback: string): string {
	const key = `topic.${topic}` as TranslationKey;
	const label = translate(locale, key);
	return label === key ? fallback : label;
}

export const Route = createFileRoute("/{-$locale}/sources_/$id")({
	component: SourceRoute,
	loader: async ({ context, params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
		const locale = resolveLocale(params.locale);
		const options = sourceDetailQueryOptions(params.id, locale);
		if (import.meta.env.SSR) {
			const detail = await readApiJsonForSsr<SourceDetailData>(
				`/api/sources/${encodeURIComponent(params.id)}?lang=${locale}`
			);
			if (detail.status === 404) {
				throw notFound();
			}
			if (detail.data) {
				context.queryClient.setQueryData(options.queryKey, detail.data);
			}
			return { detail: detail.data };
		}
		try {
			const detail = await context.queryClient.ensureQueryData(options);
			return { detail };
		} catch (error) {
			if (error instanceof SourceNotFoundError) {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ loaderData, params }) => {
		const locale = resolveLocale(params.locale);
		const strings = getStrings(locale);
		const name = loaderData?.detail?.name ?? params.id;
		return buildSeo({
			description: strings.description(name, loaderData?.detail?.note),
			locale,
			path: `/sources/${params.id}`,
			title: strings.title(name),
			// No loader data means the source was not found.
			noindex: loaderData === undefined,
		});
	},
});

function SourceRoute() {
	const params = Route.useParams();
	const locale = resolveLocale(params.locale);
	const strings = getStrings(locale);
	const t = useT();
	const detail = useQuery(sourceDetailQueryOptions(params.id, locale));
	const data = detail.data;
	const items = data?.card?.items ?? [];

	if (!data) {
		return (
			<div className="min-w-0 flex-1 bg-[var(--surface-sidebar)]">
				<div className="mx-auto w-full max-w-3xl p-6 sm:p-10">
					<span className="inline-block h-7 w-56 animate-pulse bg-[var(--state-hover-subtle)]" />
				</div>
			</div>
		);
	}

	return (
		<div className="min-w-0 flex-1 bg-[var(--surface-sidebar)] text-[var(--text-primary)]">
			<article className="mx-auto w-full max-w-3xl space-y-5 p-6 sm:p-10">
				<header className="space-y-2">
					<h1 className="flex items-center gap-2 font-bold text-2xl text-[var(--text-heading)] tracking-tight">
						<SourceFavicon homeUrl={data.homeUrl} />
						<span>{data.name}</span>
						{data.homeUrl ? (
							<a
								aria-label={strings.visit(data.name)}
								className="inline-flex size-6 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
								href={data.homeUrl}
								rel="noopener noreferrer"
								target="_blank"
								title={strings.visit(data.name)}
							>
								<ExternalLink className="size-4" />
							</a>
						) : null}
					</h1>
					{data.note ? (
						<p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
							{data.note}
						</p>
					) : null}
					<p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-muted)]">
						<span>{strings.provider[data.provider]}</span>
						{data.topics.length > 0 ? (
							<span className="flex flex-wrap items-center gap-x-2">
								<span>{strings.topics}:</span>
								{data.topics.map((topic) => (
									<Link
										className="text-[var(--accent-blue)] hover:underline"
										key={topic.id}
										params={{
											locale: localePathParam(locale),
											topic: topic.id,
										}}
										to="/{-$locale}/trends/$topic"
									>
										{topicLabel(topic.id, locale, topic.title)}
									</Link>
								))}
							</span>
						) : null}
					</p>
				</header>

				<section className="border border-[var(--border-default)] bg-[var(--surface-card)]">
					<h2 className="border-[var(--border-subtle)] border-b px-4 py-2 font-semibold text-[12px] text-[var(--text-muted)]">
						{strings.latest(data.name)}
					</h2>
					{items.length > 0 ? (
						<ol className="divide-y divide-[var(--border-subtle)]">
							{items.map((item) => (
								<li key={item.url}>
									<a
										className="flex items-baseline gap-3 px-4 py-2 text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[var(--state-hover-subtle)]"
										href={item.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										<span className="min-w-0 flex-1">{item.title}</span>
										{item.publishedAt ? (
											<span className="shrink-0 text-[11px] text-[var(--text-muted)]">
												{formatRelativeTime(item.publishedAt, t)}
											</span>
										) : null}
									</a>
								</li>
							))}
						</ol>
					) : (
						<p className="px-4 py-3 text-[12px] text-[var(--text-muted)]">
							{strings.empty}
						</p>
					)}
				</section>

				{data.topics[0] ? (
					<p className="text-[12px] text-[var(--text-secondary)]">
						<Link
							className="text-[var(--accent-blue)] hover:underline"
							params={{
								locale: localePathParam(locale),
								topic: data.topics[0].id,
							}}
							to="/{-$locale}/trends/$topic"
						>
							{strings.follow(
								topicLabel(data.topics[0].id, locale, data.topics[0].title)
							)}
						</Link>
					</p>
				) : null}
			</article>
		</div>
	);
}
