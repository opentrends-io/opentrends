import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import type { LandingStrings } from "./landing-copy";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	Screenshot,
	SectionHeader,
} from "./landing-ui";

// The reader's own page: followed sources in one view with a brief written
// from them alone. Shown as it really looks (public/landing/mine.jpg).

export function LandingFollow({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	return (
		<section className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)] py-16 sm:py-24">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16`}
			>
				<div>
					<SectionHeader
						body={strings.followBody}
						kicker={strings.followKicker}
						title={strings.followTitle}
					/>
					<ul className="mt-6 flex flex-col gap-2.5 text-[14px] text-[var(--text-primary)]">
						{strings.followPoints.map((point) => (
							<li className="flex items-start gap-2" key={point}>
								<Check
									aria-hidden
									className="mt-[3px] size-3.5 shrink-0 text-[var(--accent-blue)]"
								/>
								{point}
							</li>
						))}
					</ul>
					<Link
						className={`${PRIMARY_BUTTON_CLASS} mt-7`}
						params={{ locale: localeParam, topic: "mine" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.followCta}
						<ArrowRight aria-hidden />
					</Link>
				</div>
				<Screenshot
					alt={strings.followAlt}
					height={963}
					src="/landing/mine.jpg"
					width={1600}
				/>
			</div>
		</section>
	);
}
