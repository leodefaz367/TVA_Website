import { ValidationError } from "./validation-error";
import type { CartLine, Customer, Product, Variant } from "../types/commerce";
export const money = (cents: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const variantLabel = (v: Pick<Variant, "color" | "size">) =>
  [v.color, v.size].filter(Boolean).join(" / ") || "Única";
export const primaryImage = (p: Product) =>
  [...p.product_images].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
  )[0];
export const availableVariants = (p: Product) =>
  p.product_variants.filter((v) => v.active);
export const availableStock = (p: Product, v: Variant) =>
  p.kind === "course" ? 1 : Math.min(99, v.stock);
export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((total, l) => total + l.quantity * l.price_cents, 0);
export function integer(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number {
  if (value === "" || value === null || value === undefined)
    throw new ValidationError(`${label}: campo obligatorio.`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new ValidationError(
      `${label}: ingresa un entero entre ${min} y ${max}.`,
    );
  return n;
}
export function cents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new ValidationError(
      "Precio: usa un número positivo con hasta dos decimales.",
    );
  return integer(Math.round(Number(value) * 100), 0, 100000000, "Precio");
}
export function required(value: string, label: string, max = 180): string {
  const text = value.trim();
  if (!text || text.length > max)
    throw new ValidationError(
      `${label}: campo obligatorio, máximo ${max} caracteres.`,
    );
  return text;
}
export function validateCustomer(c: Customer) {
  if (required(c.name, "Nombre").length < 2)
    throw new ValidationError("Escribe tu nombre completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) || c.email.length > 254)
    throw new ValidationError("Revisa tu correo electrónico.");
  if (!/^[+\d\s()-]{7,30}$/.test(c.phone))
    throw new ValidationError("Revisa tu teléfono.");
  if (c.notes.length > 1000)
    throw new ValidationError(
      "Las observaciones no pueden superar 1000 caracteres.",
    );
}
export function reconcileCart(lines: CartLine[], products: Product[]) {
  const updated: CartLine[] = [];
  let changed = false;
  for (const line of lines) {
    const p = products.find(
      (p) => p.id === line.product_id && p.status === "active",
    );
    const v = p?.product_variants.find(
      (v) => v.id === line.variant_id && v.active,
    );
    if (!p || !v || availableStock(p, v) < 1) {
      changed = true;
      continue;
    }
    const max = availableStock(p, v);
    const quantity = Math.min(max, line.quantity);
    if (quantity !== line.quantity || v.price_cents !== line.price_cents)
      changed = true;
    updated.push({
      ...line,
      name: p.name,
      price_cents: v.price_cents,
      quantity,
      max,
    });
  }
  return { lines: updated, changed };
}
