import { env } from "@opentrends/env/web";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { type Locale, useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { translationExamples } from "./landing-examples";
import { LANDING_TOPIC_IDS, type TopicSources } from "./landing-model";
import {
	CARD_CLASS,
	CONTAINER_CLASS,
	type LocaleParam,
	SectionHeader,
	TEXT_LINK_CLASS,
} from "./landing-ui";

// How the reading works: one headline in all eight languages, the topics,
// and the feeds and agent endpoints that carry the same content.

function Languages({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const examples = translationExamples(locale);
	const [own, ...rest] = examples;
	if (!own) {
		return null;
	}
	return (
		<div className={`${CARD_CLASS} p-5`}>
			<h3 className="font-semibold text-[14px] text-[var(--text-primary)]">
				{strings.languagesTitle}
			</h3>
			<p className="mt-1 text-[12px] text-[var(--text-muted)]">
				{strings.languagesBody}
			</p>
			<p className="mt-4 font-medium text-[15px] text-[var(--text-primary)] leading-snug">
				<span className="mr-2 inline-flex h-[18px] items-center bg-[var(--accent-blue-bg)] px-1.5 align-middle font-medium text-[10px] text-[var(--accent-blue)]">
					{own.code}
				</span>
				{own.text}
			</p>
			<ul className="mt-3 space-y-1.5 border-[var(--border-subtle)] border-t pt-3">
				{rest.map((example) => (
					<li
						className="flex gap-2 text-[12px] text-[var(--text-secondary)] leading-snug"
						key={example.code}
					>
						<span className="w-6 shrink-0 text-[var(--text-muted)]">
							{example.code}
						</span>
						<span className="min-w-0">{example.text}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function Topics({
	localeParam,
	strings,
	topics,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
	topics: TopicSources[];
}) {
	const t = useT();
	const counts = new Map(topics.map((group) => [group.topic, group.count]));
	return (
		<div className={`${CARD_CLASS} p-5`}>
			<h3 className="font-semibold text-[14px] text-[var(--text-primary)]">
				{strings.topicsTitle}
			</h3>
			<p className="mt-1 text-[12px] text-[var(--text-muted)]">
				{strings.topicsBody}
			</p>
			<ul className="mt-4 divide-y divide-[var(--border-subtle)]">
				{LANDING_TOPIC_IDS.map((id) => {
					const count = id === "featured" ? null : counts.get(id);
					return (
						<li key={id}>
							<Link
								className="group flex items-center justify-between gap-3 py-2 text-[13px]"
								params={{ locale: localeParam, topic: id }}
								to="/{-$locale}/trends/$topic"
							>
								<span className="font-medium text-[var(--text-primary)] group-hover:underline">
									{t(`topic.${id}`)}
								</span>
								<span className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] tabular-nums">
									{count ? strings.topicSources(count) : null}
									<ArrowRight aria-hidden className="size-3" />
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

function Ways({
	localeParam,
	strings,
}: {
	localeParam: LocaleParam;
	strings: LandingStrings;
}) {
	const hrefs = [
		`${env.VITE_SERVER_URL}/api/trends/featured/feed.xml`,
		`${env.VITE_SERVER_URL}/api/trends/featured/summary?format=json`,
		`${env.VITE_SERVER_URL}/mcp`,
	];
	return (
		<div className={`${CARD_CLASS} flex flex-col p-5`}>
			<h3 className="font-semibold text-[14px] text-[var(--text-primary)]">
				{strings.waysTitle}
			</h3>
			<p className="mt-1 text-[12px] text-[var(--text-muted)]">
				{strings.agentsBody}
			</p>
			<ul className="mt-4 divide-y divide-[var(--border-subtle)]">
				{strings.ways.map((way, index) => (
					<li className="py-2.5" key={way.title}>
						<a
							className="font-medium text-[13px] text-[var(--text-primary)] hover:underline"
							href={hrefs[index]}
							rel="noopener"
							target="_blank"
						>
							{way.title}
						</a>
						<p className="mt-0.5 text-[12px] text-[var(--text-secondary)] leading-snug">
							{way.body}
						</p>
					</li>
				))}
			</ul>
			<div className="mt-auto pt-3">
				<Link
					className={TEXT_LINK_CLASS}
					params={{ locale: localeParam }}
					to="/{-$locale}/agents"
				>
					{strings.agentsGuide}
					<ArrowRight aria-hidden />
				</Link>
			</div>
		</div>
	);
}

export function LandingRead({
	locale,
	localeParam,
	strings,
	topics,
}: {
	locale: Locale;
	localeParam: LocaleParam;
	strings: LandingStrings;
	topics: TopicSources[];
}) {
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div className={CONTAINER_CLASS}>
				<SectionHeader
					body={strings.readBody}
					kicker={strings.readKicker}
					title={strings.readTitle}
				/>
				<div className="mt-10 grid gap-4 md:grid-cols-3">
					<Languages locale={locale} strings={strings} />
					<Topics localeParam={localeParam} strings={strings} topics={topics} />
					<Ways localeParam={localeParam} strings={strings} />
				</div>
			</div>
		</section>
	);
}
