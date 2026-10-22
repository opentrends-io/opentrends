import { cn } from "@opentrends/ui/lib/utils";
import { Languages } from "lucide-react";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { TRANSLATION_ORIGINAL, translationExamples } from "./landing-examples";
import {
	AppWindow,
	CONTAINER_CLASS,
	SectionHeader,
	SourceLogo,
} from "./landing-ui";

// One news item the way the product shows it: the headline in the reading
// language, the original underneath, and the language it is being read in
// switchable below. Starts in the reader's own language.

export function LandingLanguages({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const examples = translationExamples(locale);
	const [index, setIndex] = useState(0);
	const current = examples[index] ?? examples[0];
	if (!current) {
		return null;
	}
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16`}
			>
				<SectionHeader
					body={strings.languagesBody}
					kicker={strings.languagesKicker}
					title={strings.languagesTitle}
				/>
				<div>
					<AppWindow>
						<div className="flex items-center gap-2 border-[var(--border-default)] border-b px-4 py-2.5 text-[12px]">
							<span className="inline-flex size-5 items-center justify-center border border-[var(--border-default)] bg-white">
								<SourceLogo
									className="size-3.5"
									size={14}
									source={{
										homeUrl: TRANSLATION_ORIGINAL.homeUrl,
										id: "the-verge",
										kind: "press",
										name: TRANSLATION_ORIGINAL.source,
										topics: [],
									}}
								/>
							</span>
							<span className="font-semibold text-[var(--text-primary)]">
								{TRANSLATION_ORIGINAL.source}
							</span>
							<span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
								<Languages aria-hidden className="size-3.5" />
								{current.label}
							</span>
						</div>
						<div className="px-4 py-5 sm:px-5">
							<p
								className="font-semibold text-[18px] text-[var(--text-primary)] leading-snug sm:text-[20px]"
								key={current.code}
							>
								{current.text}
							</p>
							<p className="mt-3 flex gap-2 text-[12px] text-[var(--text-muted)] leading-snug">
								<span className="shrink-0 font-medium">
									{strings.languagesOriginalLabel}
								</span>
								<span className="min-w-0">{TRANSLATION_ORIGINAL.title}</span>
							</p>
						</div>
						<fieldset className="flex flex-wrap gap-1 border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] px-3 py-2.5">
							<legend className="sr-only">{strings.languagesPick}</legend>
							{examples.map((example, exampleIndex) => (
								<button
									aria-pressed={exampleIndex === index}
									className={cn(
										"h-7 border px-2.5 text-[12px] transition-colors",
										exampleIndex === index
											? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--text-inverse)]"
											: "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
									)}
									key={example.code}
									onClick={() => setIndex(exampleIndex)}
									type="button"
								>
									{example.label}
								</button>
							))}
						</fieldset>
					</AppWindow>
					<p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
						<span>{strings.languagesOriginal}</span>
						<span className="text-[11px]">
							{strings.eventsExampleNote("2026-09-29")}
						</span>
					</p>
				</div>
			</div>
		</section>
	);
}
