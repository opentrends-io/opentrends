import { expect, test } from "bun:test";
import {
	assertProductionModelBindings,
	productionModelBindings,
	resolveModelBindings,
} from "./production-model-policy";

test("production uses the approved models even when the shell has no model configuration", () => {
	expect(resolveModelBindings("production", {})).toEqual(
		productionModelBindings
	);
});

test("an old Kimi environment cannot silently replace the approved summary model", () => {
	expect(() =>
		resolveModelBindings("production", {
			LLM_MODEL: "Pro/moonshotai/Kimi-K2.6",
		})
	).toThrow("LLM_MODEL");
});

test("other deployments retain their explicitly configured provider and model", () => {
	expect(
		resolveModelBindings("preview", {
			LLM_MODEL: "fixture-model",
			LLM_BASE_URL: "https://example.com/v1",
		})
	).toMatchObject({
		LLM_MODEL: "fixture-model",
		LLM_BASE_URL: "https://example.com/v1",
	});
});

test("the uploaded version must include every approved public model binding", () => {
	const bindings = Object.entries(productionModelBindings).map(
		([name, text]) => ({ name, text, type: "plain_text" })
	);
	expect(() => assertProductionModelBindings(bindings)).not.toThrow();
	expect(() =>
		assertProductionModelBindings(
			bindings.filter((b) => b.name !== "LLM_MODEL")
		)
	).toThrow("LLM_MODEL");
	expect(() =>
		assertProductionModelBindings(
			bindings.map((b) =>
				b.name === "LLM_MODEL" ? { ...b, text: "Pro/moonshotai/Kimi-K2.6" } : b
			)
		)
	).toThrow("LLM_MODEL");
	expect(() =>
		assertProductionModelBindings(
			bindings.map((b) => ({ ...b, type: "secret_text" }))
		)
	).toThrow();
});
