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
			<LandingViews strings={strings} />
			<LandingEvents
				localeParam={localeParam}
				stories={data.stories}
				strings={strings}
			/>
			<LandingLanguages locale={locale} strings={strings} />
			<LandingFollow localeParam={localeParam} strings={strings} />
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
