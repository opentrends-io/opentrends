import { useSyncExternalStore } from "react";

// Calendar months and days are dates, not instants: "2026-11" is November
// for every reader. Labels are built from UTC midnights and must be
// formatted in UTC, or a reader west of Greenwich sees the day before
// (November 1 at 00:00 UTC is still October 31 in Los Angeles).

export function utcMonth(now: number): string {
	return new Date(now).toISOString().slice(0, 7);
}

// The month on the reader's wall clock, which is how the calendar API
// buckets days (it is sent the reader's UTC offset).
export function localMonth(now: number): string {
	const date = new Date(now);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		month: "long",
		timeZone: "UTC",
		year: "numeric",
	}).format(new Date(`${month}-01T00:00:00Z`));
}

// Monday first, matching the grid. 2024-01-01 was a Monday.
export function weekdayLabels(locale: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, {
		timeZone: "UTC",
		weekday: "short",
	});
	return Array.from({ length: 7 }, (_, index) =>
		formatter.format(new Date(Date.UTC(2024, 0, 1 + index)))
	);
}

function subscribe(): () => void {
	return () => undefined;
}

// The server renders without knowing the reader's time zone, so it uses
// its own UTC month, which travels to the browser with the route data.
// Hydration reuses exactly that value, whatever the browser's clock says;
// React then re-renders once with the reader's own month. Server HTML and
// the first client render always agree, even across a month boundary.
export function useCurrentMonth(serverMonth: string): string {
	return useSyncExternalStore(
		subscribe,
		() => localMonth(Date.now()),
		() => serverMonth
	);
}

// False while the server renders and while the page hydrates; true from
// the first client render after that. Reads that depend on the reader's
// clock wait for it instead of firing once with the server's values.
export function useHydrated(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	);
}

export function useTzOffsetMinutes(): number {
	return useSyncExternalStore(
		subscribe,
		() => -new Date().getTimezoneOffset(),
		() => 0
	);
}
