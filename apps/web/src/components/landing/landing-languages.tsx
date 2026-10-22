import type { Locale } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { translationExamples } from "./landing-examples";
import { CARD_CLASS, CONTAINER_CLASS, SectionHeader } from "./landing-ui";

// One headline in all eight reading languages, to show the translation
// rather than describe it.

export function LandingLanguages({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const [own, ...rest] = translationExamples(locale);
	if (!own) {
		return null;
	}
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16`}
			>
				<SectionHeader
					body={strings.languagesBody}
					kicker={strings.languagesKicker}
					title={strings.languagesTitle}
				/>
				<div className={`${CARD_CLASS} p-5 sm:p-6`}>
					<p className="font-semibold text-[17px] text-[var(--text-primary)] leading-snug">
						<span className="mr-2 inline-flex h-[18px] items-center bg-[var(--accent-blue-bg)] px-1.5 align-middle font-medium text-[10px] text-[var(--accent-blue)]">
							{own.code}
						</span>
						{own.text}
					</p>
					<ul className="mt-4 space-y-1.5 border-[var(--border-subtle)] border-t pt-4">
						{rest.map((example) => (
							<li
								className="flex gap-3 text-[13px] text-[var(--text-secondary)] leading-snug"
								key={example.code}
							>
								<span className="w-6 shrink-0 text-[var(--text-muted)]">
									{example.code}
								</span>
								<span className="min-w-0">{example.text}</span>
							</li>
						))}
					</ul>
					<p className="mt-4 border-[var(--border-subtle)] border-t pt-3 text-[12px] text-[var(--text-muted)]">
						{strings.languagesOriginal}
					</p>
				</div>
			</div>
		</section>
	);
}
