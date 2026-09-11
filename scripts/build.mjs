import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.env.WRANGLER_WRITE_LOGS ??= "false";
process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
for (const [path, args] of [
  [
    "../node_modules/typescript/bin/tsc",
    ["--noEmit", "--incremental", "false"],
  ],
  ["../node_modules/vinext/dist/cli.js", ["build"]],
]) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(path, import.meta.url)), ...args],
    { stdio: "inherit", timeout: 180000, env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await import("./validate-artifact.mjs");
