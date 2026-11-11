import { expect, test } from "bun:test";
import { sourcePresets } from "../../server/src/trends/config/sources";
import { buildLandingCatalog } from "./landing-catalog";

test("landing catalog comes from presets without live API availability", () => {
	const catalog = buildLandingCatalog();
	expect(catalog.sources.length).toBe(Object.keys(sourcePresets).length);
	expect(catalog.wall.length).toBeGreaterThan(32);
	expect(catalog.wall.find((source) => source.id === "openai-news")?.kind).toBe(
		"official"
	);
	expect(
		catalog.wall.every((source) =>
			source.topics.every((topic) => topic !== ("featured" as string))
		)
	).toBe(true);
});
