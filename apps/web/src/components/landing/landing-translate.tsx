import { cn } from "@opentrends/ui/lib/utils";
import { Languages } from "lucide-react";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { eventExample, translationExamples } from "./landing-examples";
import {
	CONTAINER_CLASS,
	PANEL_CLASS,
	SectionHeader,
	SourceBadge,
} from "./landing-ui";

// Highlight two: one headline read in every language the product serves.
// It steps through them on its own until the reader picks one, and holds
// still for readers who asked for less motion.

const STEP_MS = 2200;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useAutoStep(
	count: number,
	paused: boolean
): [number, (i: number) => void] {
	const [index, setIndex] = useState(0);
	useEffect(() => {
		if (paused || window.matchMedia(REDUCED_MOTION_QUERY).matches) {
			return;
		}
		const timer = window.setInterval(
			() => setIndex((current) => (current + 1) % count),
			STEP_MS
		);
		return () => window.clearInterval(timer);
	}, [count, paused]);
	return [index, setIndex];
}

export function LandingTranslate({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const examples = translationExamples(locale);
	const outlets = eventExample(locale).outlets;
	const [picked, setPicked] = useState(false);
	const [index, setIndex] = useAutoStep(examples.length, picked);
	const current = examples[index] ?? examples[0];
	if (!current) {
		return null;
	}
	return (
		<section className="border-[var(--stage-line)] border-t py-24 sm:py-32">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16`}
			>
				<SectionHeader
					body={strings.translateBody}
					kicker={strings.translateKicker}
					title={strings.translateTitle}
				/>
				<div>
					<div
						className={cn(
							PANEL_CLASS,
							"relative overflow-hidden p-6 shadow-[0_0_80px_-10px_rgba(21,93,255,0.35)] sm:p-8"
						)}
					>
						<div className="flex items-center justify-between gap-3">
							<span className="inline-flex items-center gap-2 text-[13px] text-[var(--stage-muted)]">
								<span className="inline-flex h-6 min-w-8 items-center justify-center rounded-md bg-[rgba(120,164,255,0.16)] px-1.5 font-semibold text-[12px] text-[var(--stage-blue-soft)]">
									{current.code}
								</span>
								{current.label}
							</span>
							<span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--stage-faint)]">
								<Languages aria-hidden className="size-3.5" />
								{strings.translateBadge}
							</span>
						</div>
						<p
							aria-live={picked ? "polite" : "off"}
							className="landing-display mt-8 min-h-[2.3em] font-bold text-[28px] leading-[1.15] sm:text-[36px]"
							key={current.code}
						>
							<span className="fade-in slide-in-from-bottom-2 inline-block animate-in duration-500 motion-reduce:animate-none">
								{current.text}
							</span>
						</p>
						<div className="mt-8 flex items-center gap-2 text-[12px] text-[var(--stage-faint)]">
							<span className="flex -space-x-1.5">
								{outlets.map((outlet) => (
									<SourceBadge
										badge={outlet.badge}
										className="ring-2 ring-[var(--stage-panel)]"
										key={outlet.source}
									/>
								))}
							</span>
							{strings.eventsSources(outlets.length)}
						</div>
					</div>
					<fieldset className="mt-6 flex flex-wrap justify-center gap-1">
						<legend className="sr-only">{strings.translateLanguages}</legend>
						{examples.map((example, exampleIndex) => (
							<button
								aria-pressed={exampleIndex === index}
								className="h-8 rounded-full border border-transparent px-2.5 text-[12px] text-[var(--stage-faint)] outline-none transition-colors hover:text-[var(--stage-text)] focus-visible:outline-2 focus-visible:outline-[var(--stage-blue-soft)] aria-pressed:border-[var(--stage-line-strong)] aria-pressed:bg-white/[0.06] aria-pressed:text-[var(--stage-text)]"
								key={example.code}
								onClick={() => {
									setPicked(true);
									setIndex(exampleIndex);
								}}
								type="button"
							>
								{example.label}
							</button>
						))}
					</fieldset>
				</div>
			</div>
		</section>
	);
}
