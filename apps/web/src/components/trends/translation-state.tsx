import {
	effectiveTranslationState,
	type TranslationStatus,
} from "@opentrends/api/translation-contract";
import { CircleAlert, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/lib/i18n";
import { textNeedsTranslation } from "./translation-status";

interface Subject {
	description?: string;
	original?: unknown;
	summary?: string;
	title: string;
	translation?: TranslationStatus;
}
function statusExpiry(status: TranslationStatus | undefined) {
	if (status?.state === "running") {
		return status.leaseUntil;
	}
	if (status?.state === "queued" || status?.state === "retry_wait") {
		return Math.min(
			status.checkedAt + 60_000,
			status.serviceValidUntil ?? Number.POSITIVE_INFINITY
		);
	}
	return;
}
function useStatusClock(status: TranslationStatus | undefined) {
	const [now, setNow] = useState(Date.now);
	const expiry = statusExpiry(status);
	useEffect(() => {
		setNow(Date.now());
		if (!expiry) {
			return;
		}
		const timer = setTimeout(
			() => setNow(Date.now()),
			Math.max(0, expiry - Date.now()) + 1
		);
		return () => clearTimeout(timer);
	}, [expiry]);
	return now;
}

function statusLabel(status: TranslationStatus | undefined, now: number) {
	const state = effectiveTranslationState(status, now);
	if (state === "blocked") {
		const reasons = {
			budget: "translation.budget",
			call_limit: "translation.callLimit",
			paused: "translation.paused",
			stalled: "translation.stalled",
			rate_limit: "translation.rateLimit",
			provider: "translation.provider",
			configuration: "translation.configuration",
			storage: "translation.unknown",
			unsupported: "translation.blocked",
			attempts: "translation.failed",
			registration: "translation.registration",
		} as const;
		return status?.reason ? reasons[status.reason] : "translation.stalled";
	}
	if (state === "unknown" && status?.reason === "registration") {
		return "translation.registration";
	}
	return {
		queued: "translation.queued",
		running: "translation.running",
		retry_wait: "translation.retry",
		failed: "translation.failed",
		unknown: "translation.unknown",
		ready: "translation.unknown",
		not_needed: "translation.unknown",
	}[state] as
		| "translation.queued"
		| "translation.running"
		| "translation.retry"
		| "translation.failed"
		| "translation.unknown";
}
function isOriginalOnly(item: Subject, locale: ReturnType<typeof useLocale>) {
	return (
		!item.original &&
		item.translation?.state !== "not_needed" &&
		item.translation?.state !== "ready" &&
		(Boolean(item.translation) ||
			textNeedsTranslation(item.title, locale) ||
			textNeedsTranslation(item.description ?? item.summary, locale))
	);
}

export function TranslationIndicator({ item }: { item: Subject }) {
	const locale = useLocale();
	const t = useT();
	const now = useStatusClock(item.translation);
	if (!isOriginalOnly(item, locale)) {
		return null;
	}
	const status =
		item.translation?.language === locale ? item.translation : undefined;
	const state = effectiveTranslationState(status, now);
	const label = t(statusLabel(status, now));
	let Icon = CircleAlert;
	if (state === "queued" || state === "retry_wait") {
		Icon = Clock3;
	}
	if (state === "running") {
		Icon = LoaderCircle;
	}
	return (
		<span
			className="inline-flex size-3.5 shrink-0 items-center justify-center text-[var(--text-muted)]"
			data-translation-state={state}
			title={label}
		>
			<Icon
				aria-hidden
				className={`size-3 ${state === "running" ? "motion-safe:animate-spin" : ""}`}
			/>
			<span className="sr-only">{label}</span>
		</span>
	);
}
