import { ValidationError } from "../utils/validation-error";
import { getSupabase } from "./supabase";
import type { CartLine, Customer, OrderReceipt } from "../types/commerce";
import { validateCustomer, integer } from "../utils/commerce";
export async function createOrder(
  key: string,
  customer: Customer,
  lines: CartLine[],
): Promise<OrderReceipt> {
  validateCustomer(customer);
  if (!lines.length) throw new ValidationError("El carrito está vacío.");
  const items = lines.map((l) => ({
    variant_id: l.variant_id,
    quantity: integer(l.quantity, 1, 99, "Cantidad"),
    expected_price_cents: l.price_cents,
  }));
  const { data, error } = await getSupabase().rpc("create_order", {
    p_key: key,
    p_customer: customer,
    p_items: items,
  });
  if (error) throw error;
  return data as OrderReceipt;
}
