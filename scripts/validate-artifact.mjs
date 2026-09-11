import { access, readFile } from "node:fs/promises";
const entry = new URL("../dist/server/index.js", import.meta.url);
await access(entry);
JSON.parse(
  await readFile(
    new URL("../dist/.openai/hosting.json", import.meta.url),
    "utf8",
  ),
);
const worker = await import(entry.href);
if (typeof worker.default?.fetch !== "function")
  throw new Error("The built Worker must export default.fetch.");
console.log("Validated Sites Worker and hosting manifest.");
