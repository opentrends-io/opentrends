import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Component integration only: no Cloudflare runtime, credentials or live APIs.
export default defineConfig({
	resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
	cacheDir: "node_modules/.vite-recovery-tests",
	plugins: [tailwindcss(), react()],
	server: { host: "127.0.0.1", port: 4178, strictPort: true },
});
