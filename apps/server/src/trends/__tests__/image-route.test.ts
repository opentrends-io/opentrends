import { afterEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

import { imageRoutes } from "../../routes/images";

interface TransformCall {
	fit?: string;
	height?: number;
	width?: number;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
	mock.restore();
});

function createFailingApp() {
	const app = new Hono<{
		Bindings: { IMAGES: ImagesBinding };
	}>();
	app.route("/api/image", imageRoutes);
	const images = {
		input() {
			return {
				transform() {
					return {
						output() {
							return Promise.reject(new Error("transformation limit"));
						},
					};
				},
			};
		},
	} as unknown as ImagesBinding;
	return { app, images };
}

function createApp(transformCalls: TransformCall[]) {
	const app = new Hono<{
		Bindings: { IMAGES: ImagesBinding };
	}>();
	app.route("/api/image", imageRoutes);
	const images = {
		input() {
			return {
				transform(options: TransformCall) {
					transformCalls.push(options);
					return {
						output() {
							return Promise.resolve({
								contentType: () => "image/webp",
								response: () =>
									new Response("thumbnail", {
										headers: { "Content-Type": "image/webp" },
									}),
							});
						},
					};
				},
			};
		},
	} as unknown as ImagesBinding;
	return { app, images };
}

describe("image thumbnail route", () => {
	test("transforms row covers to a bounded square WebP", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response("original", {
					headers: { "Content-Type": "image/jpeg" },
				})
			)
		) as unknown as typeof fetch;
		const calls: TransformCall[] = [];
		const { app, images } = createApp(calls);

		const response = await app.request(
			"/api/image?variant=row&url=https%3A%2F%2Fcdn.example.com%2Flarge.jpg",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/webp");
		expect(response.headers.get("Cache-Control")).toContain("s-maxage=2592000");
		expect(calls).toEqual([{ fit: "cover", height: 96, width: 96 }]);
	});

	test("scales card covers down to 640px without enlarging small originals", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response("original", {
					headers: { "Content-Type": "image/png" },
				})
			)
		) as unknown as typeof fetch;
		const calls: TransformCall[] = [];
		const { app, images } = createApp(calls);

		const response = await app.request(
			"/api/image?variant=card&url=https%3A%2F%2Fcdn.example.com%2Flarge.png",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(200);
		expect(calls).toEqual([{ fit: "scale-down", height: 640, width: 640 }]);
	});

	test("serves SVG covers with a restrictive document sandbox", async () => {
		const svg =
			'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response(svg, {
					headers: { "Content-Type": "image/svg+xml" },
				})
			)
		) as unknown as typeof fetch;
		const calls: TransformCall[] = [];
		const { app, images } = createApp(calls);

		const response = await app.request(
			"/api/image?variant=row&url=https%3A%2F%2Fcdn.example.com%2Fcover.svg",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
		expect(response.headers.get("Content-Security-Policy")).toContain(
			"sandbox"
		);
		expect(await response.text()).toBe(svg);
		expect(calls).toHaveLength(0);
	});

	test("fails closed instead of serving a large original", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response("not an image", {
					headers: { "Content-Type": "text/html" },
				})
			)
		) as unknown as typeof fetch;
		const calls: TransformCall[] = [];
		const { app, images } = createApp(calls);

		const response = await app.request(
			"/api/image?variant=row&url=https%3A%2F%2Fexample.com%2Fpage",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(204);
		expect(calls).toHaveLength(0);
	});

	test("rejects unbounded transform variants", async () => {
		const calls: TransformCall[] = [];
		const { app, images } = createApp(calls);

		const response = await app.request(
			"/api/image?variant=huge&url=https%3A%2F%2Fcdn.example.com%2Flarge.jpg",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(204);
		expect(calls).toHaveLength(0);
	});

	test("serves the original when the thumbnail service fails", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response("original-bytes", {
					headers: { "Content-Length": "14", "Content-Type": "image/jpeg" },
				})
			)
		) as unknown as typeof fetch;
		const { app, images } = createFailingApp();

		const response = await app.request(
			"/api/image?variant=card&url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("image/jpeg");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(response.headers.get("Content-Security-Policy")).toContain(
			"sandbox"
		);
		// Short, so thumbnails come back once the service works again.
		expect(response.headers.get("Cache-Control")).not.toContain(
			"s-maxage=2592000"
		);
		expect(await response.text()).toBe("original-bytes");
	});

	test("does not pass through a large original when thumbnails fail", async () => {
		globalThis.fetch = mock(() =>
			Promise.resolve(
				new Response("x", {
					headers: {
						"Content-Length": String(12 * 1024 * 1024),
						"Content-Type": "image/png",
					},
				})
			)
		) as unknown as typeof fetch;
		const { app, images } = createFailingApp();

		const response = await app.request(
			"/api/image?variant=card&url=https%3A%2F%2Fcdn.example.com%2Fhuge.png",
			undefined,
			{ IMAGES: images }
		);

		expect(response.status).toBe(204);
	});
});
