// Approved on 2026-11-05 after the September summary evaluation. Production
// model changes belong in reviewable source, not an untracked .env file.
export const productionModelBindings = {
	LLM_BASE_URL: "https://api.siliconflow.cn/v1",
	LLM_MODEL: "Qwen/Qwen3-30B-A3B-Instruct-2507",
	LLM_TRANSLATION_MODEL: "Qwen/Qwen3-30B-A3B-Instruct-2507",
} as const;

export function resolveModelBindings(
	stage: string,
	configured: Record<string, string | undefined>
) {
	if (stage === "production") {
		for (const [key, expected] of Object.entries(productionModelBindings)) {
			const supplied = configured[key]?.trim();
			if (supplied && supplied !== expected) {
				throw new Error(
					`Production ${key} differs from the approved model policy`
				);
			}
		}
		return productionModelBindings;
	}
	return {
		LLM_BASE_URL:
			configured.LLM_BASE_URL ?? "https://dashboard.thorbase.com/v1",
		LLM_MODEL: configured.LLM_MODEL ?? "deepseek/deepseek-v4-pro",
		...(configured.LLM_TRANSLATION_MODEL
			? { LLM_TRANSLATION_MODEL: configured.LLM_TRANSLATION_MODEL }
			: {}),
	};
}

export function assertProductionModelBindings(
	bindings: readonly { name: string; type: string; text?: string }[]
) {
	for (const [key, expected] of Object.entries(productionModelBindings)) {
		const matches = bindings.filter((binding) => binding.name === key);
		if (
			matches.length !== 1 ||
			matches[0]?.type !== "plain_text" ||
			matches[0]?.text !== expected
		) {
			throw new Error(
				`Production ${key} is missing or differs from the approved model policy`
			);
		}
	}
}
