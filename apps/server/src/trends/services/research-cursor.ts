import { Buffer } from "node:buffer";
import { z } from "zod";

export class ResearchInputError extends Error {}
export class ArticleContentChangedError extends Error {}

export function encodeCursor(value: unknown): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor<T>(value: string, schema: z.ZodType<T>): T {
	try {
		if (value.length > 4000) {
			throw new Error("too long");
		}
		return schema.parse(JSON.parse(Buffer.from(value, "base64url").toString()));
	} catch {
		throw new ResearchInputError("Invalid cursor; restart without a cursor.");
	}
}

export async function contentVersion(value: unknown): Promise<string> {
	const hash = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(JSON.stringify(value))
	);
	return Array.from(new Uint8Array(hash), (byte) =>
		byte.toString(16).padStart(2, "0")
	).join("");
}

export const articleCursorSchema = z.object({
	v: z.literal(1),
	sourceId: z.string(),
	itemId: z.string(),
	offset: z.number().int().positive().max(200_000),
	version: z.string().regex(/^[a-f0-9]{64}$/),
});
