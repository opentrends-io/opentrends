import { Hono } from "hono";

const IMAGE_PROXY_CACHE_CONTROL =
	"public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800";
const IMAGE_PROXY_TIMEOUT_MS = 8000;
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
// When the thumbnail service is down or out of quota, originals up to this
// size are passed through as they are; a broken cover is worse than a
// heavier one. Cached briefly so thumbnails return once the service does.
const MAX_PASS_THROUGH_BYTES = 6 * 1024 * 1024;
const PASS_THROUGH_CACHE_CONTROL = "public, max-age=3600, s-maxage=21600";
const UPSTREAM_HEADERS = {
	Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
	"User-Agent":
		"Mozilla/5.0 (compatible; OpenTrends image proxy; +https://opentrends.io)",
};
const PRIVATE_172_RE = /^172\.(\d{1,2})\./;
const THUMBNAIL_VARIANTS = {
	// scale-down never enlarges, so a source's tiny thumbnail stays tiny and
	// the client can tell it apart from a real cover instead of showing it
	// blurred to card width. Cards crop with CSS object-fit.
	card: { fit: "scale-down", height: 640, width: 640 },
	row: { fit: "cover", height: 96, width: 96 },
} as const;

type ThumbnailVariant = keyof typeof THUMBNAIL_VARIANTS;

function isPrivateHostname(hostname: string): boolean {
	const normalized = hostname.toLowerCase();
	if (
		normalized === "localhost" ||
		normalized.endsWith(".localhost") ||
		normalized === "::1" ||
		normalized === "[::1]"
	) {
		return true;
	}
	if (
		normalized.startsWith("127.") ||
		normalized.startsWith("10.") ||
		normalized.startsWith("169.254.") ||
		normalized.startsWith("192.168.")
	) {
		return true;
	}
	const match = normalized.match(PRIVATE_172_RE);
	return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function parseImageUrl(value: string | undefined): URL | null {
	if (!value) {
		return null;
	}
	try {
		const url = new URL(value);
		if (!["http:", "https:"].includes(url.protocol)) {
			return null;
		}
		if (isPrivateHostname(url.hostname)) {
			return null;
		}
		return url;
	} catch {
		return null;
	}
}

function emptyImageResponse(): Response {
	return new Response(null, {
		status: 204,
		headers: {
			"Cache-Control": "public, max-age=300",
		},
	});
}

function parseThumbnailVariant(
	value: string | undefined
): ThumbnailVariant | null {
	if (value === undefined) {
		return "row";
	}
	return value === "row" || value === "card" ? value : null;
}

function defaultCache(): Cache | undefined {
	return typeof caches === "undefined"
		? undefined
		: (caches as CacheStorage & { default: Cache }).default;
}

function isOversizedImage(
	response: Response,
	maxBytes = MAX_SOURCE_IMAGE_BYTES
): boolean {
	const contentLength = response.headers.get("Content-Length");
	if (!contentLength) {
		return false;
	}
	const bytes = Number(contentLength);
	return Number.isFinite(bytes) && bytes > maxBytes;
}

// Stops a body without a Content-Length once it passes the limit.
function limitBody(
	body: ReadableStream<Uint8Array>,
	maxBytes: number
): ReadableStream<Uint8Array> {
	let seen = 0;
	return body.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				seen += chunk.byteLength;
				if (seen > maxBytes) {
					controller.error(new Error("Image is too large to pass through."));
					return;
				}
				controller.enqueue(chunk);
			},
		})
	);
}

async function serveOriginalInstead(
	url: URL,
	reason: string,
	store: (response: Response) => Promise<void> | undefined
): Promise<Response> {
	console.warn("[image] thumbnail failed, passing the original through", {
		reason,
	});
	const original = await passThroughOriginal(url);
	if (original.status === 200) {
		await store(original.clone());
	}
	return original;
}

async function passThroughOriginal(url: URL): Promise<Response> {
	const upstream = await fetch(url, {
		headers: UPSTREAM_HEADERS,
		signal: AbortSignal.timeout(IMAGE_PROXY_TIMEOUT_MS),
	});
	const contentType = upstream.headers.get("Content-Type") ?? "";
	const isRasterImage =
		contentType.toLowerCase().startsWith("image/") &&
		!contentType.toLowerCase().startsWith("image/svg+xml");
	if (
		!(upstream.ok && isRasterImage && upstream.body) ||
		isOversizedImage(upstream, MAX_PASS_THROUGH_BYTES)
	) {
		return emptyImageResponse();
	}
	return new Response(limitBody(upstream.body, MAX_PASS_THROUGH_BYTES), {
		headers: {
			"Cache-Control": PASS_THROUGH_CACHE_CONTROL,
			"Content-Security-Policy": "sandbox; default-src 'none'",
			"Content-Type": contentType,
			"X-Content-Type-Options": "nosniff",
		},
	});
}

export const imageRoutes = new Hono<{
	Bindings: { IMAGES: ImagesBinding };
}>().get("/", async (c) => {
	const url = parseImageUrl(c.req.query("url"));
	const variant = parseThumbnailVariant(c.req.query("variant"));
	if (!(url && variant)) {
		return emptyImageResponse();
	}
	const cache = defaultCache();
	const cacheKey = c.req.raw;
	const cached = await cache?.match(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const upstream = await fetch(url, {
			headers: UPSTREAM_HEADERS,
			signal: AbortSignal.timeout(IMAGE_PROXY_TIMEOUT_MS),
		});
		const contentType = upstream.headers.get("Content-Type") ?? "";
		if (
			!(upstream.ok && contentType.toLowerCase().startsWith("image/")) ||
			isOversizedImage(upstream) ||
			!upstream.body
		) {
			return emptyImageResponse();
		}
		if (contentType.toLowerCase().startsWith("image/svg+xml")) {
			const headers = new Headers({
				"Cache-Control": IMAGE_PROXY_CACHE_CONTROL,
				"Content-Security-Policy":
					"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
				"Content-Type": "image/svg+xml; charset=utf-8",
				"X-Content-Type-Options": "nosniff",
			});
			const response = new Response(upstream.body, { headers });
			await cache?.put(cacheKey, response.clone());
			return response;
		}

		let transformed: Awaited<
			ReturnType<ReturnType<ImagesBinding["input"]>["output"]>
		>;
		try {
			transformed = await c.env.IMAGES.input(upstream.body)
				.transform(THUMBNAIL_VARIANTS[variant])
				.output({ format: "image/webp", quality: 76 });
		} catch (error) {
			return await serveOriginalInstead(
				url,
				error instanceof Error ? error.message : String(error),
				(response) => cache?.put(cacheKey, response)
			);
		}
		const imageResponse = transformed.response();
		if (!imageResponse.ok) {
			return await serveOriginalInstead(
				url,
				`status ${imageResponse.status}`,
				(response) => cache?.put(cacheKey, response)
			);
		}
		const headers = new Headers(imageResponse.headers);
		headers.set("Cache-Control", IMAGE_PROXY_CACHE_CONTROL);
		headers.set("Content-Type", transformed.contentType());
		headers.set("X-Content-Type-Options", "nosniff");
		const response = new Response(imageResponse.body, {
			headers,
			status: imageResponse.status,
		});
		await cache?.put(cacheKey, response.clone());
		return response;
	} catch {
		return emptyImageResponse();
	}
});
