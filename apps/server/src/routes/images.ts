import { Hono } from "hono";

const IMAGE_PROXY_CACHE_CONTROL =
	"public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800";
const IMAGE_PROXY_TIMEOUT_MS = 8000;
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
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

function isOversizedImage(response: Response): boolean {
	const contentLength = response.headers.get("Content-Length");
	if (!contentLength) {
		return false;
	}
	const bytes = Number(contentLength);
	return Number.isFinite(bytes) && bytes > MAX_SOURCE_IMAGE_BYTES;
}

async function readBoundedImage(
	body: ReadableStream<Uint8Array>
): Promise<ArrayBuffer | null> {
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		length += value.byteLength;
		if (length > MAX_SOURCE_IMAGE_BYTES) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes.buffer;
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
			headers: {
				Accept:
					"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
				"User-Agent":
					"Mozilla/5.0 (compatible; OpenTrends image proxy; +https://opentrends.io)",
			},
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

		const original = await readBoundedImage(upstream.body);
		if (!original || original.byteLength === 0) {
			return emptyImageResponse();
		}
		const sourceBody = new Response(original).body;
		if (!sourceBody) {
			return emptyImageResponse();
		}
		let transformed: ImageTransformationResult;
		try {
			transformed = await c.env.IMAGES.input(sourceBody)
				.transform(THUMBNAIL_VARIANTS[variant])
				.output({ format: "image/webp", quality: 76 });
		} catch (error) {
			if (
				!(
					error instanceof Error &&
					error.message.startsWith("IMAGES_TRANSFORM_ERROR 9422:")
				)
			) {
				throw error;
			}
			// Quota exhaustion must not hide a valid image. A short cache lets
			// transformations resume after the account quota resets.
			const fallback = new Response(original, {
				headers: {
					"Content-Type": contentType,
					"Content-Length": String(original.byteLength),
					"Cache-Control":
						"public, max-age=300, s-maxage=300, stale-while-revalidate=600",
					"X-Content-Type-Options": "nosniff",
				},
			});
			await cache?.put(cacheKey, fallback.clone());
			return fallback;
		}
		const imageResponse = transformed.response();
		if (!imageResponse.ok) {
			return emptyImageResponse();
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
