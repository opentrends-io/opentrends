// Browser-safe, shared by producers, readers and persisted browser snapshots.
export type TranslationState =
	| "ready"
	| "not_needed"
	| "queued"
	| "running"
	| "retry_wait"
	| "blocked"
	| "failed"
	| "unknown";

export interface TranslationStatus {
	checkedAt: number;
	language: string;
	leaseUntil?: number;
	nextPollAt?: number;
	reason?:
		| "budget"
		| "call_limit"
		| "paused"
		| "stalled"
		| "rate_limit"
		| "registration"
		| "provider"
		| "configuration"
		| "attempts"
		| "storage"
		| "unsupported";
	serviceValidUntil?: number;
	state: TranslationState;
	textHash: string;
	updatedAt?: number;
}

export function translationText(item: {
	title: string;
	description?: string | null;
}): string {
	return JSON.stringify({
		description: item.description ?? null,
		title: item.title,
	});
}

export function effectiveTranslationState(
	status: TranslationStatus | undefined,
	now = Date.now()
): TranslationState {
	if (!status) {
		return "unknown";
	}
	if (
		status.state === "running" &&
		(!status.leaseUntil || status.leaseUntil <= now)
	) {
		return "unknown";
	}
	if (
		(status.state === "queued" || status.state === "retry_wait") &&
		(now - status.checkedAt > 60_000 ||
			(status.serviceValidUntil !== undefined &&
				status.serviceValidUntil <= now))
	) {
		return status.serviceValidUntil !== undefined &&
			status.serviceValidUntil <= now
			? "blocked"
			: "unknown";
	}
	return status.state;
}

export function translationPollAt(
	status: TranslationStatus | undefined,
	now = Date.now()
): number | undefined {
	if (
		!status ||
		(status.serviceValidUntil !== undefined && status.serviceValidUntil <= now)
	) {
		return;
	}
	if (
		!(
			["queued", "running", "retry_wait"].includes(status.state) ||
			(status.state === "unknown" && status.reason === "registration")
		)
	) {
		return;
	}
	// Stale status can be checked, but never turns into proof of active work.
	return Math.max(now + 1000, status.nextPollAt ?? now + 10_000);
}
