import { cn } from "@opentrends/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot } from "lucide-react";
import { useState } from "react";

import { useIsReturningReader } from "@/lib/returning-reader";

import type { LandingStrings } from "./landing-copy";
import {
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	Screenshot,
	SECONDARY_BUTTON_CLASS,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// The first screen: one claim, two doors, and the real product underneath.
// The three ways to read are full first screens of the live site
// (public/landing), switched by tab, large enough to read.

const MCP_COMMAND =
	"claude mcp add --transport http opentrends https://api.opentrends.io/mcp";

const SHOTS = [
	{ src: "/landing/sources.jpg", width: 1600, height: 1025 },
	{ src: "/landing/events.jpg", width: 1600, height: 1025 },
	{ src: "/landing/feed.jpg", width: 1600, height: 1025 },
] as const;

function ContinueReading({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const returning = useIsReturningReader();
	if (!returning) {
		return null;
	}
	return (
		<Link
			className={TEXT_LINK_CLASS}
			params={{ locale: localeParam, topic: "featured" }}
			to="/{-$locale}/trends/$topic"
		>
			{strings.continueReading}
			<ArrowRight aria-hidden />
		</Link>
	);
}

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

function Showcase({
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
		<div className="border-[var(--border-default)] border-t bg-[var(--surface-sidebar)]">
			<div className={`${CONTAINER_CLASS} py-10 sm:py-14`}>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap gap-1.5" role="tablist">
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
					<span className="text-[11px] text-[var(--text-muted)]">
						{strings.viewsCaption}
					</span>
				</div>
				<Screenshot
					alt={view.title}
					className="mt-4"
					height={shot.height}
					key={shot.src}
					src={shot.src}
					width={shot.width}
				/>
				<p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-secondary)]">
					<span>{view.body}</span>
					<ViewLink
						index={active}
						label={strings.viewsOpen}
						localeParam={localeParam}
					/>
				</p>
			</div>
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
		<section className="bg-[var(--surface-app)]">
			<div className={`${CONTAINER_CLASS} pt-16 pb-10 sm:pt-20`}>
				<p className="text-[12px] text-[var(--text-muted)]">
					{strings.eyebrow}
				</p>
				<h1 className="mt-4 max-w-3xl text-balance font-semibold text-[34px] text-[var(--text-heading)] leading-[1.12] tracking-tight sm:text-[46px]">
					{strings.heroTitle}
				</h1>
				<p className="mt-5 max-w-2xl text-[16px] text-[var(--text-secondary)] leading-relaxed sm:text-[18px]">
					{strings.heroBody(sourceCount)}
				</p>
				<div className="mt-7 flex flex-wrap items-center gap-3">
					<Link
						className={PRIMARY_BUTTON_CLASS}
						params={{ locale: localeParam, topic: "featured" }}
						to="/{-$locale}/trends/$topic"
					>
						{strings.ctaFeed}
						<ArrowRight aria-hidden />
					</Link>
					<Link
						className={SECONDARY_BUTTON_CLASS}
						params={{ locale: localeParam }}
						to="/{-$locale}/agents"
					>
						<Bot aria-hidden />
						{strings.ctaAgent}
					</Link>
					<ContinueReading localeParam={localeParam} strings={strings} />
				</div>
				<p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--text-muted)]">
					<span>{strings.mcpHint}</span>
					<code className="font-mono text-[11px] text-[var(--text-secondary)] [overflow-wrap:anywhere]">
						{MCP_COMMAND}
					</code>
				</p>
			</div>
			<Showcase localeParam={localeParam} strings={strings} />
		</section>
	);
}
