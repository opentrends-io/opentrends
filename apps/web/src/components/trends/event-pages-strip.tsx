import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { localePathParam, useLocale } from "@/lib/i18n";

import { eventPagesQueryOptions } from "./trends-query";

// The published event pages, above the live event stream: the hub's links to
// them are server-rendered, so every page has a crawlable way in.
const STRIP_LIMIT = 12;

export function EventPagesStrip() {
	const locale = useLocale();
	const edition = locale === "zh" ? "zh" : "en";
	const pages = (useQuery(eventPagesQueryOptions).data ?? []).slice(
		0,
		STRIP_LIMIT
	);
	if (pages.length === 0) {
		return null;
	}
	// Event pages exist in English and Chinese; other languages link to the
	// English edition.
	const localeParam = edition === "zh" ? localePathParam("zh") : undefined;
	return (
		<section className="mb-4 border border-[var(--border-default)] bg-[var(--surface-card)]">
			<h2 className="border-[var(--border-subtle)] border-b px-4 py-2 font-semibold text-[12px] text-[var(--text-muted)]">
				{edition === "zh" ? "事件专题" : "Event pages"}
			</h2>
			<ul className="grid sm:grid-cols-2">
				{pages.map((page) => (
					<li
						className="border-[var(--border-subtle)] border-t px-4 py-3 first:border-t-0 sm:odd:border-r sm:[&:nth-child(2)]:border-t-0"
						key={page.slug}
					>
						<Link
							className="font-medium text-[13px] text-[var(--text-primary)] hover:underline"
							params={{ locale: localeParam, slug: page.slug }}
							to="/{-$locale}/events/$slug"
						>
							{page.title[edition]}
						</Link>
						<p className="mt-1 line-clamp-2 text-[12px] text-[var(--text-secondary)]">
							{page.description[edition]}
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}
