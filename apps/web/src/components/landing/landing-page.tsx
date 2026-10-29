import { type Locale, localePathParam } from "@/lib/i18n";

import { LandingBrief } from "./landing-brief";
import { LandingClosing } from "./landing-closing";
import { landingStrings } from "./landing-copy";
import { LandingEvents } from "./landing-events";
import { LandingHero } from "./landing-hero";
import type { LandingData } from "./landing-model";
import { LandingSources } from "./landing-sources";

// The page at `/`, five screens: one claim and the real product; an event
// several outlets reported, in your language; the day's brief and the same
// data for an agent; the sources; the code and the questions. Every
// visitor and crawler gets the same page.

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
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
			/>
			<LandingEvents
				event={data.event}
				locale={locale}
				localeParam={localeParam}
				strings={strings}
			/>
			<LandingBrief
				digest={data.digest}
				locale={locale}
				localeParam={localeParam}
				strings={strings}
			/>
			<LandingSources
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
				wall={data.wall}
			/>
			<LandingClosing localeParam={localeParam} strings={strings} />
		</div>
	);
}
