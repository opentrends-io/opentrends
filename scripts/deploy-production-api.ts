import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "bun";
import { assertProductionModelBindings } from "../packages/infra/src/production-model-policy";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const args = process.argv.slice(2);
const candidate = args[0];
const deploy = args.includes("--deploy");
const expectedCurrent = args[args.indexOf("--expected-current") + 1];
if (
	!(candidate && UUID.test(candidate)) ||
	(deploy &&
		!(args.includes("--expected-current") && UUID.test(expectedCurrent ?? "")))
) {
	throw new Error(
		"Usage: bun run deploy:production:api <version-id> [--deploy --expected-current <active-version-id>]"
	);
}

const worker = "opentrends-api-production";
const webDirectory = fileURLToPath(new URL("../apps/web/", import.meta.url));
const require = createRequire(
	new URL("../apps/web/package.json", import.meta.url)
);
const wrangler = require.resolve("wrangler/bin/wrangler.js");

async function run(command: string[], json = false): Promise<unknown> {
	const child = spawn(["node", wrangler, ...command, "--name", worker], {
		cwd: webDirectory,
		env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
		stdout: "pipe",
		stderr: "pipe",
		timeout: 120_000,
	});
	const [stdout, , code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	// Version responses contain all bindings: never print their raw JSON.
	if (code !== 0) {
		throw new Error(
			`Wrangler ${command.slice(0, 2).join(" ")} failed (${code}); no automatic retry`
		);
	}
	return json ? JSON.parse(stdout) : undefined;
}

interface Version {
	resources: { bindings: { name: string; type: string; text?: string }[] };
}
interface Deployment {
	created_on: string;
	versions: { version_id: string; percentage: number }[];
}

async function assertActive(expected: string) {
	const list = (await run(
		["deployments", "list", "--json"],
		true
	)) as Deployment[];
	const current = list.sort((a, b) =>
		b.created_on.localeCompare(a.created_on)
	)[0];
	if (
		current?.versions.length !== 1 ||
		current.versions[0]?.version_id !== expected ||
		current.versions[0]?.percentage !== 100
	) {
		throw new Error(
			"Production changed or is split; inspect before continuing"
		);
	}
}

const version = (await run(
	["versions", "view", candidate, "--json"],
	true
)) as Version;
assertProductionModelBindings(version.resources.bindings);
console.info(`Verified approved production models in version ${candidate}`);
if (deploy) {
	await assertActive(expectedCurrent as string);
	await run(["versions", "deploy", `${candidate}@100%`, "--yes"]);
	await assertActive(candidate);
	const active = (await run(
		["versions", "view", candidate, "--json"],
		true
	)) as Version;
	assertProductionModelBindings(active.resources.bindings);
	console.info(`Verified production deployment at 100%: ${candidate}`);
}
