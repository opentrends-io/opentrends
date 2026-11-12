import { describe, expect, test } from "bun:test";

// Run as a reader in Los Angeles, where UTC midnight is still yesterday.
process.env.TZ = "America/Los_Angeles";

const { localMonth, monthLabel, utcMonth, weekdayLabels } = await import(
	"./calendar-dates"
);

describe("calendar labels west of Greenwich", () => {
	test("the host time zone really is behind UTC", () => {
		// The formatter the calendar used to call: no time zone given.
		const naive = new Intl.DateTimeFormat("en", { month: "long" }).format(
			new Date("2026-11-01T00:00:00Z")
		);
		expect(naive).toBe("October");
	});

	test("the month label is the month asked for", () => {
		expect(monthLabel("2026-11", "en")).toBe("November 2026");
		expect(monthLabel("2026-11", "zh")).toBe("2026年11月");
		expect(monthLabel("2027-01", "en")).toBe("January 2027");
	});

	test("the week starts on Monday, like the grid", () => {
		expect(weekdayLabels("en")).toEqual([
			"Mon",
			"Tue",
			"Wed",
			"Thu",
			"Fri",
			"Sat",
			"Sun",
		]);
		expect(weekdayLabels("zh")[0]).toBe("周一");
	});
});

describe("the current month at a month boundary", () => {
	// 2026-11-01 03:00 UTC is 2026-10-31 20:00 in Los Angeles.
	const instant = Date.UTC(2026, 10, 1, 3);

	test("server and reader can disagree, so each is explicit", () => {
		expect(utcMonth(instant)).toBe("2026-11");
		expect(localMonth(instant)).toBe("2026-10");
	});
});
