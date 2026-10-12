import { describe, expect, test } from "bun:test";

import { hasReaderCookie, READER_COOKIE } from "./returning-reader";

describe("hasReaderCookie", () => {
	test("is false without cookies", () => {
		expect(hasReaderCookie(undefined)).toBe(false);
		expect(hasReaderCookie("")).toBe(false);
	});

	test("finds the flag among other cookies", () => {
		expect(
			hasReaderCookie(`PARAGLIDE_LOCALE=zh; ${READER_COOKIE}=1; theme=dark`)
		).toBe(true);
	});

	test("does not match a cookie that only shares a prefix", () => {
		expect(hasReaderCookie(`${READER_COOKIE}_old=1`)).toBe(false);
	});
});
