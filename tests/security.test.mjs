import test from "node:test";
import assert from "node:assert/strict";
import { errorMessage } from "../services/errors.ts";
import { ValidationError } from "../utils/validation-error.ts";
import {
  validateImageFile,
  safeImageSource,
} from "../utils/image-validation.ts";
import { securityPolicy, secureResponse } from "../worker/security.ts";
import { canonicalUrl, primaryOrigin } from "../utils/site-origin.ts";

test("el dominio principal conserva rutas y no acepta redirecciones a orígenes inseguros", () => {
  assert.equal(
    canonicalUrl(
      "https://www.academia.test/tienda?a=1",
      "https://academia.test",
    ),
    "https://academia.test/tienda?a=1",
  );
  assert.equal(
    canonicalUrl("http://127.0.0.1:5173/admin", "https://academia.test"),
    null,
  );
  for (const url of [
    "http://academia.test",
    "https://evil@academia.test",
    "https://academia.test/path",
    "https://academia.test/?url=evil",
  ])
    assert.throws(() => primaryOrigin(url));
});
test("internal errors never escape to users; authored validation remains useful", () => {
  assert.doesNotMatch(
    errorMessage(new Error("SQL internal /private/server password=secret")),
    /SQL|password|private/,
  );
  assert.equal(
    errorMessage(new ValidationError("Revisa tu teléfono.")),
    "Revisa tu teléfono.",
  );
  assert.match(
    errorMessage({ code: "23503", message: "private schema" }),
    /registro/,
  );
});
test("images reject fake MIME, SVG, empty files and unexpected origins", async () => {
  for (const file of [
    new File(["<svg onload=alert(1)>"], "a.png", { type: "image/png" }),
    new File(["x"], "a.svg", { type: "image/svg+xml" }),
    new File([], "a.jpg", { type: "image/jpeg" }),
  ])
    await assert.rejects(() => validateImageFile(file));
  await validateImageFile(
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "a.png", {
      type: "image/png",
    }),
  );
  for (const url of [
    "javascript:alert(1)",
    "//evil.test/a.png",
    "https://evil.test/a.png",
    "/assets/../secret",
  ])
    assert.equal(
      safeImageSource(url, "https://test.supabase.co"),
      "/assets/logo-tva.png",
    );
  assert.equal(safeImageSource("/assets/test.png"), "/assets/test.png");
});
test("production policy restricts scripts, framing, origins, caching and HTTPS", () => {
  const csp = securityPolicy("abc123", "https://test.supabase.co");
  assert.match(csp, /script-src 'self' 'nonce-abc123'/);
  assert.doesNotMatch(
    csp.split(";").find((v) => v.trim().startsWith("script-src ")),
    /unsafe-inline|unsafe-eval|\*/,
  );
  const response = secureResponse(
    new Response("ok", { headers: { "content-type": "text/html" } }),
    new Request("https://site.test"),
    csp,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(
    response.headers.get("strict-transport-security"),
    "max-age=31536000",
  );
});
