import { expect, test } from "bun:test";
import redirect from "./www-redirect";

const cases = [
	["https://www.opentrends.io/", "https://opentrends.io/"],
	["http://www.opentrends.io/", "https://opentrends.io/"],
	[
		"https://www.opentrends.io:8443/trends/ai",
		"https://opentrends.io/trends/ai",
	],
	[
		"https://www.opentrends.io/zh/trends/ai?day=2026-10-11&tag=a%2Fb&tag=c",
		"https://opentrends.io/zh/trends/ai?day=2026-10-11&tag=a%2Fb&tag=c",
	],
	[
		"https://www.opentrends.io//evil.example/%E4%B8%AD?q=%2F%2Fother.example",
		"https://opentrends.io//evil.example/%E4%B8%AD?q=%2F%2Fother.example",
	],
] as const;

for (const [source, destination] of cases) {
	test(`redirects ${source} permanently to the HTTPS main domain`, () => {
		const response = redirect.fetch(new Request(source));
		expect(response.status).toBe(308);
		expect(response.headers.get("location")).toBe(destination);
	});
}

test("preserves the method with a 308 and ignores forwarded host headers", () => {
	const response = redirect.fetch(
		new Request("https://www.opentrends.io/trends/ai?x=1", {
			method: "POST",
			headers: { "x-forwarded-host": "evil.example" },
		})
	);
	expect(response.status).toBe(308);
	expect(response.headers.get("location")).toBe(
		"https://opentrends.io/trends/ai?x=1"
	);
});

for (const hostname of [
	"opentrends.io",
	"localhost",
	"www.opentrends.io.evil.example",
]) {
	test(`does not redirect ${hostname}`, () => {
		const response = redirect.fetch(new Request(`https://${hostname}/`));
		expect(response.status).toBe(404);
		expect(response.headers.has("location")).toBe(false);
	});
}
