import { Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import type { CSSProperties } from "react";

import { GITHUB_REPOSITORY_URL } from "@/functions/get-github-repository-stats";

import type { LandingStrings } from "./landing-copy";
import { FLOOD_ROWS, type FloodHeadline } from "./landing-flood";
import {
	CONTAINER_CLASS,
	LiveDot,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SECONDARY_BUTTON_CLASS,
} from "./landing-ui";

// The film's opening, held still: more headlines in more languages than
// anyone can read, drifting behind the promise that OpenTrends reads them
// for you.

const LANGUAGE_CODES = ["EN", "简", "繁", "RU", "DE", "FR", "ES", "PT"];
const ROW_DURATIONS_S = [120, 150, 135, 165];

function FloodCard({ headline }: { headline: FloodHeadline }) {
	return (
		<span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--stage-line)] bg-white/[0.03] px-3 py-2 text-[12px] text-[var(--stage-muted)]">
			<span
				className="inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] px-0.5 font-bold text-[8px] text-white"
				style={{ backgroundColor: headline.badge.bg }}
			>
				{headline.badge.t}
			</span>
			<span className="whitespace-nowrap">{headline.title}</span>
		</span>
	);
}

function FloodRow({
	index,
	row,
}: {
	index: number;
	row: readonly FloodHeadline[];
}) {
	return (
		<div
			className="landing-marquee flex w-max gap-3"
			data-reverse={index % 2 === 1 ? "" : undefined}
			style={
				{
					"--marquee-duration": `${ROW_DURATIONS_S[index % ROW_DURATIONS_S.length]}s`,
				} as CSSProperties
			}
		>
			{[...row, ...row].map((headline, cardIndex) => (
				<FloodCard
					headline={headline}
					// biome-ignore lint/suspicious/noArrayIndexKey: each row is drawn twice for a seamless loop, so titles repeat.
					key={cardIndex}
				/>
			))}
		</div>
	);
}

// Half the rows along the top, half along the bottom, so the middle stays
// clear for the headline.
function Flood() {
	const half = Math.ceil(FLOOD_ROWS.length / 2);
	const groups = [FLOOD_ROWS.slice(0, half), FLOOD_ROWS.slice(half)];
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden py-12 opacity-70 [mask-image:radial-gradient(ellipse_60%_48%_at_50%_50%,transparent_40%,black_85%)]"
		>
			{groups.map((group, groupIndex) => (
				<div
					className="flex flex-col gap-3"
					// biome-ignore lint/suspicious/noArrayIndexKey: two fixed groups.
					key={groupIndex}
				>
					{group.map((row, rowIndex) => (
						<FloodRow
							index={groupIndex * half + rowIndex}
							// biome-ignore lint/suspicious/noArrayIndexKey: the rows are a fixed, never-reordered list.
							key={rowIndex}
							row={row}
						/>
					))}
				</div>
			))}
		</div>
	);
}

export function LandingHero({
	localeParam,
	sourceCount,
	strings,
}: {
	localeParam: LocaleParam;
	sourceCount: number | null;
	strings: LandingStrings;
}) {
	return (
		<section className="landing-glow relative isolate overflow-hidden border-[var(--stage-line)] border-b">
			<Flood />
			<div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4 sm:px-6">
				<LiveDot label={strings.live} />
				<span
					aria-hidden
					className="landing-mono hidden gap-2.5 text-[10px] text-[var(--stage-faint)] sm:flex"
				>
					{LANGUAGE_CODES.map((code, index) => (
						<span
							className={
								index === 0 ? "text-[var(--stage-blue-soft)]" : undefined
							}
							key={code}
						>
							{code}
						</span>
					))}
				</span>
			</div>
			<div
				className={`${CONTAINER_CLASS} relative z-10 flex min-h-[min(88svh,820px)] flex-col items-center justify-center py-24 text-center`}
			>
				<img
					alt=""
					className="size-14 drop-shadow-[0_0_28px_rgba(21,93,255,0.85)] sm:size-16"
					height={64}
					src="/logo-mark.svg"
					width={64}
				/>
				<h1 className="landing-display mt-8 font-extrabold text-[48px] leading-[1.02] sm:text-[72px] lg:text-[88px]">
					<span className="block">{strings.heroTitle[0]}</span>
					<span className="landing-gradient-text block pb-2">
						{strings.heroTitle[1]}
					</span>
				</h1>
				<p className="mt-6 max-w-2xl text-pretty text-[16px] text-[var(--stage-muted)] leading-relaxed sm:text-[18px]">
					{strings.heroBody(sourceCount)}
				</p>
				<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
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
						href={GITHUB_REPOSITORY_URL}
						rel="noopener"
						target="_blank"
					>
						<Star aria-hidden />
						{strings.ctaGithub}
					</a>
				</div>
				<ul className="landing-mono mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] text-[var(--stage-faint)]">
					{strings.stats(sourceCount).map((stat, index) => (
						<li className="flex items-center gap-3" key={stat}>
							{index > 0 ? (
								<span
									aria-hidden
									className="size-1 rounded-full bg-[var(--stage-line-strong)]"
								/>
							) : null}
							{stat}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
