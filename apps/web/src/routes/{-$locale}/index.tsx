import { env } from "@opentrends/env/web";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { landingStrings } from "@/components/landing/landing-copy";
import {
	type LandingData,
	type LandingDigest,
	type LandingEvent,
	type LandingSource,
	liveDigest,
	pickLandingEvent,
	sourceKind,
	wallSources,
} from "@/components/landing/landing-model";
import { LandingPage } from "@/components/landing/landing-page";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { isLocale, type Locale, resolveLocale } from "@/lib/i18n";
import { buildSeo } from "@/lib/seo";
import { faqPage } from "@/lib/structured-data";

const LANDING_STALE_MS = 10 * 60_000;
const CLIENT_FETCH_TIMEOUT_MS = 5000;
const EVENT_FEED_LIMIT = 30;
// The event feed and the brief are built on demand and can take a few
// seconds; the page waits that long before falling back to its examples.
const SSR_READ_TIMEOUT_MS = 6000;

interface SourcesResponse {
	sources?: LandingSource[];
}

interface EventsResponse {
	events?: LandingEvent[];
}

// Same reads on both sides: over the service binding while server
// rendering, from the public API after a client navigation. Any failure
// leaves that part of the page to its fixed example instead of failing
// the page.
async function fetchApiJson<T>(path: string): Promise<T | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), CLIENT_FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(`${env.VITE_SERVER_URL}${path}`, {
			credentials: "omit",
			signal: controller.signal,
		});
		if (!response.ok) {
			return null;
		}
		return (await response.json()) as T;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

async function readApiJson<T>(path: string): Promise<T | null> {
	if (import.meta.env.SSR) {
		const result = await readApiJsonForSsr<T>(path, SSR_READ_TIMEOUT_MS);
		return result.status === 200 ? result.data : null;
	}
	return await fetchApiJson<T>(path);
}

// The event feed does not carry source names or kinds; the source list does.
function describeEvent(
	event: LandingEvent | null,
	sources: readonly LandingSource[] | undefined
): LandingEvent | null {
	if (!event) {
		return null;
	}
	const byId = new Map(
		(sources ?? [])
			.filter((source) => source.sourceId)
			.map((source) => [source.sourceId, source])
	);
	return {
		...event,
		sources: event.sources.map((source) => {
			const known = byId.get(source.sourceId);
			return {
				...source,
				homeUrl: source.homeUrl ?? known?.homeUrl,
				kind: known ? sourceKind(known) : null,
				name: known?.name ?? source.sourceId,
			};
		}),
	};
}

async function loadLandingData(locale: Locale): Promise<LandingData> {
	const [sources, digest, events] = await Promise.all([
		readApiJson<SourcesResponse>("/api/sources"),
		readApiJson<LandingDigest>(
			`/api/trends/featured/summary?format=json&lang=${locale}`
		),
		readApiJson<EventsResponse>(
			`/api/events?topic=featured&lang=${locale}&limit=${EVENT_FEED_LIMIT}&translations=background`
		),
	]);
	const sourceList = sources?.sources;
	return {
		digest: liveDigest(
			digest
				? {
						degraded: digest.degraded,
						entries: digest.entries ?? [],
						generatedAt: digest.generatedAt,
					}
				: null
		),
		event: describeEvent(pickLandingEvent(events?.events), sourceList),
		sourceCount: sourceList?.length ? sourceList.length : null,
		wall: wallSources(sourceList),
	};
}

export const Route = createFileRoute("/{-$locale}/")({
	beforeLoad: ({ params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
	},
	loader: ({ params }) => loadLandingData(resolveLocale(params.locale)),
	staleTime: LANDING_STALE_MS,
	head: ({ params }) => {
		const locale = resolveLocale(params.locale);
		const strings = landingStrings(locale);
		const head = buildSeo({
			description: strings.seoDescription,
			locale,
			path: "/",
			title: strings.seoTitle,
		});
		const faq = faqPage(strings.faq);
		return { ...head, scripts: faq ? [faq] : [] };
	},
	component: LandingRoute,
});

function LandingRoute() {
	const data = Route.useLoaderData();
	const params = Route.useParams();
	return <LandingPage data={data} locale={resolveLocale(params.locale)} />;
}
