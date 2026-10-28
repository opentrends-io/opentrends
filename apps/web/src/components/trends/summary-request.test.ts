import { expect, test } from "bun:test";
import { requestSummary } from "./summary-request";

const noWait = () => Promise.resolve();
const options = () => ({
	signal: new AbortController().signal,
	consume: noWait,
	onRetry: () => undefined,
});
const URL = "https://example.test/summary";

test("retries transient failures three times at most", async () => {
	let calls = 0;
	const delays: number[] = [];
	await expect(
		requestSummary(URL, options(), {
			fetch: () => {
				calls++;
				return Promise.reject(new TypeError("Failed to fetch"));
			},
			sleep: (ms) => {
				delays.push(ms);
				return Promise.resolve();
			},
		})
	).rejects.toThrow("Failed to fetch");
	expect(calls).toBe(4);
	expect(delays).toEqual([1000, 3000, 8000]);
});

test("a successful retry is consumed once", async () => {
	let calls = 0;
	const bodies: string[] = [];
	const result = await requestSummary(
		URL,
		{
			...options(),
			consume: async (response) => {
				bodies.push(await response.text());
			},
		},
		{
			fetch: () =>
				++calls === 1
					? Promise.reject(new TypeError("Failed to fetch"))
					: Promise.resolve(new Response("digest")),
			sleep: noWait,
		}
	);
	expect(result).toBe("done");
	expect(calls).toBe(2);
	expect(bodies).toEqual(["digest"]);
});

test("pending and rate limiting share the same budget and respect Retry-After", async () => {
	let calls = 0;
	const delays: number[] = [];
	await expect(
		requestSummary(URL, options(), {
			fetch: () =>
				Promise.resolve(
					new Response(null, {
						status: ++calls % 2 ? 202 : 429,
						headers: { "Retry-After": "30" },
					})
				),
			sleep: (ms) => {
				delays.push(ms);
				return Promise.resolve();
			},
		})
	).rejects.toThrow();
	expect(calls).toBe(4);
	expect(delays).toEqual([30_000, 30_000, 30_000]);
});

test("permanent HTTP errors do not retry; empty is not an error", async () => {
	for (const status of [400, 401, 403, 404, 204]) {
		let calls = 0;
		const request = requestSummary(URL, options(), {
			fetch: () => {
				calls++;
				return Promise.resolve(new Response(null, { status }));
			},
		});
		if (status === 204) {
			expect(await request).toBe("empty");
		} else {
			await expect(request).rejects.toThrow(String(status));
		}
		expect(calls).toBe(1);
	}
});

test("cancelling during backoff prevents the next request", async () => {
	const controller = new AbortController();
	let calls = 0;
	await expect(
		requestSummary(
			URL,
			{
				...options(),
				signal: controller.signal,
				onRetry: () => {
					setTimeout(() => controller.abort(), 10);
				},
			},
			{
				fetch: () => {
					calls++;
					return Promise.reject(new TypeError("Failed to fetch"));
				},
			}
		)
	).rejects.toThrow();
	expect(calls).toBe(1);
});

test("body read failures retry too, without accepting the partial result", async () => {
	let calls = 0;
	let reads = 0;
	await requestSummary(
		URL,
		{
			...options(),
			consume: () =>
				++reads === 1
					? Promise.reject(new TypeError("stream interrupted"))
					: Promise.resolve(),
		},
		{
			fetch: () => {
				calls++;
				return Promise.resolve(new Response("digest"));
			},
			sleep: noWait,
		}
	);
	expect(calls).toBe(2);
	expect(reads).toBe(2);
});

test("a stalled request times out and consumes the same finite budget", async () => {
	let calls = 0;
	await expect(
		requestSummary(URL, options(), {
			fetch: (_url, init) => {
				calls++;
				return new Promise((_resolve, reject) => {
					init.signal?.addEventListener(
						"abort",
						() => reject(init.signal?.reason),
						{ once: true }
					);
				});
			},
			sleep: noWait,
			timeoutMs: 5,
		})
	).rejects.toThrow("timed out");
	expect(calls).toBe(4);
});

test("long Retry-After stops instead of retrying prematurely", async () => {
	let calls = 0;
	await expect(
		requestSummary(URL, options(), {
			fetch: () => {
				calls++;
				return Promise.resolve(
					new Response(null, { status: 503, headers: { "Retry-After": "600" } })
				);
			},
			sleep: noWait,
		})
	).rejects.toThrow("503");
	expect(calls).toBe(1);
});
