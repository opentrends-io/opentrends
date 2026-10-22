import { cn } from "@opentrends/ui/lib/utils";
import { Languages } from "lucide-react";
import { useState } from "react";

import { LOCALES, type Locale, useT } from "@/lib/i18n";

import type { LandingStrings } from "./landing-copy";
import { LANGUAGE_LABELS, languageFeed } from "./landing-examples";
import {
	AppWindow,
	CONTAINER_CLASS,
	SectionHeader,
	SourceLogo,
	TopicTag,
} from "./landing-ui";

// Sources in several languages, all read in one: a mini feed of four
// items from differently-worded originals, shown in the reading language
// the visitor picks. Starts in the visitor's own language.

function orderedLocales(first: Locale): Locale[] {
	return [first, ...LOCALES.filter((locale) => locale !== first)];
}

export function LandingLanguages({
	locale,
	strings,
}: {
	locale: Locale;
	strings: LandingStrings;
}) {
	const t = useT();
	const [reading, setReading] = useState<Locale>(locale);
	const items = languageFeed(reading);
	return (
		<section className="border-[var(--border-default)] border-t py-16 sm:py-24">
			<div
				className={`${CONTAINER_CLASS} grid items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16`}
			>
				<SectionHeader
					body={strings.languagesBody}
					kicker={strings.languagesKicker}
					title={strings.languagesTitle}
				/>
				<div>
					<AppWindow>
						<fieldset className="flex flex-wrap items-center gap-1 border-[var(--border-default)] border-b bg-[var(--surface-sidebar)] px-3 py-2">
							<legend className="sr-only">{strings.languagesPick}</legend>
							<span className="mr-1 inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
								<Languages aria-hidden className="size-3.5" />
								{strings.languagesPick}
							</span>
							{orderedLocales(locale).map((code) => (
								<button
									aria-pressed={code === reading}
									className={cn(
										"h-7 border px-2 text-[12px] transition-colors",
										code === reading
											? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--text-inverse)]"
											: "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
									)}
									key={code}
									onClick={() => setReading(code)}
									type="button"
								>
									{LANGUAGE_LABELS[code]}
								</button>
							))}
						</fieldset>
						<ol className="divide-y divide-[var(--border-subtle)]">
							{items.map((item) => (
								<li className="flex gap-3 px-4 py-3" key={item.source}>
									<span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border border-[var(--border-default)] bg-white">
										<SourceLogo
											className="size-3.5"
											size={14}
											source={{
												homeUrl: item.homeUrl,
												id: item.source,
												kind: item.kind,
												name: item.source,
												topics: [],
											}}
										/>
									</span>
									<div className="min-w-0">
										<p className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
											{item.source}
											<TopicTag
												label={t(`topic.${item.topic}`)}
												topic={item.topic}
											/>
										</p>
										<p className="mt-0.5 font-medium text-[14px] text-[var(--text-primary)] leading-snug">
											{item.translated}
										</p>
										{item.original === item.translated ? null : (
											<p className="mt-1 flex gap-2 text-[11px] text-[var(--text-muted)] leading-snug">
												<span className="shrink-0 font-medium">
													{strings.languagesOriginalLabel} · {item.originalLang}
												</span>
												<span className="min-w-0">{item.original}</span>
											</p>
										)}
									</div>
								</li>
							))}
						</ol>
					</AppWindow>
					<p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
						<span>{strings.languagesOriginal}</span>
						<span className="text-[11px]">
							{strings.eventsExampleNote("2026-09-29")}
						</span>
					</p>
				</div>
			</div>
		</section>
	);
}
