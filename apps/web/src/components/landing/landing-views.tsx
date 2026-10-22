import { cn } from "@opentrends/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import type { LandingStrings } from "./landing-copy";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	Screenshot,
	SectionHeader,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// The three ways the same sources can be read, one at a time and large:
// full first screens of the live site (public/landing), switched by tab.

const SHOTS = [
	{ src: "/landing/sources.jpg", width: 1600, height: 1025 },
	{ src: "/landing/events.jpg", width: 1600, height: 1025 },
	{ src: "/landing/feed.jpg", width: 1600, height: 1025 },
] as const;

function ViewLink({
	index,
	label,
	localeParam,
}: {
	index: number;
	label: string;
	localeParam: LocaleParam;
}) {
	if (index === 1) {
		return (
			<Link
				className={TEXT_LINK_CLASS}
				params={{ locale: localeParam }}
				to="/{-$locale}/events"
			>
				{label}
				<ArrowRight aria-hidden />
			</Link>
		);
	}
	if (index === 2) {
		return (
			<Link
				className={TEXT_LINK_CLASS}
				params={{ locale: localeParam }}
				search={{ topic: "featured" }}
				to="/{-$locale}/feed"
			>
				{label}
				<ArrowRight aria-hidden />
			</Link>
		);
	}
	return (
		<Link
			className={TEXT_LINK_CLASS}
			params={{ locale: localeParam, topic: "featured" }}
			to="/{-$locale}/trends/$topic"
		>
			{label}
			<ArrowRight aria-hidden />
		</Link>
	);
}

export function LandingViews({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const [active, setActive] = useState(0);
	const view = strings.views[active] ?? strings.views[0];
	const shot = SHOTS[active] ?? SHOTS[0];
	if (!view) {
		return null;
	}
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.viewsBody}
					kicker={strings.viewsKicker}
					title={strings.viewsTitle}
				/>
				<div className="mt-8 flex flex-wrap gap-1.5" role="tablist">
					{strings.views.map((item, index) => (
						<button
							aria-selected={index === active}
							className={cn(
								"inline-flex h-8 items-center border px-3 text-[13px] transition-colors",
								index === active
									? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--text-inverse)]"
									: "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
							)}
							key={item.title}
							onClick={() => setActive(index)}
							role="tab"
							type="button"
						>
							{item.title}
						</button>
					))}
				</div>
				<div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:items-start">
					<Screenshot
						alt={view.title}
						height={shot.height}
						key={shot.src}
						src={shot.src}
						width={shot.width}
					/>
					<div className="lg:pt-2">
						<h3 className="font-semibold text-[16px] text-[var(--text-heading)]">
							{view.title}
						</h3>
						<p className="mt-2 text-[14px] text-[var(--text-secondary)] leading-relaxed">
							{view.body}
						</p>
						<div className="mt-4">
							<ViewLink
								index={active}
								label={strings.viewsOpen}
								localeParam={localeParam}
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
