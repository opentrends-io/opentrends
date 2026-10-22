import { env } from "@opentrends/env/web";
import { buttonVariants } from "@opentrends/ui/components/button";
import { cn } from "@opentrends/ui/lib/utils";
import type { ReactNode } from "react";

import { logoSrc } from "./landing-logos";
import type { ContentTopicId, WallSource } from "./landing-model";

// Building blocks shared by the landing sections, in the site's own
// vocabulary: square corners, the sidebar beige for bands, the brand blue
// for the one accent.

export type LocaleParam = string | undefined;

export const CONTAINER_CLASS = "mx-auto w-full max-w-6xl px-5 sm:px-8";

export const PRIMARY_BUTTON_CLASS = cn(
	buttonVariants({ size: "lg" }),
	"h-10 px-4 text-[13px] hover:bg-[var(--accent-blue-hover)]"
);

export const SECONDARY_BUTTON_CLASS = cn(
	buttonVariants({ size: "lg", variant: "outline" }),
	"h-10 border-[var(--border-strong)] bg-[var(--surface-card)] px-4 text-[13px] text-[var(--text-primary)] hover:bg-[var(--state-hover-subtle)]"
);

export const TEXT_LINK_CLASS =
	"inline-flex items-center gap-1 font-medium text-[13px] text-[var(--accent-blue)] hover:underline [&_svg]:size-3.5";

export const CARD_CLASS =
	"border border-[var(--border-default)] bg-[var(--surface-card)]";

const WWW_PREFIX_RE = /^www\./;

// Remote images go through the API's image proxy, which resizes them and
// keeps them on Cloudflare's edge for a month, so a wall of favicons loads
// from one nearby cache instead of dozens of origins.
export function proxiedImage(url: string, variant: "card" | "row"): string {
	const search = new URLSearchParams({ url, variant });
	return `${env.VITE_SERVER_URL}/api/image?${search}`;
}

function faviconSrc(homeUrl: string): string | null {
	try {
		const host = new URL(homeUrl).hostname.replace(WWW_PREFIX_RE, "");
		return proxiedImage(`https://favicon.im/${host}`, "row");
	} catch {
		return null;
	}
}

// The digest's per-topic tag colours, as on the topic pages.
const TOPIC_TAG_CLASS: Record<ContentTopicId, string> = {
	ai: "bg-[#e3ecff] text-[#2a5bd7] dark:bg-[#1f2a4d] dark:text-[#9fb6ff]",
	biotech: "bg-[#f3e8fb] text-[#7a3cb4] dark:bg-[#33234a] dark:text-[#d2b3f5]",
	cn: "bg-[#fde8e8] text-[#c02a2a] dark:bg-[#4a2222] dark:text-[#f5a6a6]",
	embodied: "bg-[#e6f4ea] text-[#1e7a3c] dark:bg-[#1f3a28] dark:text-[#9fe0b5]",
	hardware: "bg-[#fdecdc] text-[#b4530a] dark:bg-[#4a2f1c] dark:text-[#f5c093]",
	programming:
		"bg-[#e0f4f4] text-[#0f7a7a] dark:bg-[#1c3a3a] dark:text-[#93e0e0]",
};

export function TopicTag({
	label,
	topic,
}: {
	label: string;
	topic: ContentTopicId;
}) {
	return (
		<span
			className={cn(
				"inline-flex h-[18px] shrink-0 items-center rounded-[4px] px-1.5 font-medium text-[10px]",
				TOPIC_TAG_CLASS[topic]
			)}
		>
			{label}
		</span>
	);
}

// The small blue label above a section heading.
export function Kicker({ children }: { children: ReactNode }) {
	return (
		<span className="inline-flex h-5 items-center bg-[var(--accent-blue-bg)] px-1.5 font-medium text-[11px] text-[var(--accent-blue)]">
			{children}
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
	title: string;
}) {
	return (
		<div className="max-w-2xl">
			<Kicker>{kicker}</Kicker>
			<h2 className="mt-3 text-balance font-semibold text-[26px] text-[var(--text-heading)] leading-tight tracking-tight sm:text-[32px]">
				{title}
			</h2>
			<p className="mt-3 text-[15px] text-[var(--text-secondary)] leading-relaxed">
				{body}
			</p>
		</div>
	);
}

// A source's mark: the hand-prepared logo when there is one, otherwise its
// favicon through the image proxy.
export function SourceLogo({
	className,
	eager = false,
	size,
	source,
}: {
	className?: string;
	eager?: boolean;
	size: number;
	source: WallSource;
}) {
	const src = logoSrc(source.id) ?? faviconSrc(source.homeUrl);
	if (!src) {
		return null;
	}
	return (
		<img
			alt=""
			className={cn("shrink-0", className)}
			decoding="async"
			height={size}
			loading={eager ? "eager" : "lazy"}
			src={src}
			width={size}
		/>
	);
}

export function SourceMark({
	size = "md",
	source,
}: {
	size?: "sm" | "md";
	source: WallSource;
}) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center border border-[var(--border-default)] bg-white",
				size === "sm" ? "size-5" : "size-7"
			)}
		>
			<SourceLogo
				className={size === "sm" ? "size-3" : "size-4"}
				size={size === "sm" ? 12 : 16}
				source={source}
			/>
		</span>
	);
}

// A browser window around a piece of the real UI.
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
		<div
			className={cn(
				CARD_CLASS,
				"overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)]",
				className
			)}
		>
			<div className="flex h-9 items-center gap-3 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-3">
				<span aria-hidden className="flex gap-1.5">
					<span className="size-2.5 rounded-full bg-[#dcdcd8]" />
					<span className="size-2.5 rounded-full bg-[#dcdcd8]" />
					<span className="size-2.5 rounded-full bg-[#dcdcd8]" />
				</span>
				<span className="mx-auto border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-0.5 text-[11px] text-[var(--text-muted)]">
					{label}
				</span>
				<span aria-hidden className="w-[46px]" />
			</div>
			{children}
		</div>
	);
}

// A real screenshot of the product (taken from the live site, under
// public/landing) in a window frame.
export function Screenshot({
	alt,
	className,
	height,
	src,
	width,
}: {
	alt: string;
	className?: string;
	height: number;
	src: string;
	width: number;
}) {
	return (
		<AppWindow className={className}>
			<img
				alt={alt}
				className="block w-full"
				decoding="async"
				height={height}
				loading="lazy"
				src={src}
				width={width}
			/>
		</AppWindow>
	);
}
