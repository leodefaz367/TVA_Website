import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
const patterns = [
  /sb_secret_[A-Za-z0-9_-]{20,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /AKIA[0-9A-Z]{16}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /(?:postgres(?:ql)?):\/\/[^\s:@]+:[^\s@]+@/g,
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/g,
];
const findings = [];
function scan(text, source) {
  if (
    patterns.some((p) => {
      p.lastIndex = 0;
      return p.test(text);
    })
  )
    findings.push(source + ": private credential pattern");
  for (const jwt of text.matchAll(
    /eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g,
  )) {
    try {
      if (JSON.parse(Buffer.from(jwt[1], "base64url")).role === "service_role")
        findings.push(source + ": privileged JWT");
    } catch {
      /* Not a JWT payload. */
    }
  }
}
const paths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
for (const path of paths.filter(
  (p) => /\.(?:tsx?|m?js|json|md|sql|ya?ml)$/.test(p) || p === ".env.example",
))
  scan(await readFile(path, "utf8"), path);
for (const name of (await readdir(".")).filter(
  (p) => p.startsWith(".env") && p !== ".env.example",
)) {
  const text = await readFile(name, "utf8");
  scan(text, name);
  for (const line of text.split("\n"))
    if (
      /^(?:VITE_|NEXT_PUBLIC_).*(?:SECRET|SERVICE_ROLE|PASSWORD|PRIVATE|DATABASE_URL)=.+/.test(
        line,
      )
    )
      findings.push(name + ": private variable exposed to Vite");
}
scan(
  execFileSync(
    "git",
    ["log", "--all", "-p", "--format=", "--", ".", ":!package-lock.json"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  ),
  "reachable Git history",
);
let artifactFiles = 0;
async function scanDirectory(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const child = path + "/" + entry.name;
    if (entry.isDirectory()) await scanDirectory(child);
    else if (/\.(?:html|m?js|json|map|txt|rsc)$/.test(entry.name)) {
      scan(await readFile(child, "utf8"), child);
      artifactFiles++;
    }
  }
}
await scanDirectory("dist");
await scanDirectory(".next-production/static");
await scanDirectory(".next-production/server/app");
if (!artifactFiles)
  throw new Error("Compila antes de comprobar secretos en el artefacto final.");
if (findings.length) {
  console.error([...new Set(findings)].join("\n"));
  process.exit(1);
}
console.log(
  `Secret patterns: no findings in source, local env, reachable Git history or ${artifactFiles} build files. Heuristic scan; not proof of absence.`,
);
