import { env } from "@opentrends/env/web";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Rss } from "lucide-react";

import { formatRelativeTime } from "@/components/trends/relative-time";
import type { ArchivedDigestEntry } from "@/components/trends/types";
import { useT } from "@/lib/i18n";
import { useIsReturningReader } from "@/lib/returning-reader";

import type { LandingStrings } from "./landing-copy";
import { type LandingBrief, lineTopic } from "./landing-model";
import {
	AppWindow,
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SECONDARY_BUTTON_CLASS,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// The first screen: what this is, in one sentence, the three things that
// set it apart, and the product itself underneath. The brief preview is
// today's real featured brief, rendered on the server so it is in the
// first HTML.

const MAX_CITATIONS_SHOWN = 2;

function BriefLine({ line }: { line: ArchivedDigestEntry }) {
	const t = useT();
	const topic = lineTopic(line);
	const citations = (line.citations ?? []).slice(0, MAX_CITATIONS_SHOWN);
	return (
		<li className="flex gap-3 px-4 py-3 sm:px-5">
			<span className="w-4 shrink-0 text-right text-[12px] text-[var(--text-muted)] tabular-nums leading-[1.5]">
				{line.n}
			</span>
			<p className="min-w-0 flex-1 text-[13px] leading-[1.5]">
				{topic ? (
					<span className="mr-1.5 inline-flex translate-y-[-1px] align-middle">
						<TopicTag label={t(`topic.${topic}`)} topic={topic} />
					</span>
				) : null}
				<span className="font-semibold text-[var(--text-primary)]">
					{line.takeaway}
				</span>
				{line.reason ? (
					<span className="mt-0.5 block text-[var(--text-secondary)]">
						{line.reason}
					</span>
				) : null}
				{citations.map((citation) => (
					<a
						className="ml-1 inline-flex h-4 translate-y-[-1px] items-center bg-[var(--accent-blue-bg)] px-1 align-middle text-[10px] text-[var(--accent-blue)] tabular-nums no-underline hover:underline"
						href={citation.url}
						key={`${citation.n}-${citation.url}`}
						rel="noopener"
						target="_blank"
					>
						[{citation.n}]
					</a>
				))}
			</p>
		</li>
	);
}

function BriefPreview({
	digest,
	localeParam,
	strings,
}: {
	digest: LandingBrief | null;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	const updated = digest?.generatedAt
		? formatRelativeTime(digest.generatedAt, t)
		: null;
	return (
		<AppWindow>
			<div className="flex items-center justify-between gap-3 border-[var(--border-default)] border-b px-4 py-2.5 sm:px-5">
				<p className="min-w-0 truncate text-[12px] text-[var(--text-secondary)]">
					<span className="font-semibold text-[var(--text-primary)]">
						{t("topic.featured")}
					</span>
					<span className="mx-1.5 text-[var(--text-muted)]">·</span>
					{strings.briefLabel}
					<span className="hidden sm:inline">
						<span className="mx-1.5 text-[var(--text-muted)]">·</span>
						{strings.briefCited}
					</span>
				</p>
				<span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
					<span className="size-1.5 rounded-full bg-[var(--accent-green)]" />
					{updated ? strings.briefUpdated(updated) : strings.briefLive}
				</span>
			</div>
			{digest?.degraded ? (
				<p className="border-[var(--border-subtle)] border-b bg-[var(--accent-orange-light)] px-4 py-2 text-[12px] text-[var(--text-secondary)] sm:px-5">
					{strings.briefDegraded}
				</p>
			) : null}
			{digest ? (
				<ol className="divide-y divide-[var(--border-subtle)]">
					{digest.lines.map((line) => (
						<BriefLine key={line.n} line={line} />
					))}
				</ol>
			) : (
				<p className="px-5 py-8 text-[13px] text-[var(--text-secondary)] leading-relaxed">
					{strings.briefEmpty}
				</p>
			)}
			<div className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] px-4 py-2.5 sm:px-5">
				<Link
					className={TEXT_LINK_CLASS}
					params={{ locale: localeParam, topic: "featured" }}
					to="/{-$locale}/trends/$topic"
				>
					{strings.briefMore}
					<ArrowRight aria-hidden />
				</Link>
			</div>
		</AppWindow>
	);
}

function ContinueReading({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const returning = useIsReturningReader();
	if (!returning) {
		return null;
	}
	return (
		<Link
			className={TEXT_LINK_CLASS}
			params={{ locale: localeParam, topic: "featured" }}
			to="/{-$locale}/trends/$topic"
		>
			{strings.continueReading}
			<ArrowRight aria-hidden />
		</Link>
	);
}

export function LandingHero({
	digest,
	localeParam,
	sourceCount,
	strings,
}: {
	digest: LandingBrief | null;
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
}) {
	return (
		<section className="bg-[var(--surface-app)]">
			<div className={`${CONTAINER_CLASS} pt-16 pb-10 sm:pt-20`}>
				<p className="text-[12px] text-[var(--text-muted)]">
					{strings.eyebrow}
				</p>
				<h1 className="mt-4 max-w-3xl text-balance font-semibold text-[34px] text-[var(--text-heading)] leading-[1.12] tracking-tight sm:text-[46px]">
					{strings.heroTitle}
				</h1>
				<p className="mt-5 max-w-2xl text-[16px] text-[var(--text-secondary)] leading-relaxed sm:text-[18px]">
					{strings.heroBody(sourceCount)}
				</p>
				<ul className="mt-5 flex flex-col gap-2 text-[14px] text-[var(--text-primary)] sm:flex-row sm:flex-wrap sm:gap-x-6">
					{strings.heroPoints.map((point) => (
						<li className="flex items-start gap-2" key={point}>
							<Check
								aria-hidden
								className="mt-[3px] size-3.5 shrink-0 text-[var(--accent-blue)]"
							/>
							{point}
						</li>
					))}
				</ul>
				<div className="mt-7 flex flex-wrap items-center gap-3">
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "featured" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.ctaFeed}
						<ArrowRight aria-hidden />
					</Link>
					<a
						className={SECONDARY_BUTTON_CLASS}
						href={`${env.VITE_SERVER_URL}/api/trends/featured/summary.xml`}
					>
						<Rss aria-hidden />
						{strings.ctaRss}
					</a>
					<ContinueReading localeParam={localeParam} strings={strings} />
				</div>
			</div>
			<div className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)]">
				<div className={`${CONTAINER_CLASS} py-10 sm:py-14`}>
					<BriefPreview
						digest={digest}
						localeParam={localeParam}
						strings={strings}
					/>
					<p className="mt-5 text-center text-[12px] text-[var(--text-muted)]">
						{strings.mechanism(sourceCount)}
					</p>
				</div>
			</div>
		</section>
	);
}
