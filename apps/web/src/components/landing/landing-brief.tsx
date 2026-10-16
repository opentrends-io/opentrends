import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

import { SourceFavicon } from "@/components/trends/source-favicon";
import type { ArchivedDigestEntry } from "@/components/trends/types";
import { useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { lineTopic, type WallSource } from "./landing-model";
import {
	AppWindow,
	CONTAINER_CLASS,
	LiveDot,
	type LocaleParam,
	SectionHeader,
	TEXT_LINK_CLASS,
	TopicTag,
} from "./landing-ui";

// Highlight one: hundreds of sources in, ten cited lines out. Today's real
// featured brief in the app's own frame, and the sources it reads.

const MAX_CITATIONS_SHOWN = 2;
const WALL_ROWS = 3;
const WALL_ROW_DURATIONS_S = [110, 140, 125];

function BriefLine({ line }: { line: ArchivedDigestEntry }) {
	const t = useT();
	const topic = lineTopic(line);
	const citations = (line.citations ?? []).slice(0, MAX_CITATIONS_SHOWN);
	return (
		<li className="flex gap-3 px-4 py-2.5 sm:px-5">
			<span className="w-5 shrink-0 pt-px text-right text-[12px] text-[var(--stage-faint)] tabular-nums">
				{line.n}.
			</span>
			<div className="min-w-0 flex-1 text-[13px] leading-snug">
				{topic ? (
					<span className="mr-2 inline-flex translate-y-[-1px] align-middle">
						<TopicTag label={t(`topic.${topic}`)} topic={topic} />
					</span>
				) : null}
				<span className="font-semibold text-[var(--stage-text)]">
					{line.takeaway}
				</span>
				{line.reason ? (
					<span className="text-[var(--stage-muted)]"> — {line.reason}</span>
				) : null}
				{citations.map((citation) => (
					<span
						className="ml-1.5 inline-flex h-4 translate-y-[-1px] items-center rounded bg-[rgba(120,164,255,0.16)] px-1 align-middle text-[10px] text-[var(--stage-blue-soft)] tabular-nums"
						key={`${citation.n}-${citation.url}`}
					>
						{citation.n}
					</span>
				))}
			</div>
		</li>
	);
}

function BriefWindow({
	digest,
	localeParam,
	strings,
}: {
	digest: ArchivedDigestEntry[] | null;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const t = useT();
	return (
		<AppWindow>
			<div className="flex items-center justify-between gap-3 border-[var(--stage-line)] border-b px-4 py-3 sm:px-5">
				<p className="min-w-0 truncate text-[12px] text-[var(--stage-muted)]">
					<span className="font-semibold text-[var(--stage-text)]">
						{t("topic.featured")}
					</span>
					<span className="mx-1.5 text-[var(--stage-faint)]">·</span>
					{strings.briefWindow}
				</p>
				<LiveDot label={strings.live} />
			</div>
			{digest ? (
				<ol className="py-1.5">
					{digest.map((line) => (
						<BriefLine key={line.n} line={line} />
					))}
				</ol>
			) : (
				<p className="px-5 py-10 text-[14px] text-[var(--stage-muted)] leading-relaxed">
					{strings.briefEmpty}
				</p>
			)}
			<div className="border-[var(--stage-line)] border-t px-4 py-3 sm:px-5">
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

function Funnel({
	sourceCount,
	strings,
}: {
	sourceCount: number | null;
	strings: LandingStrings;
}) {
	if (!sourceCount) {
		return null;
	}
	return (
		<div className="mt-10 flex items-end gap-5 sm:gap-7">
			<div>
				<p className="landing-display font-extrabold text-[56px] text-[var(--stage-muted)] tabular-nums leading-none sm:text-[72px]">
					{sourceCount}
				</p>
				<p className="landing-mono mt-2 text-[11px] text-[var(--stage-faint)]">
					{strings.funnelFrom}
				</p>
			</div>
			<ArrowRight
				aria-hidden
				className="mb-9 size-7 shrink-0 text-[var(--stage-blue-soft)] sm:size-9"
			/>
			<div>
				<p className="landing-display landing-gradient-text font-extrabold text-[56px] tabular-nums leading-none sm:text-[72px]">
					10
				</p>
				<p className="landing-mono mt-2 text-[11px] text-[var(--stage-faint)]">
					{strings.funnelTo}
				</p>
			</div>
		</div>
	);
}

function SourceWall({
	caption,
	sources,
}: {
	caption: string;
	sources: WallSource[];
}) {
	if (sources.length === 0) {
		return null;
	}
	const perRow = Math.ceil(sources.length / WALL_ROWS);
	const rows = Array.from({ length: WALL_ROWS }, (_, index) =>
		sources.slice(index * perRow, (index + 1) * perRow)
	).filter((row) => row.length > 0);
	return (
		<figure className="mt-20">
			<div
				aria-hidden
				className="flex flex-col gap-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
			>
				{rows.map((row, index) => (
					<div
						className="landing-marquee flex w-max gap-3"
						data-reverse={index % 2 === 1 ? "" : undefined}
						// biome-ignore lint/suspicious/noArrayIndexKey: the rows are a fixed split of one list.
						key={index}
						style={
							{
								"--marquee-duration": `${WALL_ROW_DURATIONS_S[index % WALL_ROW_DURATIONS_S.length]}s`,
							} as CSSProperties
						}
					>
						{[...row, ...row].map((source, tileIndex) => (
							<span
								className="inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border border-[var(--stage-line)] bg-white/[0.03] pr-4 pl-2.5 text-[13px] text-[var(--stage-muted)]"
								// biome-ignore lint/suspicious/noArrayIndexKey: each row is drawn twice for a seamless loop, so names repeat.
								key={tileIndex}
							>
								<span className="inline-flex size-6 items-center justify-center rounded-full bg-white/90">
									<SourceFavicon
										className="size-4 rounded-none"
										homeUrl={source.homeUrl}
									/>
								</span>
								{source.name}
							</span>
						))}
					</div>
				))}
			</div>
			<figcaption className="mt-6 text-center text-[13px] text-[var(--stage-faint)]">
				{caption}
			</figcaption>
		</figure>
	);
}

export function LandingBrief({
	digest,
	localeParam,
	sourceCount,
	strings,
	wall,
}: {
	digest: ArchivedDigestEntry[] | null;
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
	wall: WallSource[];
}) {
	return (
		<section className="overflow-hidden py-24 sm:py-32">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16`}
			>
				<div>
					<SectionHeader
						body={strings.briefBody(sourceCount)}
						kicker={strings.briefKicker}
						title={strings.briefTitle}
					/>
					<Funnel sourceCount={sourceCount} strings={strings} />
				</div>
				<BriefWindow
					digest={digest}
					localeParam={localeParam}
					strings={strings}
				/>
			</div>
			<SourceWall caption={strings.wallCaption} sources={wall} />
		</section>
	);
}
