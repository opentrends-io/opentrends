import { type Locale, localePathParam } from "@/lib/i18n";

import { LandingClosing } from "./landing-closing";
import { landingStrings } from "./landing-copy";
import { LandingCustomize } from "./landing-customize";
import { LandingEvents } from "./landing-events";
import { LandingHero } from "./landing-hero";
import { LandingLanguages } from "./landing-languages";
import type { LandingData } from "./landing-model";
import { LandingSources } from "./landing-sources";
import { LandingUseCases } from "./landing-usecases";
import { LandingViews } from "./landing-views";

// The page at `/`: a radar shared by people and AI. The first screen shows
// both readers; then the three ways to read, events, languages, making it
// yours (sources, brief, your agent), who it is for, the sources, the code.
// Every visitor and crawler gets the same page.

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
				locale={locale}
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
			<LandingCustomize
				locale={locale}
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
			/>
			<LandingUseCases strings={strings} />
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
