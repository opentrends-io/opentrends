/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming requires $topic and $day segments. */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import {
	ArchivedDigestNotFoundError,
	TrendsTopicNotFoundError,
} from "@/components/trends/load-trends";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import {
	archivedDigestQueryOptions,
	digestDaysQueryOptions,
} from "@/components/trends/trends-query";
import type {
	ArchivedDigestData,
	ArchivedDigestEntry,
} from "@/components/trends/types";
import { archiveDayEditions, isArchiveIndex } from "@/lib/archive-sitemap";
import {
	isLocale,
	type Locale,
	localePathParam,
	resolveLocale,
	type TranslationKey,
	translate,
} from "@/lib/i18n";
import { buildSeo, localizedPath, SITE_URL } from "@/lib/seo";
import { breadcrumbList, digestItemList } from "@/lib/structured-data";

// One day of a topic's digest, at a permanent address: the ten lines and
// their citations as they stood at the end of that day. This is the page
// that stays when the live topic page has moved on.

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DESCRIPTION_LIMIT = 160;
const WWW_PREFIX_RE = /^www\./;

interface Strings {
	archive: (topic: string) => string;
	back: (topic: string) => string;
	description: (topic: string, day: string) => string;
	empty: string;
	intro: (topic: string, count: number) => string;
	newer: string;
	older: string;
	sourcesOf: string;
	title: (topic: string, day: string) => string;
}

const EN: Strings = {
	archive: (topic) => `${topic} digest archive`,
	back: (topic) => `Today's ${topic} page`,
	description: (topic, day) =>
		`The ${topic} stories most cited across sources on ${day}, with links to the original reporting.`,
	empty: "No digest was archived for this day.",
	intro: (topic, count) =>
		`The ${count} ${topic} stories that the most sources reported on this day, each with the reports it was drawn from.`,
	newer: "Next day",
	older: "Previous day",
	sourcesOf: "Sources",
	title: (topic, day) => `${topic} digest · ${day}`,
};

const ZH: Strings = {
	archive: (topic) => `${topic}摘要归档`,
	back: (topic) => `今天的${topic}页面`,
	description: (topic, day) =>
		`${day} 被最多来源报道的${topic}新闻，每条附原始报道链接。`,
	empty: "这一天没有归档的摘要。",
	intro: (topic, count) =>
		`这一天被最多来源报道的 ${count} 条${topic}新闻，每条附它所依据的报道。`,
	newer: "后一天",
	older: "前一天",
	sourcesOf: "来源",
	title: (topic, day) => `${topic}摘要 · ${day}`,
};

const ZH_HANT: Strings = {
	archive: (topic) => `${topic}摘要歸檔`,
	back: (topic) => `今天的${topic}頁面`,
	description: (topic, day) =>
		`${day} 被最多來源報導的${topic}新聞，每條附原始報導連結。`,
	empty: "這一天沒有歸檔的摘要。",
	intro: (topic, count) =>
		`這一天被最多來源報導的 ${count} 條${topic}新聞，每條附它所依據的報導。`,
	newer: "後一天",
	older: "前一天",
	sourcesOf: "來源",
	title: (topic, day) => `${topic}摘要 · ${day}`,
};

const STRINGS: Partial<Record<Locale, Strings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

function getStrings(locale: Locale): Strings {
	return STRINGS[locale] ?? EN;
}

function topicLabel(topic: string, locale: Locale): string {
	const key = `topic.${topic}` as TranslationKey;
	const label = translate(locale, key);
	return label === key ? topic : label;
}

function describe(entries: readonly ArchivedDigestEntry[]): string {
	let text = "";
	for (const entry of entries) {
		const next = text ? `${text} · ${entry.takeaway}` : entry.takeaway;
		if (next.length > DESCRIPTION_LIMIT) {
			break;
		}
		text = next;
	}
	return text;
}

function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(WWW_PREFIX_RE, "");
	} catch {
		return url;
	}
}

export const Route = createFileRoute("/{-$locale}/trends/$topic/$day")({
	component: ArchiveRoute,
	loader: async ({ context, params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
		if (!DAY_RE.test(params.day)) {
			throw notFound();
		}
		const locale = resolveLocale(params.locale);
		const digestOptions = archivedDigestQueryOptions(
			params.topic,
			params.day,
			locale
		);
		const daysOptions = digestDaysQueryOptions(params.topic, locale);
		if (import.meta.env.SSR) {
			// The archive index says which languages have this day, so the page
			// can name its other editions.
			const [digest, days, archiveIndex] = await Promise.all([
				readApiJsonForSsr<ArchivedDigestData>(
					`/api/trends/${encodeURIComponent(params.topic)}/digest/${params.day}?lang=${locale}`
				),
				readApiJsonForSsr<{ days?: string[] }>(
					`/api/trends/${encodeURIComponent(params.topic)}/digest-days?lang=${locale}`
				),
				readApiJsonForSsr<unknown>("/api/archive/index"),
			]);
			if (digest.status === 404) {
				throw notFound();
			}
			if (digest.data) {
				context.queryClient.setQueryData(digestOptions.queryKey, digest.data);
			}
			if (days.data?.days) {
				context.queryClient.setQueryData(daysOptions.queryKey, days.data.days);
			}
			const editions = isArchiveIndex(archiveIndex.data)
				? archiveDayEditions(
						archiveIndex.data,
						params.topic,
						params.day,
						locale
					).filter(isLocale)
				: [];
			return { digest: digest.data, editions };
		}
		try {
			const digest = await context.queryClient.ensureQueryData(digestOptions);
			return { digest, editions: [] as Locale[] };
		} catch (error) {
			if (
				error instanceof ArchivedDigestNotFoundError ||
				error instanceof TrendsTopicNotFoundError
			) {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ loaderData, params }) => {
		const locale = resolveLocale(params.locale);
		const strings = getStrings(locale);
		const label = topicLabel(params.topic, locale);
		const entries = loaderData?.digest?.entries ?? [];
		const summary = describe(entries);
		const title = strings.title(label, params.day);
		const head = buildSeo({
			// A day may exist in one language and not another: only the
			// editions that exist are named.
			alternateLocales: loaderData?.editions ?? [],
			description: summary || strings.description(label, params.day),
			locale,
			path: `/trends/${params.topic}/${params.day}`,
			title,
			type: "article",
		});
		const url = (path: string) =>
			`${SITE_URL}${localizedPath(path, locale) ?? path}`;
		const pageUrl = url(`/trends/${params.topic}/${params.day}`);
		const list = digestItemList({ entries, name: title, url: pageUrl });
		return {
			...head,
			scripts: [
				breadcrumbList([
					{ name: "OpenTrends", url: url("/") },
					{ name: label, url: url(`/trends/${params.topic}`) },
					{
						name: strings.archive(label),
						url: url(`/trends/${params.topic}/archive`),
					},
					{ name: params.day, url: pageUrl },
				]),
				...(list ? [list] : []),
			],
		};
	},
});

function DayNav({
	day,
	days,
	locale,
	strings,
	topic,
}: {
	day: string;
	days: readonly string[];
	locale: Locale;
	strings: Strings;
	topic: string;
}) {
	// Days are newest first.
	const index = days.indexOf(day);
	const newer = index > 0 ? days[index - 1] : undefined;
	const older = index >= 0 ? days[index + 1] : undefined;
	const linkClass = "text-[12px] text-[var(--accent-blue)] hover:underline";
	if (!(newer || older)) {
		return null;
	}
	return (
		<nav className="flex items-center justify-between gap-4 text-[12px] text-[var(--text-muted)]">
			<span>
				{older ? (
					<Link
						className={linkClass}
						params={{ day: older, locale: localePathParam(locale), topic }}
						to="/{-$locale}/trends/$topic/$day"
					>
						← {strings.older} · {older}
					</Link>
				) : null}
			</span>
			<span>
				{newer ? (
					<Link
						className={linkClass}
						params={{ day: newer, locale: localePathParam(locale), topic }}
						to="/{-$locale}/trends/$topic/$day"
					>
						{strings.newer} · {newer} →
					</Link>
				) : null}
			</span>
		</nav>
	);
}

function Entry({
	entry,
	strings,
}: {
	entry: ArchivedDigestEntry;
	strings: Strings;
}) {
	return (
		<li className="py-3">
			<p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
				<strong className="font-semibold">{entry.takeaway}</strong>
				{entry.reason ? (
					<span className="text-[var(--text-secondary)]">
						{" "}
						— {entry.reason}
					</span>
				) : null}
			</p>
			{entry.citations.length > 0 ? (
				<p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[var(--text-muted)]">
					<span>{strings.sourcesOf}:</span>
					{entry.citations.map((citation) => (
						<a
							className="text-[var(--accent-blue)] hover:underline"
							href={citation.url}
							key={`${citation.n}:${citation.url}`}
							rel="noopener noreferrer"
							target="_blank"
						>
							[{citation.n}] {hostOf(citation.url)}
						</a>
					))}
				</p>
			) : null}
		</li>
	);
}

function ArchiveRoute() {
	const params = Route.useParams();
	const locale = resolveLocale(params.locale);
	const strings = getStrings(locale);
	const label = topicLabel(params.topic, locale);
	const digest = useQuery(
		archivedDigestQueryOptions(params.topic, params.day, locale)
	);
	const days = useQuery(digestDaysQueryOptions(params.topic, locale));
	const entries = digest.data?.entries ?? [];

	return (
		<div className="min-w-0 flex-1 bg-[var(--surface-sidebar)] text-[var(--text-primary)]">
			<article className="mx-auto w-full max-w-3xl space-y-5 p-6 sm:p-10">
				<header className="space-y-2">
					<p className="text-[12px] text-[var(--text-muted)]">
						<Link
							className="hover:underline"
							params={{ locale: localePathParam(locale), topic: params.topic }}
							to="/{-$locale}/trends/$topic"
						>
							{strings.back(label)}
						</Link>
						{" · "}
						<Link
							className="hover:underline"
							params={{ locale: localePathParam(locale), topic: params.topic }}
							to="/{-$locale}/trends/$topic/archive"
						>
							{strings.archive(label)}
						</Link>
					</p>
					<h1 className="font-bold text-2xl text-[var(--text-heading)] tracking-tight">
						{strings.title(label, params.day)}
					</h1>
					{entries.length > 0 ? (
						<p className="text-[13px] text-[var(--text-secondary)]">
							{strings.intro(label, entries.length)}
						</p>
					) : null}
				</header>

				{entries.length > 0 ? (
					<ol className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] bg-[var(--surface-card)] px-5">
						{entries.map((entry) => (
							<Entry entry={entry} key={entry.n} strings={strings} />
						))}
					</ol>
				) : (
					<p className="text-[13px] text-[var(--text-secondary)]">
						{digest.isPending ? "…" : strings.empty}
					</p>
				)}

				<DayNav
					day={params.day}
					days={days.data ?? []}
					locale={locale}
					strings={strings}
					topic={params.topic}
				/>
			</article>
		</div>
	);
}
