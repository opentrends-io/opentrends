import {
	type AnalyticsEvent,
	type AnalyticsValue,
	analyticsPage,
	referralSource,
	sanitizeEvent,
	trackingAllowed,
} from "./analytics-model";

const GA_ID = "G-XJR14VWEGN";
const PRODUCTION_HOSTS = ["opentrends.io", "www.opentrends.io"];
const LOGIN_KEY = "opentrends:analytics:login-attempt";
const DEBUG_KEY = "opentrends:analytics:debug";
export const PRODUCT_ANALYTICS_ENABLED =
	import.meta.env.VITE_PRODUCT_ANALYTICS_ENABLED !== "false";

type SafeEvent = ReturnType<typeof analyticsPage> & {
	event: string;
	action?: string;
};
declare global {
	interface Window {
		dataLayer?: unknown[];
		doNotTrack?: string;
		otAnalyticsDebug?: { events: SafeEvent[]; mode: "local-only" };
	}
}

let initialized = false;
let debug = false;
let previousPage = "";
let count = 0;
let minute = 0;
let minuteCount = 0;
const recent = new Map<string, number>();

export function analyticsAllowed() {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		return trackingAllowed({
			dnt:
				navigator.doNotTrack === "1" || window.doNotTrack === "1" ? "1" : null,
			gpc: (navigator as Navigator & { globalPrivacyControl?: boolean })
				.globalPrivacyControl,
			choice: localStorage.getItem("dc-analytics-consent-v1"),
		});
	} catch {
		return false;
	}
}

function tag(...args: unknown[]) {
	window.dataLayer ??= [];
	const layer = window.dataLayer;
	// An ad blocker must never turn telemetry into an unbounded queue.
	// gtag expects the Arguments command format (not a GTM array message).
	if (layer.length < 1000 && args.length) {
		// biome-ignore lint/complexity/noArguments: Google tag command queue requires the Arguments format.
		layer.push(arguments);
	}
}

function context() {
	const page = analyticsPage(window.location.href);
	return {
		...page,
		page_location: `https://opentrends.io${page.page_path}`,
		page_title: `OpenTrends ${page.page_group}`,
		page_referrer: "",
		referrer_group: referralSource(document.referrer),
		site: "opentrends",
		product_id: "opentrends",
	};
}

function disable() {
	(window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
	if (window.otAnalyticsDebug) {
		window.otAnalyticsDebug.events.length = 0;
	}
}

function initialize() {
	if (initialized) {
		return true;
	}
	if (!analyticsAllowed()) {
		return false;
	}
	const production = PRODUCTION_HOSTS.includes(window.location.hostname);
	try {
		if (
			!production &&
			new URL(window.location.href).searchParams.get("analytics_debug") === "1"
		) {
			sessionStorage.setItem(DEBUG_KEY, "1");
		}
		debug = !production && sessionStorage.getItem(DEBUG_KEY) === "1";
	} catch {
		return false;
	}
	if (!(production || debug)) {
		return false;
	}
	initialized = true;
	if (debug) {
		window.otAnalyticsDebug = { events: [], mode: "local-only" };
	} else {
		tag("js", new Date());
		tag("config", GA_ID, {
			send_page_view: false,
			allow_google_signals: false,
			allow_ad_personalization_signals: false,
			cookie_domain: window.location.hostname,
			cookie_prefix: "dc_opentrends",
			cookie_expires: 180 * 86_400,
			...context(),
		});
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
		document.head.appendChild(script);
		const ahrefs = document.createElement("script");
		ahrefs.async = true;
		ahrefs.dataset.key = "aqTYEDbRyZ9C1uHShFzNnw";
		ahrefs.src = "https://analytics.ahrefs.com/analytics.js";
		document.head.appendChild(ahrefs);
	}
	window.addEventListener("storage", () => {
		if (!analyticsAllowed()) {
			disable();
		}
	});
	return true;
}

// Best effort only: analytics failure must never interrupt a product action.
export function track<E extends AnalyticsEvent>(
	event: E,
	value?: AnalyticsValue<E>
) {
	try {
		if (event !== "page_view" && !PRODUCT_ANALYTICS_ENABLED) {
			return;
		}
		if (!analyticsAllowed()) {
			if (initialized) {
				disable();
			}
			return;
		}
		if (!initialize()) {
			return;
		}
		const payload = sanitizeEvent(event, { value });
		if (!payload) {
			return;
		}
		const page = analyticsPage(window.location.href);
		const key = `${event}:${page.page_path}:${page.topic}:${payload.action ?? ""}`;
		const now = Date.now();
		if (now - (recent.get(key) ?? 0) < 750) {
			return;
		}
		if (now - minute >= 60_000) {
			minute = now;
			minuteCount = 0;
		}
		if (count >= 600 || minuteCount >= 60) {
			return;
		}
		recent.set(key, now);
		count += 1;
		minuteCount += 1;
		if (debug) {
			const events = window.otAnalyticsDebug?.events;
			if (!events) {
				return;
			}
			events.push({ event, ...page, ...payload });
			if (events.length > 200) {
				events.shift();
			}
		} else {
			tag("set", context());
			tag("event", event, { send_to: GA_ID, ...context(), ...payload });
		}
	} catch {
		/* Telemetry is optional. */
	}
}

export function trackPage() {
	if (!analyticsAllowed()) {
		if (initialized) {
			disable();
		}
		return;
	}
	const page = analyticsPage(window.location.href);
	const key = `${page.page_path}:${page.topic}`;
	if (previousPage === key) {
		return;
	}
	track("page_view");
	previousPage = key;
}

export function loginStarted(provider: "google" | "github") {
	track("login_start", provider);
	try {
		if (analyticsAllowed() && PRODUCT_ANALYTICS_ENABLED) {
			sessionStorage.setItem(
				LOGIN_KEY,
				JSON.stringify({ provider, at: Date.now() })
			);
		}
	} catch {
		/* Storage is optional. */
	}
}

export function loginFinished(success: boolean) {
	try {
		const attempt = JSON.parse(sessionStorage.getItem(LOGIN_KEY) ?? "null");
		sessionStorage.removeItem(LOGIN_KEY);
		if (
			!(attempt && ["google", "github"].includes(attempt.provider)) ||
			typeof attempt.at !== "number" ||
			Date.now() - attempt.at < 0 ||
			Date.now() - attempt.at > 10 * 60_000
		) {
			return;
		}
		track(success ? "login" : "login_failed", attempt.provider);
	} catch {
		/* Never infer login from a restored session without an attempt. */
	}
}
