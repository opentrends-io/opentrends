import { z } from "zod";

// The translation model is reached through an OpenAI-compatible provider
// that does not declare structured-output support, so a JSON schema is never
// sent and the model answers in free text. The shape is therefore spelled
// out in the prompt and the answer is parsed and checked here: fences and
// surrounding prose are tolerated, ids may come back as numbers, and every
// input id must appear exactly once.

export interface TranslatedRow {
	description: string | null;
	id: string;
	title: string;
}

// What the prompt asks for, shown to the model verbatim.
export const TRANSLATED_BATCH_SHAPE =
	'{"items":[{"id":"0","title":"translated title","description":"translated description, or null"}]}';

const ROW_SCHEMA = z.object({
	description: z
		.string()
		.nullish()
		.transform((value) => value ?? null),
	id: z.union([z.string(), z.number()]).transform((value) => String(value)),
	title: z
		.string()
		.transform((value) => value.trim())
		.pipe(z.string().min(1, "title is empty")),
});

const BATCH_SCHEMA = z.union([
	z.object({ items: z.array(ROW_SCHEMA) }),
	z.array(ROW_SCHEMA).transform((items) => ({ items })),
]);

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/;
const MAX_ISSUES = 6;
const OPENERS = ["{", "["] as const;
const CLOSERS: Record<(typeof OPENERS)[number], string> = {
	"[": "]",
	"{": "}",
};

// The outermost JSON value in the text: whichever of { or [ comes first, up
// to its last matching closer.
function extractJson(text: string): string | null {
	const body = FENCE_RE.exec(text)?.[1] ?? text;
	const starts = OPENERS.map((opener) => ({
		index: body.indexOf(opener),
		opener,
	})).filter((entry) => entry.index >= 0);
	if (starts.length === 0) {
		return null;
	}
	const first = starts.reduce((a, b) => (a.index <= b.index ? a : b));
	const end = body.lastIndexOf(CLOSERS[first.opener]);
	return end > first.index ? body.slice(first.index, end + 1) : null;
}

function idProblems(
	items: readonly TranslatedRow[],
	expectedIds: readonly string[]
): string[] {
	const expected = new Set(expectedIds);
	const counts = new Map<string, number>();
	for (const item of items) {
		counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
	}
	const missing = expectedIds.filter((id) => !counts.has(id));
	const repeated = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
	const unknown = [...counts.keys()].filter((id) => !expected.has(id));
	return [
		missing.length > 0 ? `missing ids: ${missing.join(", ")}` : "",
		repeated.length > 0 ? `repeated ids: ${repeated.join(", ")}` : "",
		unknown.length > 0 ? `unknown ids: ${unknown.join(", ")}` : "",
	].filter(Boolean);
}

// The model's answer as translated rows, or what is wrong with it; the
// problem is fed back to the model on the retry.
export function parseTranslatedBatch(
	text: string,
	expectedIds: readonly string[]
): { items: TranslatedRow[] } | { error: string } {
	const json = extractJson(text);
	if (!json) {
		return { error: "the answer contained no JSON object" };
	}
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch (error) {
		return {
			error: `the JSON did not parse (${error instanceof Error ? error.message : String(error)})`,
		};
	}
	const parsed = BATCH_SCHEMA.safeParse(value);
	if (!parsed.success) {
		return {
			error: parsed.error.issues
				.slice(0, MAX_ISSUES)
				.map((issue) => `${issue.path.join(".") || "answer"}: ${issue.message}`)
				.join("; "),
		};
	}
	const problems = idProblems(parsed.data.items, expectedIds);
	if (problems.length > 0) {
		return { error: problems.join("; ") };
	}
	return { items: parsed.data.items };
}

// Named so shouldSplitTranslationFailure() treats it like the SDK's own
// malformed-output errors: a smaller batch often fixes it.
export class TranslationOutputError extends Error {
	constructor(problem: string) {
		super(`The model did not return usable translations: ${problem}`);
		this.name = "TranslationOutputError";
	}
}

const ATTEMPTS = 2;

// Asks for the batch, and once more with the problem named if the first
// answer could not be used.
export async function requestTranslatedBatch(
	generate: (prompt: string) => Promise<string>,
	prompt: string,
	expectedIds: readonly string[]
): Promise<TranslatedRow[]> {
	let request = prompt;
	let problem = "";
	for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
		const parsed = parseTranslatedBatch(await generate(request), expectedIds);
		if ("items" in parsed) {
			return parsed.items;
		}
		problem = parsed.error;
		request = `${prompt}\n\nYour previous answer could not be used (${problem}). Answer again with only the JSON object, every input id exactly once.`;
	}
	throw new TranslationOutputError(problem);
}
