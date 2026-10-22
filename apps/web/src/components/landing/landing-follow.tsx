import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import type { Locale } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { type FollowSourceExample, followExample } from "./landing-examples";
import {
	AppWindow,
	CONTAINER_CLASS,
	type LocaleParam,
	PRIMARY_BUTTON_CLASS,
	SectionHeader,
	SourceLogo,
} from "./landing-ui";

// The reader's own page, drawn the way the product draws it: the brief
// written from the followed sources on top, one card per source below.
// A fixed example, so it reads the same whatever the API is doing.

function SourceCard({ source }: { source: FollowSourceExample }) {
	return (
		<div className="min-w-0 border-[var(--border-default)] border-r last:border-r-0 max-md:border-r-0 max-md:border-b max-md:last:border-b-0">
			<div className="flex items-center gap-2 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-3 py-2 text-[12px]">
				<span className="inline-flex size-5 items-center justify-center border border-[var(--border-default)] bg-white">
					<SourceLogo
						className="size-3.5"
						size={14}
						source={{
							homeUrl: source.homeUrl,
							id: source.name,
							kind: "official",
							name: source.name,
							topics: [],
						}}
					/>
				</span>
				<span className="truncate font-semibold text-[var(--text-primary)]">
					{source.name}
				</span>
			</div>
			<ol className="divide-y divide-[var(--border-subtle)]">
				{source.items.map((item, index) => (
					<li className="flex gap-2.5 px-3 py-2.5" key={item.title}>
						<span className="w-4 shrink-0 font-mono text-[10px] text-[var(--text-muted)] leading-[1.6]">
							{String(index + 1).padStart(2, "0")}
						</span>
						<div className="min-w-0">
							<p className="text-[12px] text-[var(--text-primary)] leading-snug">
								{item.title}
							</p>
						</div>
					</li>
				))}
			</ol>
		</div>
	);
}

export function LandingFollow({
	locale,
	localeParam,
	strings,
}: {
	locale: Locale;
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const example = followExample(locale);
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
				<div>
					<AppWindow>
						<div className="border-[var(--border-default)] border-b px-4 py-3">
							<p className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
								<span className="font-semibold text-[var(--text-primary)]">
									{strings.followBriefLabel}
								</span>
								<span>·</span>
								<span>{strings.followDemoSources}</span>
							</p>
							<ol className="mt-2 space-y-1.5">
								{example.brief.map((line) => (
									<li
										className="flex gap-2 text-[12px] leading-snug"
										key={line.n}
									>
										<span className="w-3 shrink-0 text-[var(--text-muted)] tabular-nums">
											{line.n}.
										</span>
										<span className="min-w-0">
											<span className="font-semibold text-[var(--text-primary)]">
												{line.takeaway}
											</span>
											<span className="text-[var(--text-secondary)]">
												{" "}
												— {line.reason}
											</span>
										</span>
									</li>
								))}
							</ol>
						</div>
						<div className="grid md:grid-cols-3">
							{example.sources.map((source) => (
								<SourceCard key={source.name} source={source} />
							))}
						</div>
					</AppWindow>
					<p className="mt-3 text-right text-[11px] text-[var(--text-muted)]">
						{strings.eventsExampleNote("2026-09-29")}
					</p>
				</div>
			</div>
		</section>
	);
}
