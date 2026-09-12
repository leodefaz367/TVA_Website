import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const origin = "http://127.0.0.1:4174";
let server;
before(async () => {
  server = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/next/dist/bin/next", import.meta.url),
      ),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4174",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    },
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("El servidor local de pruebas no inició")),
      20000,
    );
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`El servidor de pruebas salió (${code})`));
    });
    server.on("error", reject);
  });
});
after(() => server?.kill());
for (const path of [
  "/",
  "/academia",
  "/profesor",
  "/tienda",
  "/instruccionales",
  "/contacto",
  "/carrito",
  "/checkout",
  "/admin",
]) {
  test("Next producción sirve y refresca " + path, async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<html[^>]*lang="es"/);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      const csp = response.headers.get("content-security-policy");
      const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
      assert.ok(nonce);
      for (const script of html.matchAll(/<script\b([^>]*)>/g)) {
        assert.ok(
          script[1].includes(`nonce="${nonce}"`),
          "Cada script usa el nonce de la respuesta",
        );
      }
      if (path === "/admin") {
        assert.match(html, /Acceso privado|Comprobando sesión/);
        assert.doesNotMatch(
          html,
          /request_fingerprint|recipient_email|drive_url/,
        );
        assert.match(response.headers.get("x-robots-tag"), /noindex/);
      }
    }
  });
}
test("rutas manipuladas devuelven 404; mutaciones e imágenes no usadas están bloqueadas", async () => {
  for (const path of [
    "/ruta-inexistente",
    "/admin/usuarios",
    "/tienda/invalid_slug",
    "/instruccionales/invalid_slug",
    "/_next/image?url=https://evil.test/file",
  ]) {
    assert.equal((await fetch(origin + path)).status, 404, path);
  }
  const attack = await fetch(origin + "/admin", {
    method: "POST",
    headers: { origin: "https://evil.test", "next-action": "forged" },
    body: "{}",
  });
  assert.equal(attack.status, 405);
  assert.equal(attack.headers.get("access-control-allow-origin"), null);
});
