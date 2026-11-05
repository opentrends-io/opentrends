import { expect, test } from "bun:test";

import {
	DISPLAY_SETTINGS_DEFAULTS,
	type DisplaySettings,
	normalizeDisplaySettings,
} from "./display-settings";

test("restores the flow layout from a saved display preference", () => {
	const saved = JSON.parse('{"layout":"flow"}') as Partial<DisplaySettings>;
	expect(normalizeDisplaySettings(saved).layout).toBe("flow");
});

test("keeps existing grid as the default for an unknown layout", () => {
	const saved = JSON.parse('{"layout":"unknown"}') as Partial<DisplaySettings>;
	expect(normalizeDisplaySettings(saved).layout).toBe(
		DISPLAY_SETTINGS_DEFAULTS.layout
	);
});
