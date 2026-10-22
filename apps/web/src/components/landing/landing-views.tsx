import type { LandingStrings } from "./landing-copy";
import { CONTAINER_CLASS, Screenshot, SectionHeader } from "./landing-ui";

// The three ways the same sources can be read, each shown as it really
// looks. The screenshots are taken from the live site (public/landing).

const SHOTS = [
	{ src: "/landing/sources.jpg", width: 1600, height: 563 },
	{ src: "/landing/events.jpg", width: 1600, height: 563 },
	{ src: "/landing/feed.jpg", width: 1600, height: 563 },
] as const;

export function LandingViews({ strings }: { strings: LandingStrings }) {
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.viewsBody}
					kicker={strings.viewsKicker}
					title={strings.viewsTitle}
				/>
				<div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-5">
					{strings.views.map((view, index) => {
						const shot = SHOTS[index];
						return (
							<figure className="min-w-0" key={view.title}>
								{shot ? (
									<Screenshot
										alt={view.title}
										height={shot.height}
										src={shot.src}
										width={shot.width}
									/>
								) : null}
								<figcaption className="mt-4">
									<h3 className="font-semibold text-[15px] text-[var(--text-heading)]">
										{view.title}
									</h3>
									<p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
										{view.body}
									</p>
								</figcaption>
							</figure>
						);
					})}
				</div>
			</div>
		</section>
	);
}
