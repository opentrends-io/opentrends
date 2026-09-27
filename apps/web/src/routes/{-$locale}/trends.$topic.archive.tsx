/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming requires the $topic segment. */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { digestDaysQueryOptions } from "@/components/trends/trends-query";
import {
	isLocale,
	type Locale,
	localePathParam,
	resolveLocale,
	type TranslationKey,
	translate,
} from "@/lib/i18n";
import { buildSeo } from "@/lib/seo";

// Every archived day of a topic's digest, by month: the index that ties
// the day pages together.

interface Strings {
	description: (topic: string) => string;
	empty: string;
	intro: (topic: string) => string;
	live: (topic: string) => string;
	title: (topic: string) => string;
}

const EN: Strings = {
	description: (topic) =>
		`Every day's ${topic} digest, kept for three months: the ten stories the most sources reported, with links to the reporting.`,
	empty: "Nothing archived yet; the first digest is kept at the end of today.",
	intro: (topic) =>
		`One page per day: the ten ${topic} stories the most sources reported, with the reports each was drawn from. Kept for three months.`,
	live: (topic) => `Today's ${topic} page`,
	title: (topic) => `${topic} digest archive`,
};

const ZH: Strings = {
	description: (topic) =>
		`${topic}每日摘要归档，保留三个月：被最多来源报道的十条新闻，附原始报道链接。`,
	empty: "还没有归档；今天的摘要会在今天结束时保存。",
	intro: (topic) =>
		`每天一页：被最多来源报道的十条${topic}新闻，每条附它所依据的报道。保留三个月。`,
	live: (topic) => `今天的${topic}页面`,
	title: (topic) => `${topic}摘要归档`,
};

const ZH_HANT: Strings = {
	description: (topic) =>
		`${topic}每日摘要歸檔，保留三個月：被最多來源報導的十條新聞，附原始報導連結。`,
	empty: "還沒有歸檔；今天的摘要會在今天結束時保存。",
	intro: (topic) =>
		`每天一頁：被最多來源報導的十條${topic}新聞，每條附它所依據的報導。保留三個月。`,
	live: (topic) => `今天的${topic}頁面`,
	title: (topic) => `${topic}摘要歸檔`,
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

function byMonth(days: readonly string[]): [string, string[]][] {
	const groups = new Map<string, string[]>();
	for (const day of days) {
		const month = day.slice(0, 7);
		groups.set(month, [...(groups.get(month) ?? []), day]);
	}
	return [...groups.entries()];
}

export const Route = createFileRoute("/{-$locale}/trends/$topic/archive")({
	component: ArchiveIndexRoute,
	loader: async ({ context, params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
		const locale = resolveLocale(params.locale);
		const options = digestDaysQueryOptions(params.topic, locale);
		if (import.meta.env.SSR) {
			const days = await readApiJsonForSsr<{ days?: string[] }>(
				`/api/trends/${encodeURIComponent(params.topic)}/digest-days?lang=${locale}`
			);
			if (days.data?.days) {
				context.queryClient.setQueryData(options.queryKey, days.data.days);
			}
			return;
		}
		await context.queryClient.ensureQueryData(options);
	},
	head: ({ params }) => {
		const locale = resolveLocale(params.locale);
		const strings = getStrings(locale);
		const label = topicLabel(params.topic, locale);
		return buildSeo({
			description: strings.description(label),
			locale,
			path: `/trends/${params.topic}/archive`,
			title: strings.title(label),
		});
	},
});

function ArchiveIndexRoute() {
	const params = Route.useParams();
	const locale = resolveLocale(params.locale);
	const strings = getStrings(locale);
	const label = topicLabel(params.topic, locale);
	const days = useQuery(digestDaysQueryOptions(params.topic, locale));
	const months = byMonth(days.data ?? []);

	return (
		<div className="min-w-0 flex-1 bg-[var(--surface-sidebar)] text-[var(--text-primary)]">
			<div className="mx-auto w-full max-w-3xl space-y-5 p-6 sm:p-10">
				<header className="space-y-2">
					<p className="text-[12px] text-[var(--text-muted)]">
						<Link
							className="hover:underline"
							params={{ locale: localePathParam(locale), topic: params.topic }}
							to="/{-$locale}/trends/$topic"
						>
							{strings.live(label)}
						</Link>
					</p>
					<h1 className="font-bold text-2xl text-[var(--text-heading)] tracking-tight">
						{strings.title(label)}
					</h1>
					<p className="text-[13px] text-[var(--text-secondary)]">
						{strings.intro(label)}
					</p>
				</header>
				{months.length === 0 ? (
					<p className="text-[13px] text-[var(--text-secondary)]">
						{days.isPending ? "…" : strings.empty}
					</p>
				) : (
					months.map(([month, list]) => (
						<section className="space-y-1.5" key={month}>
							<h2 className="font-semibold text-[12px] text-[var(--text-muted)] tabular-nums">
								{month}
							</h2>
							<ul className="flex flex-wrap gap-1.5">
								{list.map((day) => (
									<li key={day}>
										<Link
											className="inline-flex h-7 items-center border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 text-[12px] text-[var(--text-secondary)] tabular-nums transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
											params={{
												day,
												locale: localePathParam(locale),
												topic: params.topic,
											}}
											to="/{-$locale}/trends/$topic/$day"
										>
											{day}
										</Link>
									</li>
								))}
							</ul>
						</section>
					))
				)}
			</div>
		</div>
	);
}
