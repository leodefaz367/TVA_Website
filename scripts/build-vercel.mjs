import "./check-production-env.mjs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    "build",
    "--webpack",
  ],
  {
    stdio: "inherit",
    timeout: 240000,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
