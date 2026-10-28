import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: ["summary-recovery.e2e.ts", "translation-refresh.e2e.ts"],
	timeout: 35_000,
	retries: 0,
	workers: 1,
	outputDir: "../test-results/summary-recovery",
	use: {
		channel: process.env.PLAYWRIGHT_CHANNEL,
		baseURL: "http://127.0.0.1:4178",
		headless: true,
		viewport: { width: 1280, height: 800 },
	},
	webServer: {
		command:
			"bun run paraglide && VITE_SERVER_URL=http://127.0.0.1:4178 bun x vite --config e2e/summary-recovery.vite.ts",
		cwd: new URL("..", import.meta.url).pathname,
		url: "http://127.0.0.1:4178/e2e/fixtures/summary-recovery.html",
		reuseExistingServer: false,
		timeout: 60_000,
	},
});
