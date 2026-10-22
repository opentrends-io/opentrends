import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ChevronDown, Star } from "lucide-react";

import {
	GITHUB_REPOSITORY_URL,
	getGithubRepositoryStats,
} from "@/functions/get-github-repository-stats";

import type { LandingStrings } from "./landing-copy";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	Kicker,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SECONDARY_BUTTON_CLASS,
} from "./landing-ui";

// The page's last beats: the source code, the questions people ask, and
// one more door into the feed.

const GITHUB_STATS_STALE_MS = 10 * 60_000;

function formatStars(stars: number | null | undefined): string | null {
	if (typeof stars !== "number") {
		return null;
	}
	return new Intl.NumberFormat("en", {
		compactDisplay: "short",
		maximumFractionDigits: stars >= 1000 ? 1 : 0,
		notation: "compact",
	}).format(stars);
}

function OpenSource({ strings }: { strings: LandingStrings }) {
	// The same query the header runs, so the count is fetched once.
	const githubStats = useQuery({
		queryKey: ["github-repository-stats"],
		queryFn: () => getGithubRepositoryStats(),
		refetchOnWindowFocus: false,
		staleTime: GITHUB_STATS_STALE_MS,
	});
	const stars = formatStars(githubStats.data?.stars);
	return (
		<div>
			<Kicker>{strings.openKicker}</Kicker>
			<h2 className="mt-3 font-semibold text-[26px] text-[var(--text-heading)] leading-tight tracking-tight">
				{strings.openTitle}
			</h2>
			<p className="mt-3 text-[15px] text-[var(--text-secondary)] leading-relaxed">
				{strings.openBody}
			</p>
			<p className="mt-3 text-[15px] text-[var(--text-secondary)] leading-relaxed">
				{strings.openSelfHost}
			</p>
			<div className="mt-6 flex flex-wrap items-center gap-3">
				<a
					className={SECONDARY_BUTTON_CLASS}
					href={githubStats.data?.url ?? GITHUB_REPOSITORY_URL}
					rel="noopener"
					target="_blank"
				>
					GitHub
					<ArrowUpRight aria-hidden />
				</a>
				{stars ? (
					<span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
						<Star aria-hidden className="size-3.5" />
						{strings.openStars(stars)}
					</span>
				) : null}
			</div>
		</div>
	);
}

function Faq({ strings }: { strings: LandingStrings }) {
	return (
		<div>
			<Kicker>{strings.faqKicker}</Kicker>
			<h2 className="mt-3 font-semibold text-[26px] text-[var(--text-heading)] leading-tight tracking-tight">
				{strings.faqTitle}
			</h2>
			<dl
				className={`${CARD_CLASS} mt-6 divide-y divide-[var(--border-subtle)]`}
			>
				{strings.faq.map((entry) => (
					<details className="group/faq" key={entry.question}>
						<summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 font-medium text-[14px] text-[var(--text-primary)] hover:bg-[var(--state-hover-subtle)] [&::-webkit-details-marker]:hidden">
							<dt>{entry.question}</dt>
							<ChevronDown
								aria-hidden
								className="size-4 shrink-0 text-[var(--text-muted)] transition-transform group-open/faq:rotate-180"
							/>
						</summary>
						<dd className="px-4 pb-4 text-[14px] text-[var(--text-secondary)] leading-relaxed">
							{entry.answer}
						</dd>
					</details>
				))}
			</dl>
		</div>
	);
}

export function LandingClosing({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<>
			<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
				<div
					className={`${CONTAINER_CLASS} grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16`}
				>
					<OpenSource strings={strings} />
					<Faq strings={strings} />
				</div>
			</section>
			<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-20">
				<div
					className={`${CONTAINER_CLASS} flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between`}
				>
					<p className="max-w-xl text-balance font-semibold text-[24px] text-[var(--text-heading)] leading-tight tracking-tight">
						{strings.finalTitle}
					</p>
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "featured" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.ctaFeed}
						<ArrowRight aria-hidden />
					</Link>
				</div>
			</section>
		</>
	);
}
