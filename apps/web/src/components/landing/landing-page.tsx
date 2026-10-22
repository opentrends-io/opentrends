import { type Locale, localePathParam } from "@/lib/i18n";

import { LandingAgents } from "./landing-agents";
import { LandingClosing } from "./landing-closing";
import { landingStrings } from "./landing-copy";
import { LandingEvents } from "./landing-events";
import { LandingFollow } from "./landing-follow";
import { LandingHero } from "./landing-hero";
import { LandingLanguages } from "./landing-languages";
import type { LandingData } from "./landing-model";
import { LandingSources } from "./landing-sources";
import { LandingUseCases } from "./landing-usecases";
import { LandingViews } from "./landing-views";

// The page at `/`: the product first (today's brief), the three ways to
// read it, then what sets it apart (events, languages, your own sources,
// agents, the sources themselves, the code). Every visitor and crawler
// gets the same page.

export function LandingPage({
	data,
	locale,
}: {
	data: LandingData;
	locale: Locale;
}) {
	const strings = landingStrings(locale);
	const localeParam = localePathParam(locale);
	return (
		<div className="bg-[var(--surface-app)]">
			<LandingHero
				digest={data.digest}
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
			/>
			<LandingViews localeParam={localeParam} strings={strings} />
			<LandingEvents
				locale={locale}
				localeParam={localeParam}
				strings={strings}
			/>
			<LandingLanguages locale={locale} strings={strings} />
			<LandingFollow
				locale={locale}
				localeParam={localeParam}
				strings={strings}
			/>
			<LandingUseCases strings={strings} />
			<LandingAgents
				lines={data.digest?.lines ?? []}
				localeParam={localeParam}
				strings={strings}
			/>
			<LandingSources
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
				topics={data.topics}
				wall={data.wall}
			/>
			<LandingClosing localeParam={localeParam} strings={strings} />
		</div>
	);
}
