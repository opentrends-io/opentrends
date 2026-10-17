import { type Locale, localePathParam } from "@/lib/i18n";

import { LandingClosing } from "./landing-closing";
import { landingStrings } from "./landing-copy";
import { LandingEvents } from "./landing-events";
import { LandingHero } from "./landing-hero";
import type { LandingData } from "./landing-model";
import { LandingRead } from "./landing-read";
import { LandingSources } from "./landing-sources";

// The page at `/`: the product first (today's brief), then what makes it
// different (cross-checked stories, hand-picked first-hand sources), how
// it reads, and the code. Every visitor and crawler gets the same page.

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
			<LandingEvents
				localeParam={localeParam}
				stories={data.stories}
				strings={strings}
			/>
			<LandingSources
				localeParam={localeParam}
				sourceCount={data.sourceCount}
				strings={strings}
				topics={data.topics}
				wall={data.wall}
			/>
			<LandingRead
				locale={locale}
				localeParam={localeParam}
				strings={strings}
				topics={data.topics}
			/>
			<LandingClosing localeParam={localeParam} strings={strings} />
		</div>
	);
}
