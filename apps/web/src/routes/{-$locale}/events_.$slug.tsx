/* biome-ignore lint/style/useFilenamingConvention: TanStack file-route naming requires the $slug segment. */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { EventPageNotFoundError } from "@/components/trends/load-trends";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { SourceFavicon } from "@/components/trends/source-favicon";
import {
	eventPageQueryOptions,
	eventPagesQueryOptions,
} from "@/components/trends/trends-query";
import type {
	EventPageLang,
	EventPageSource,
	EventPageSummary,
	EventPageView,
} from "@/components/trends/types";
import {
	type Locale,
	localePathParam,
	resolveLocale,
	type TranslationKey,
	translate,
} from "@/lib/i18n";
import { buildSeo, localizedPath, SITE_URL } from "@/lib/seo";
import { breadcrumbList, faqPage, newsArticle } from "@/lib/structured-data";

// One story, as several publishers told it: the page a reader lands on from
// search. Hand-picked and published through the admin API; the content is a
// snapshot, so the page stays after the underlying event has expired.

const EDITIONS: readonly EventPageLang[] = ["en", "zh"];
const RELATED_LIMIT = 5;
const PARAGRAPH_BREAK_RE = /\n{2,}/;

interface Strings {
	archive: string;
	coverage: (count: number) => string;
	divergence: string;
	events: string;
	faq: string;
	firstReported: string;
	moreEvents: string;
	related: string;
	summary: string;
	timeline: string;
	topic: string;
	updated: string;
}

const EN: Strings = {
	archive: "Digest archive",
	coverage: (count) => `All ${count} reports`,
	divergence: "How the coverage differs",
	events: "Events",
	faq: "Questions",
	firstReported: "First reported",
	moreEvents: "More event pages",
	related: "Related",
	summary: "What happened",
	timeline: "Timeline",
	topic: "Topic",
	updated: "Updated",
};

const ZH: Strings = {
	archive: "摘要归档",
	coverage: (count) => `全部 ${count} 篇报道`,
	divergence: "各家说法",
	events: "事件",
	faq: "常见问题",
	firstReported: "最早报道",
	moreEvents: "更多事件专题",
	related: "相关",
	summary: "发生了什么",
	timeline: "时间线",
	topic: "板块",
	updated: "更新于",
};

function editionOf(locale: Locale): EventPageLang | null {
	if (locale === "zh") {
		return "zh";
	}
	return locale === "en" ? "en" : null;
}

function topicLabel(topic: string, locale: Locale): string {
	const key = `topic.${topic}` as TranslationKey;
	const label = translate(locale, key);
	return label === key ? topic : label;
}

function formatDate(value: string, locale: Locale): string {
	return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(new Date(value));
}

export const Route = createFileRoute("/{-$locale}/events_/$slug")({
	component: EventPageRoute,
	loader: async ({ context, params }) => {
		const locale = resolveLocale(params.locale);
		if (!editionOf(locale) || (params.locale && params.locale !== locale)) {
			throw notFound();
		}
		const options = eventPageQueryOptions(params.slug);
		if (import.meta.env.SSR) {
			const [page, pages] = await Promise.all([
				readApiJsonForSsr<EventPageView>(
					`/api/event-pages/${encodeURIComponent(params.slug)}`
				),
				readApiJsonForSsr<{ pages?: EventPageSummary[] }>("/api/event-pages"),
			]);
			if (page.status === 404) {
				throw notFound();
			}
			if (page.data) {
				context.queryClient.setQueryData(options.queryKey, page.data);
			}
			if (pages.data?.pages) {
				context.queryClient.setQueryData(
					eventPagesQueryOptions.queryKey,
					pages.data.pages
				);
			}
			return { page: page.data };
		}
		try {
			return { page: await context.queryClient.ensureQueryData(options) };
		} catch (error) {
			if (error instanceof EventPageNotFoundError) {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ loaderData, params }) => {
		const locale = resolveLocale(params.locale);
		const edition = editionOf(locale) ?? "en";
		const page = loaderData?.page;
		const content = page?.content[edition];
		const path = `/events/${params.slug}`;
		const head = buildSeo({
			alternateLocales: page ? EDITIONS : [],
			description: content?.description,
			locale,
			// No loader data means the page was not found.
			noindex: !page,
			path,
			title: content?.title,
			type: "article",
		});
		if (!(page && content)) {
			return head;
		}
		const url = (target: string) =>
			`${SITE_URL}${localizedPath(target, locale) ?? target}`;
		const faq = faqPage(content.faq);
		return {
			...head,
			scripts: [
				newsArticle({
					citations: page.sources.map((source) => source.url),
					dateModified: page.updatedAt,
					datePublished: page.publishedAt,
					description: content.description,
					headline: content.title,
					inLanguage: edition === "zh" ? "zh-CN" : "en",
					url: url(path),
				}),
				breadcrumbList([
					{ name: "OpenTrends", url: url("/") },
					{
						name: edition === "zh" ? ZH.events : EN.events,
						url: url("/events"),
					},
					{ name: content.title, url: url(path) },
				]),
				...(faq ? [faq] : []),
			],
		};
	},
});

function Paragraphs({ text }: { text: string }) {
	return (
		<>
			{text
				.split(PARAGRAPH_BREAK_RE)
				.filter((part) => part.trim())
				.map((part) => (
					<p className="leading-relaxed" key={part.slice(0, 40)}>
						{part}
					</p>
				))}
		</>
	);
}

function SourceChips({
	sources,
	urls,
}: {
	sources: readonly EventPageSource[];
	urls: readonly string[];
}) {
	const cited = urls
		.map((url) => sources.find((source) => source.url === url))
		.filter((source): source is EventPageSource => Boolean(source));
	return (
		<span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
			{cited.map((source) => (
				<a
					className="inline-flex h-5 items-center gap-1 border border-[var(--border-subtle)] px-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
					href={source.url}
					key={source.url}
					rel="noopener noreferrer"
					target="_blank"
				>
					{source.publisherName}
				</a>
			))}
		</span>
	);
}

const SECTION_TITLE =
	"font-semibold text-[15px] text-[var(--text-heading)] tracking-tight";

function EventPageRoute() {
	const params = Route.useParams();
	const locale = resolveLocale(params.locale);
	const edition = editionOf(locale) ?? "en";
	const strings = edition === "zh" ? ZH : EN;
	const localeParam = localePathParam(locale);
	const page = useQuery(eventPageQueryOptions(params.slug)).data;
	const others = (useQuery(eventPagesQueryOptions).data ?? [])
		.filter((entry) => entry.slug !== params.slug)
		.slice(0, RELATED_LIMIT);
	if (!page) {
		return null;
	}
	const content = page.content[edition];
	const publishers = new Set(page.sources.map((source) => source.publisher));

	return (
		<div className="min-w-0 flex-1 bg-[var(--surface-sidebar)] text-[var(--text-primary)]">
			<article className="mx-auto w-full max-w-3xl space-y-8 p-6 text-[14px] sm:p-10">
				<header className="space-y-3">
					<p className="text-[12px] text-[var(--text-muted)]">
						<Link
							className="hover:underline"
							params={{ locale: localeParam }}
							to="/{-$locale}/events"
						>
							{strings.events}
						</Link>
					</p>
					<h1 className="font-bold text-2xl text-[var(--text-heading)] leading-snug tracking-tight">
						{content.title}
					</h1>
					<p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
						{content.headline}
					</p>
					<p className="text-[12px] text-[var(--text-muted)]">
						{strings.firstReported}{" "}
						<time dateTime={page.firstReportedAt}>
							{formatDate(page.firstReportedAt, locale)}
						</time>
						{" · "}
						{strings.updated}{" "}
						<time dateTime={page.updatedAt}>
							{formatDate(page.updatedAt, locale)}
						</time>
						{" · "}
						{[...publishers].length}{" "}
						{edition === "zh" ? "家媒体" : "publishers"}
					</p>
				</header>

				<section className="space-y-3">
					<h2 className={SECTION_TITLE}>{strings.summary}</h2>
					<Paragraphs text={content.summary} />
				</section>

				<section className="space-y-3">
					<h2 className={SECTION_TITLE}>{strings.timeline}</h2>
					<ol className="space-y-3 border-[var(--border-default)] border-l pl-4">
						{content.timeline.map((entry) => (
							<li
								className="leading-relaxed"
								key={`${entry.date}:${entry.text.slice(0, 24)}`}
							>
								<time
									className="mr-2 font-medium text-[12px] text-[var(--text-muted)] tabular-nums"
									dateTime={entry.date}
								>
									{entry.date}
								</time>
								{entry.text}
								<SourceChips sources={page.sources} urls={entry.sourceUrls} />
							</li>
						))}
					</ol>
				</section>

				<section className="space-y-3">
					<h2 className={SECTION_TITLE}>{strings.divergence}</h2>
					<Paragraphs text={content.divergence} />
				</section>

				<section className="space-y-3">
					<h2 className={SECTION_TITLE}>
						{strings.coverage(page.sources.length)}
					</h2>
					<ul className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] bg-[var(--surface-card)]">
						{page.sources.map((source) => (
							<li
								className="flex items-baseline gap-3 px-4 py-2.5"
								key={source.url}
							>
								<SourceFavicon homeUrl={source.url} />
								<span className="min-w-0 flex-1">
									<a
										className="text-[var(--text-primary)] hover:underline"
										href={source.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										{source.title}
									</a>
									<span className="ml-2 text-[12px] text-[var(--text-muted)]">
										<Link
											className="hover:underline"
											params={{ id: source.sourceId, locale: localeParam }}
											to="/{-$locale}/sources/$id"
										>
											{source.publisherName}
										</Link>
										{source.publishedAt ? (
											<>
												{" · "}
												<time dateTime={source.publishedAt}>
													{formatDate(source.publishedAt, locale)}
												</time>
											</>
										) : null}
									</span>
								</span>
							</li>
						))}
					</ul>
				</section>

				{content.faq.length > 0 ? (
					<section className="space-y-4">
						<h2 className={SECTION_TITLE}>{strings.faq}</h2>
						{content.faq.map((entry) => (
							<div className="space-y-1" key={entry.question}>
								<h3 className="font-semibold text-[14px] text-[var(--text-primary)]">
									{entry.question}
								</h3>
								<p className="text-[var(--text-secondary)] leading-relaxed">
									{entry.answer}
								</p>
							</div>
						))}
					</section>
				) : null}

				<section className="space-y-2 border-[var(--border-default)] border-t pt-5 text-[13px]">
					<h2 className="font-semibold text-[13px] text-[var(--text-muted)]">
						{strings.related}
					</h2>
					<p className="flex flex-wrap gap-x-4 gap-y-1">
						{page.topicIds.map((topic) => (
							<Link
								className="text-[var(--accent-blue)] hover:underline"
								key={topic}
								params={{ locale: localeParam, topic }}
								to="/{-$locale}/trends/$topic"
							>
								{strings.topic}: {topicLabel(topic, locale)}
							</Link>
						))}
						{page.topicIds[0] ? (
							<Link
								className="text-[var(--accent-blue)] hover:underline"
								params={{ locale: localeParam, topic: page.topicIds[0] }}
								to="/{-$locale}/trends/$topic/archive"
							>
								{strings.archive}
							</Link>
						) : null}
					</p>
					{others.length > 0 ? (
						<>
							<h2 className="pt-2 font-semibold text-[13px] text-[var(--text-muted)]">
								{strings.moreEvents}
							</h2>
							<ul className="space-y-1">
								{others.map((entry) => (
									<li key={entry.slug}>
										<Link
											className="text-[var(--accent-blue)] hover:underline"
											params={{ locale: localeParam, slug: entry.slug }}
											to="/{-$locale}/events/$slug"
										>
											{entry.title[edition]}
										</Link>
									</li>
								))}
							</ul>
						</>
					) : null}
				</section>
			</article>
		</div>
	);
}
