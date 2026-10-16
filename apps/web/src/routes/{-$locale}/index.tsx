import { env } from "@opentrends/env/web";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { landingStrings } from "@/components/landing/landing-copy";
import {
	countSources,
	digestPreview,
	type LandingData,
	type LandingSource,
	wallSources,
} from "@/components/landing/landing-model";
import { LandingPage } from "@/components/landing/landing-page";
import { readApiJsonForSsr } from "@/components/trends/load-trends-ssr";
import type { DigestJsonData } from "@/components/trends/types";
import { defaultTopicForLocale } from "@/lib/default-topic";
import { isLocale, type Locale, resolveLocale } from "@/lib/i18n";
import { isReturningReader } from "@/lib/returning-reader";
import { buildSeo } from "@/lib/seo";

const LANDING_STALE_MS = 10 * 60_000;
const CLIENT_FETCH_TIMEOUT_MS = 5000;

interface SourcesResponse {
	sources?: LandingSource[];
}

function digestPath(locale: Locale): string {
	return `/api/trends/featured/summary?format=json&window=today&lang=${locale}`;
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

async function loadLandingData(locale: Locale): Promise<LandingData> {
	const [digest, sources] = await Promise.all([
		readApiJson<DigestJsonData>(digestPath(locale)),
		readApiJson<SourcesResponse>("/api/sources"),
	]);
	return {
		digest: digestPreview(digest),
		...countSources(sources?.sources),
		wall: wallSources(sources?.sources),
	};
}

export const Route = createFileRoute("/{-$locale}/")({
	beforeLoad: ({ params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
		// Readers who have opened the feed before go straight back to it.
		// Temporary, since the answer depends on the visitor.
		if (isReturningReader()) {
			throw redirect({
				to: "/{-$locale}/trends/$topic",
				params: {
					...params,
					topic: defaultTopicForLocale(resolveLocale(params.locale)),
				},
			});
		}
	},
	loader: ({ params }) => loadLandingData(resolveLocale(params.locale)),
	staleTime: LANDING_STALE_MS,
	head: ({ params }) => {
		const locale = resolveLocale(params.locale);
		const strings = landingStrings(locale);
		return buildSeo({
			description: strings.heroBody(null),
			locale,
			path: "/",
			title: strings.seoTitle,
		});
	},
	component: LandingRoute,
});

function LandingRoute() {
	const data = Route.useLoaderData();
	const params = Route.useParams();
	return <LandingPage data={data} locale={resolveLocale(params.locale)} />;
}
