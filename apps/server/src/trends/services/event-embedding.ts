import { env } from "@opentrends/env/server";
import { normalizeEventText } from "./event-text";
import { recordEmbeddingUsage } from "./model-usage";

const SILICONFLOW_EMBEDDINGS_URL = "https://api.siliconflow.cn/v1/embeddings";
// SiliconFlow numbers `index` from 0 again after every 8 inputs, so a larger
// batch could not be matched back to its texts by index.
const SILICONFLOW_EMBEDDING_BATCH_SIZE = 8;
// Qwen3 embeddings are trained so that the first N dimensions work on their
// own. 1024 of the 4096 dimensions separate same-story reports as well as all
// of them (AUC 0.9997 vs 0.9998 on 2026-09-28 production items) at a quarter
// of the size, which keeps a rebuild over every event source within one
// Worker invocation. Five decimals keep the stored JSON small without
// changing any similarity by more than 1e-4.
export const EVENT_EMBEDDING_DIMENSIONS = 1024;
const EMBEDDING_VALUE_DECIMALS = 5;
// Part of the text hash, so vectors made with other settings are replaced.
const EMBEDDING_TEXT_VERSION = `v2-d${EVENT_EMBEDDING_DIMENSIONS}`;

export interface EventEmbeddingInput {
	description?: string | null;
	publishedAt?: Date | null;
	sourceName: string;
	title: string;
}

interface SiliconFlowEmbeddingResponse {
	data?: Array<{
		embedding?: number[];
		index?: number;
	}>;
	usage?: unknown;
}

export class EventEmbeddingNotConfiguredError extends Error {
	constructor() {
		super("SiliconFlow embedding is not configured.");
		this.name = "EventEmbeddingNotConfiguredError";
	}
}

export function assertEventEmbeddingConfigured(): void {
	if (!env.SILICONFLOW_API_KEY) {
		throw new EventEmbeddingNotConfiguredError();
	}
}

export function hashText(value: string): string {
	let hash = 0x81_1c_9d_c5;
	for (let i = 0; i < value.length; i += 1) {
		// biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a hash step uses XOR by design.
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 0x01_00_01_93);
	}
	// biome-ignore lint/suspicious/noBitwiseOperators: convert to unsigned 32-bit hash.
	return (hash >>> 0).toString(16).padStart(8, "0");
}

export function getEventEmbeddingModel(): string {
	return env.SILICONFLOW_EMBEDDING_MODEL;
}

// Qwen3 embedding models pool the last token, so the end of the text weighs
// most in the vector. With "Source:"/"Published:" at the end, vectors grouped
// by publisher and date instead of by story, and no report ever matched one
// from another publisher. The metadata therefore goes first and the report's
// own words last. The fetched article body is left out: it matched reports of
// one story worse than title + description did.
export function buildCanonicalEmbeddingText(
	input: EventEmbeddingInput
): string {
	const parts = [
		`Source: ${input.sourceName}`,
		input.publishedAt
			? `Published: ${input.publishedAt.toISOString().slice(0, 10)}`
			: "",
		normalizeEventText(input.title),
		normalizeEventText(input.description),
	];
	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join("\n\n");
}

export function hashEmbeddingText(text: string): string {
	return hashText(`${EMBEDDING_TEXT_VERSION}\n${text}`);
}

function compactVector(vector: readonly number[]): number[] {
	return vector.map((value) => Number(value.toFixed(EMBEDDING_VALUE_DECIMALS)));
}

async function embedTextBatch(texts: string[]): Promise<number[][]> {
	const usageId = crypto.randomUUID();
	const started = new Date().toISOString();
	let usage: unknown = null;
	let outcome: "ok" | "error" = "error";
	try {
		const response = await fetch(SILICONFLOW_EMBEDDINGS_URL, {
			body: JSON.stringify({
				dimensions: EVENT_EMBEDDING_DIMENSIONS,
				input: texts,
				model: env.SILICONFLOW_EMBEDDING_MODEL,
				truncate: "right",
				user: "opentrends-event-feed",
			}),
			headers: {
				Authorization: `Bearer ${env.SILICONFLOW_API_KEY}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		if (!response.ok) {
			throw new Error(`SiliconFlow embedding failed (${response.status})`);
		}
		const payload = (await response.json()) as SiliconFlowEmbeddingResponse;
		usage = payload.usage;
		const vectors = new Array<number[]>(texts.length);
		for (const item of payload.data ?? []) {
			if (typeof item.index === "number" && item.embedding) {
				vectors[item.index] = item.embedding;
			}
		}
		const result = texts.map((_, index) => {
			const vector = vectors[index];
			if (!vector) {
				throw new Error(
					`SiliconFlow embedding response missing vector at index ${index}`
				);
			}
			return compactVector(vector);
		});
		outcome = "ok";
		return result;
	} finally {
		await recordEmbeddingUsage(
			usageId,
			env.SILICONFLOW_EMBEDDING_MODEL,
			started,
			usage,
			outcome
		);
	}
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
	if (texts.length === 0) {
		return [];
	}
	assertEventEmbeddingConfigured();

	const vectors: number[][] = [];
	for (
		let index = 0;
		index < texts.length;
		index += SILICONFLOW_EMBEDDING_BATCH_SIZE
	) {
		vectors.push(
			...(await embedTextBatch(
				texts.slice(index, index + SILICONFLOW_EMBEDDING_BATCH_SIZE)
			))
		);
	}
	return vectors;
}
