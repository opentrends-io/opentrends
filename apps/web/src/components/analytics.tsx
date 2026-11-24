import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { track, trackPage } from "@/lib/analytics";
import { type AnalyticsEvent, sanitizeEvent } from "@/lib/analytics-model";

export function Analytics() {
	const href = useLocation({ select: (location) => location.href });
	// Only committed route changes count; query/hash changes collapse to safe paths.
	// biome-ignore lint/correctness/useExhaustiveDependencies: href triggers a new sanitized pageview
	useEffect(() => {
		trackPage();
	}, [href]);
	useEffect(() => {
		document.addEventListener("click", click, true);
		document.addEventListener("auxclick", click, true);
		return () => {
			document.removeEventListener("click", click, true);
			document.removeEventListener("auxclick", click, true);
		};
	}, []);
	return null;
}

function click(event: MouseEvent) {
	if (!(event.target instanceof Element) || event.button > 1) {
		return;
	}
	const annotated = event.target.closest<HTMLElement>("[data-analytics-event]");
	if (annotated) {
		const name = annotated.dataset.analyticsEvent ?? "";
		const params = sanitizeEvent(name, {
			value: annotated.dataset.analyticsValue,
		});
		if (params) {
			track(name as AnalyticsEvent, params.action as never);
		}
		return;
	}
	const link = event.target.closest("a");
	if (!link) {
		return;
	}
	if (
		link.closest("[data-testid=trends-summary-body]") &&
		link.matches("[data-streamdown=link]")
	) {
		track("article_open", "citation");
		return;
	}
	const area = link.closest<HTMLElement>("[data-analytics-area]")?.dataset
		.analyticsArea;
	if (area === "header" || area === "footer") {
		track("navigation_click", area);
	} else if (area) {
		const safe = sanitizeEvent("landing_click", { value: area });
		if (safe?.action) {
			track("landing_click", safe.action as never);
		}
	}
}
