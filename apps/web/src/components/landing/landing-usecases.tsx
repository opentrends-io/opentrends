import { Bot, Briefcase, PenLine, Radar } from "lucide-react";

import type { LandingStrings } from "./landing-copy";
import { CARD_CLASS, CONTAINER_CLASS, SectionHeader } from "./landing-ui";

// Who the radar is for: four readers, one sentence each, and the parts of
// the product that do the job.

const ICONS = [PenLine, Briefcase, Bot, Radar] as const;

export function LandingUseCases({ strings }: { strings: LandingStrings }) {
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.useCasesBody}
					kicker={strings.useCasesKicker}
					title={strings.useCasesTitle}
				/>
				<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{strings.useCases.map((useCase, index) => {
						const Icon = ICONS[index] ?? Radar;
						return (
							<article
								className={`${CARD_CLASS} flex flex-col p-5`}
								key={useCase.label}
							>
								<div className="flex items-center gap-2.5">
									<span className="inline-flex size-8 shrink-0 items-center justify-center bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]">
										<Icon aria-hidden className="size-4" />
									</span>
									<h3 className="font-semibold text-[15px] text-[var(--text-heading)]">
										{useCase.label}
									</h3>
								</div>
								<p className="mt-4 text-[14px] text-[var(--text-primary)] leading-relaxed">
									{useCase.scenario}
								</p>
								<ul className="mt-auto flex flex-wrap gap-1.5 pt-5">
									{useCase.chips.map((chip) => (
										<li
											className="inline-flex h-6 items-center border border-[var(--border-default)] bg-[var(--surface-sidebar)] px-2 text-[11px] text-[var(--text-secondary)]"
											key={chip}
										>
											{chip}
										</li>
									))}
								</ul>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
