import { env } from "@opentrends/env/web";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { landingStrings } from "@/components/landing/landing-copy";
import {
	type LandingData,
	type LandingSource,
	sourcesByTopic,
	wallSources,
} from "@/components/landing/landing-model";
import { LandingPage } from "@/components/landing/landing-page";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import { isLocale, resolveLocale } from "@/lib/i18n";
import { buildSeo } from "@/lib/seo";
import { faqPage } from "@/lib/structured-data";

const LANDING_STALE_MS = 10 * 60_000;
const CLIENT_FETCH_TIMEOUT_MS = 5000;

interface SourcesResponse {
	sources?: LandingSource[];
}

// Same reads on both sides: over the service binding while server
// rendering, from the public API after a client navigation. Any failure
// leaves that part of the page out instead of failing the page.
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
		const result = await readApiJsonForSsr<T>(path);
		return result.status === 200 ? result.data : null;
	}
	return await fetchApiJson<T>(path);
}

async function loadLandingData(): Promise<LandingData> {
	const sources = await readApiJson<SourcesResponse>("/api/sources");
	const sourceList = sources?.sources;
	return {
		sourceCount: sourceList?.length ? sourceList.length : null,
		topics: sourcesByTopic(sourceList),
		wall: wallSources(sourceList),
	};
}

export const Route = createFileRoute("/{-$locale}/")({
	beforeLoad: ({ params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
	},
	loader: () => loadLandingData(),
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
