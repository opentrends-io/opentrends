import { Bot, Briefcase, PenLine, Radar } from "lucide-react";

import type { LandingStrings } from "./landing-copy";
import { CARD_CLASS, CONTAINER_CLASS, SectionHeader } from "./landing-ui";

// Who the radar is for: four readers, what each does with it, and the
// part of the product that does the job.

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
								key={useCase.title}
							>
								<span className="inline-flex size-8 items-center justify-center bg-[var(--accent-blue-bg)] text-[var(--accent-blue)]">
									<Icon aria-hidden className="size-4" />
								</span>
								<h3 className="mt-4 font-semibold text-[15px] text-[var(--text-heading)] leading-snug">
									{useCase.title}
								</h3>
								<p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">
									{useCase.body}
								</p>
								<p className="mt-auto pt-4 text-[11px] text-[var(--text-muted)]">
									{useCase.feature}
								</p>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
