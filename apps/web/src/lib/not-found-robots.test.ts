import { describe, expect, it } from "bun:test";

import { withNotFoundRobots } from "./not-found-robots";

describe("404 responses", () => {
	it("tells crawlers not to index a missing page", async () => {
		const response = withNotFoundRobots(
			new Response("<html>missing</html>", {
				headers: { "content-type": "text/html" },
				status: 404,
			})
		);
		expect(response.status).toBe(404);
		expect(response.headers.get("x-robots-tag")).toBe("noindex");
		expect(response.headers.get("content-type")).toBe("text/html");
		expect(await response.text()).toBe("<html>missing</html>");
	});

	it("leaves every other response alone", () => {
		const ok = new Response("ok", { status: 200 });
		expect(withNotFoundRobots(ok)).toBe(ok);
		const moved = new Response(null, {
			headers: { location: "/trends/featured" },
			status: 301,
		});
		expect(withNotFoundRobots(moved)).toBe(moved);
	});

	it("keeps a robots header the page already set", () => {
		const response = new Response("gone", {
			headers: { "x-robots-tag": "noindex, nofollow" },
			status: 404,
		});
		expect(withNotFoundRobots(response).headers.get("x-robots-tag")).toBe(
			"noindex, nofollow"
		);
	});
});
