import assert from "node:assert/strict";
import test from "node:test";
import {
  cents,
  integer,
  validateCustomer,
  reconcileCart,
  cartTotal,
} from "../utils/commerce.ts";
test("money validation preserves cents and rejects malformed and negative prices", () => {
  assert.equal(cents("24.99"), 2499);
  for (const input of ["-1", "1.001", "NaN", "", "1e3"])
    assert.throws(() => cents(input));
  assert.throws(() => integer(1.5, 1, 99, "Cantidad"));
});
test("checkout validates contact data beyond HTML inputs", () => {
  const valid = {
    name: "Cliente TVA",
    email: "cliente@example.com",
    phone: "0984198059",
    delivery_method: "pickup",
    notes: "",
  };
  assert.doesNotThrow(() => validateCustomer(valid));
  assert.throws(() => validateCustomer({ ...valid, email: "invalid" }));
  assert.throws(() => validateCustomer({ ...valid, phone: "abc" }));
});
test("cart reconciliation removes unavailable items and updates price/stock", () => {
  const line = {
    variant_id: "v",
    product_id: "p",
    quantity: 4,
    price_cents: 2400,
    max: 9,
  };
  const product = {
    id: "p",
    name: "Rashguard",
    status: "active",
    kind: "physical",
    product_variants: [{ id: "v", active: true, price_cents: 2600, stock: 2 }],
  };
  const result = reconcileCart([line], [product]);
  assert.equal(result.changed, true);
  assert.equal(result.lines[0].quantity, 2);
  assert.equal(cartTotal(result.lines), 5200);
  assert.deepEqual(reconcileCart([line], []).lines, []);
});
test("digital access quantity is restricted to one", () => {
  const line = {
    variant_id: "v",
    product_id: "p",
    quantity: 2,
    price_cents: 100,
    max: 9,
  };
  const product = {
    id: "p",
    name: "Curso",
    status: "active",
    kind: "course",
    product_variants: [{ id: "v", active: true, price_cents: 100, stock: 0 }],
  };
  assert.equal(reconcileCart([line], [product]).lines[0].quantity, 1);
});
import { validateBank } from "../services/bank-transfer.ts";

test("la cuenta bancaria conserva ceros iniciales y exige un titular", () => {
  const account = {
    bank: "Banco de prueba",
    account_type: "Ahorros",
    account_number: "00123456",
    identification: "0123456789",
    holder: "Titular de prueba",
  };
  assert.equal(validateBank(account).account_number, "00123456");
  assert.equal(validateBank(account).identification, "0123456789");
  assert.throws(() => validateBank({ ...account, holder: "" }));
  assert.throws(() => validateBank({ ...account, account_number: "abc" }));
});
