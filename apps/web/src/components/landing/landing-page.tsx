import { type Locale, localePathParam } from "@/lib/i18n";

import { LandingBrief } from "./landing-brief";
import { landingStrings } from "./landing-copy";
import { LandingEvents } from "./landing-events";
import { LandingFinale } from "./landing-finale";
import { LandingHero } from "./landing-hero";
import type { LandingData } from "./landing-model";
import { LandingTranslate } from "./landing-translate";

// The page at `/` for first visits, told the way the launch film tells it:
// too much to read, ten lines instead, then the three things that make the
// ten lines possible (cited sources, translation, merged events), and the
// ways in. Returning readers never see it; the route sends them to the feed.

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
		<div className="landing">
			<LandingHero
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
			/>
			<LandingBrief
				digest={data.digest}
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
				wall={data.wall}
			/>
			<LandingTranslate locale={locale} strings={strings} />
			<LandingEvents
				locale={locale}
				localeParam={localeParam}
				strings={strings}
			/>
			<LandingFinale data={data} localeParam={localeParam} strings={strings} />
		</div>
	);
}
