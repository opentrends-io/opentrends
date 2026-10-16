import { cn } from "@opentrends/ui/lib/utils";
import type { ReactNode } from "react";

import type { ExampleBadge } from "./landing-examples";
import type { LandingTopicId } from "./landing-model";

// Building blocks shared by the landing sections: the film's buttons,
// section headings, source badges, topic tags and the app window frame.

export type LocaleParam = string | undefined;

const FOCUS_RING =
	"outline-none focus-visible:outline-2 focus-visible:outline-[var(--stage-blue-soft)] focus-visible:outline-offset-2";

export const PRIMARY_BUTTON_CLASS = cn(
	"inline-flex h-11 items-center gap-2 rounded-full bg-[var(--stage-blue)] px-5 font-semibold text-[14px] text-white shadow-[0_0_40px_rgba(21,93,255,0.45)] transition-colors hover:bg-[var(--stage-blue-deep)] [&_svg]:size-4",
	FOCUS_RING
);

export const SECONDARY_BUTTON_CLASS = cn(
	"inline-flex h-11 items-center gap-2 rounded-full border border-[var(--stage-line-strong)] bg-white/[0.04] px-5 font-medium text-[14px] text-[var(--stage-text)] transition-colors hover:bg-white/[0.09] [&_svg]:size-4",
	FOCUS_RING
);

export const TEXT_LINK_CLASS = cn(
	"inline-flex items-center gap-1.5 rounded font-medium text-[13px] text-[var(--stage-blue-soft)] transition-colors hover:text-[var(--stage-ice)] [&_svg]:size-3.5",
	FOCUS_RING
);

export const CONTAINER_CLASS = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export const PANEL_CLASS =
	"rounded-2xl border border-[var(--stage-line)] bg-[var(--stage-panel)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]";

// The digest's per-topic tag colours on the dark theme.
const TOPIC_TAG: Record<
	Exclude<LandingTopicId, "featured">,
	{ bg: string; fg: string }
> = {
	ai: { bg: "#1f2a4d", fg: "#9fb6ff" },
	biotech: { bg: "#33234a", fg: "#d2b3f5" },
	cn: { bg: "#4a2222", fg: "#f5a6a6" },
	embodied: { bg: "#1f3a28", fg: "#9fe0b5" },
	hardware: { bg: "#4a2f1c", fg: "#f5c093" },
	programming: { bg: "#1c3a3a", fg: "#93e0e0" },
};

export function TopicTag({
	label,
	topic,
}: {
	label: string;
	topic: Exclude<LandingTopicId, "featured">;
}) {
	const colors = TOPIC_TAG[topic];
	return (
		<span
			className="inline-flex h-5 shrink-0 items-center rounded px-1.5 font-medium text-[11px]"
			style={{ backgroundColor: colors.bg, color: colors.fg }}
		>
			{label}
		</span>
	);
}

export function SourceBadge({
	badge,
	className,
}: {
	badge: ExampleBadge;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex size-5 shrink-0 items-center justify-center rounded-full font-bold text-[9px] text-white leading-none ring-1 ring-white/20",
				className
			)}
			style={{ backgroundColor: badge.bg }}
		>
			{badge.t}
		</span>
	);
}

export function SectionHeader({
	body,
	kicker,
	title,
}: {
	body: string;
	kicker: string;
	title: ReactNode;
}) {
	return (
		<div className="max-w-xl">
			<p className="landing-mono text-[11px] text-[var(--stage-blue-soft)]">
				{kicker}
			</p>
			<h2 className="landing-display mt-4 text-balance font-bold text-[32px] leading-[1.08] sm:text-[44px]">
				{title}
			</h2>
			<p className="mt-4 text-[15px] text-[var(--stage-muted)] leading-relaxed sm:text-[16px]">
				{body}
			</p>
		</div>
	);
}

// A browser window around a piece of the real UI, as in the film.
export function AppWindow({
	children,
	className,
	label = "opentrends.io",
}: {
	children: ReactNode;
	className?: string;
	label?: string;
}) {
	return (
		<div className={cn(PANEL_CLASS, "overflow-hidden", className)}>
			<div className="flex h-10 items-center gap-3 border-[var(--stage-line)] border-b bg-[var(--stage-panel-raised)] px-4">
				<span aria-hidden className="flex gap-1.5">
					<span className="size-2.5 rounded-full bg-[#ff5f57]" />
					<span className="size-2.5 rounded-full bg-[#febc2e]" />
					<span className="size-2.5 rounded-full bg-[#28c840]" />
				</span>
				<span className="mx-auto rounded-md bg-white/[0.05] px-3 py-0.5 text-[11px] text-[var(--stage-faint)]">
					{label}
				</span>
				<span aria-hidden className="w-[46px]" />
			</div>
			{children}
		</div>
	);
}

export function LiveDot({ label }: { label: string }) {
	return (
		<span className="landing-mono inline-flex items-center gap-2 text-[10px] text-[var(--stage-faint)]">
			<span className="relative flex size-1.5">
				<span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--stage-green)] opacity-60 motion-reduce:animate-none" />
				<span className="relative inline-flex size-1.5 rounded-full bg-[var(--stage-green)]" />
			</span>
			{label}
		</span>
	);
}
