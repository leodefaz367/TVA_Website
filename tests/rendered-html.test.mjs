import assert from "node:assert/strict";
import test from "node:test";
const { default: worker } = await import("../dist/server/index.js");
for (const route of [
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
  test("production Worker renders " + route, async () => {
    const response = await worker.fetch(
      new Request("http://localhost" + route, {
        headers: { accept: "text/html" },
      }),
      {
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<html[^>]*lang="es"/);
    assert.match(html, /<title>[^<]*Team Vivas Academy/);
    assert.doesNotMatch(html, /Internal Server Error/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const csp = response.headers.get("content-security-policy");
    const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, "CSP nonce exists");
    for (const script of html.matchAll(/<script\b([^>]*)>/g))
      assert.ok(
        script[1].includes(`nonce="${nonce}"`),
        "Every framework script has the response nonce",
      );
  });
}
test("unknown route returns HTTP 404", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/not-a-route"),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 404);
});
test("Worker rejects unused mutation and image parsing endpoints", async () => {
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const response = await worker.fetch(
    new Request("https://site.test/admin", {
      method: "POST",
      headers: { origin: "https://evil.test", "next-action": "fake" },
    }),
    env,
    ctx,
  );
  assert.equal(response.status, 405);
  assert.equal(
    (
      await worker.fetch(
        new Request("https://site.test/_vinext/image?url=https://evil.test"),
        env,
        ctx,
      )
    ).status,
    404,
  );
  assert.equal(
    (await worker.fetch(new Request("http://site.test/admin"), env, ctx))
      .status,
    308,
  );
});
