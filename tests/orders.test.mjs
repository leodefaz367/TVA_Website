import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://orders-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-public-key";
const { listOrders } = await import("../services/admin.ts");
const defaults = { search: "", field: "email", status: "", from: "", to: "" };

test("consulta órdenes posteriores a las 200 y conserva el total y las entregas", async (t) => {
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get("offset"), "200");
    assert.equal(url.searchParams.get("limit"), "25");
    assert.equal(url.searchParams.get("order"), "created_at.desc,id.desc");
    assert.match(new Headers(init.headers).get("prefer"), /count=exact/);
    return new Response(
      JSON.stringify([
        {
          id: "older-order",
          order_items: [
            { id: "item", order_item_deliveries: [{ id: "delivery" }] },
          ],
        },
      ]),
      {
        headers: {
          "content-type": "application/json",
          "content-range": "200-200/201",
        },
      },
    );
  });
  const result = await listOrders(9);
  assert.equal(result.total, 201);
  assert.equal(result.orders[0].id, "older-order");
  assert.equal(
    result.orders[0].order_items[0].order_item_deliveries.id,
    "delivery",
  );
});

test("aplica búsqueda y estado en servidor y fechas inclusivas de Ecuador", async (t) => {
  t.mock.method(globalThis, "fetch", async (input) => {
    const params = new URL(input).searchParams;
    assert.equal(params.get("email"), "ilike.%ana@example.com%");
    assert.equal(params.get("status"), "eq.pending");
    assert.deepEqual(params.getAll("created_at"), [
      "gte.2026-09-01T00:00:00-05:00",
      "lt.2026-10-01T05:00:00.000Z",
    ]);
    return new Response("[]", {
      headers: { "content-type": "application/json", "content-range": "*/0" },
    });
  });
  assert.deepEqual(
    await listOrders(1, {
      ...defaults,
      search: " ana@example.com ",
      status: "pending",
      from: "2026-09-01",
      to: "2026-09-30",
    }),
    { orders: [], total: 0 },
  );
});

test("referencias y fechas incorrectas no generan consultas", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("No debe consultar");
  });
  await assert.rejects(
    listOrders(1, { ...defaults, field: "id", search: "incompleta" }),
    /referencia completa/,
  );
  await assert.rejects(
    listOrders(1, { ...defaults, from: "2026-09-30", to: "2026-09-01" }),
    /fecha inicial/,
  );
  await assert.rejects(listOrders(0), /página/);
  assert.equal(fetch.mock.callCount(), 0);
});
