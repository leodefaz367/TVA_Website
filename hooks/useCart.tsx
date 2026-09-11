"use client";
import { ValidationError } from "../utils/validation-error";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, Product, Variant } from "../types/commerce";
import { availableStock, primaryImage, variantLabel } from "../utils/commerce";
type Action =
  | { type: "replace"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "quantity"; id: string; quantity: number }
  | { type: "remove"; id: string };
export function cartReducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "replace":
      return action.lines;
    case "remove":
      return state.filter((l) => l.variant_id !== action.id);
    case "quantity":
      return state.map((l) =>
        l.variant_id === action.id
          ? {
              ...l,
              quantity: Math.min(
                l.max,
                Math.max(1, Math.floor(action.quantity) || 1),
              ),
            }
          : l,
      );
    case "add": {
      const old = state.find((l) => l.variant_id === action.line.variant_id);
      const next = {
        ...action.line,
        quantity: Math.min(
          action.line.max,
          action.line.quantity + (old?.quantity ?? 0),
        ),
      };
      return old
        ? state.map((l) => (l.variant_id === next.variant_id ? next : l))
        : [...state, next];
    }
  }
}
interface CartContextValue {
  lines: CartLine[];
  ready: boolean;
  add: (p: Product, v: Variant, q: number) => void;
  quantity: (id: string, q: number) => void;
  remove: (id: string) => void;
  replace: (lines: CartLine[]) => void;
}
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tva-cart-v1";
function isCartLine(x: unknown): x is CartLine {
  if (!x || typeof x !== "object") return false;
  const l = x as CartLine;
  return (
    ["variant_id", "product_id", "name", "slug", "label", "image"].every(
      (k) => typeof l[k as keyof CartLine] === "string",
    ) &&
    ["physical", "course"].includes(l.kind) &&
    Number.isInteger(l.quantity) &&
    l.quantity > 0 &&
    l.quantity <= 99 &&
    Number.isInteger(l.max) &&
    l.max > 0 &&
    Number.isInteger(l.price_cents) &&
    l.price_cents >= 0
  );
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      );
      if (Array.isArray(stored))
        dispatch({
          type: "replace",
          lines: stored.filter(isCartLine).slice(0, 50),
        });
    } catch {
      /* Damaged draft is disposable. */
    }
    // Hydrate browser-only storage once after SSR, keeping the initial server tree stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch {
        /* Memory state remains available. */
      }
    }
  }, [lines, ready]);
  function add(p: Product, v: Variant, q: number) {
    const max = availableStock(p, v);
    if (!v.active || max < 1 || !Number.isInteger(q) || q < 1 || q > max)
      throw new ValidationError("Revisa la cantidad y la disponibilidad.");
    const previous = lines.find((l) => l.variant_id === v.id)?.quantity ?? 0;
    if (previous + q > max)
      throw new ValidationError(
        "La cantidad total del carrito supera la disponibilidad.",
      );
    dispatch({
      type: "add",
      line: {
        variant_id: v.id,
        product_id: p.id,
        name: p.name,
        slug: p.slug,
        kind: p.kind,
        label: variantLabel(v),
        image: primaryImage(p)?.url ?? "",
        price_cents: v.price_cents,
        quantity: q,
        max,
      },
    });
  }
  return (
    <CartContext.Provider
      value={{
        lines,
        ready,
        add,
        quantity: (id, quantity) =>
          dispatch({ type: "quantity", id, quantity }),
        remove: (id) => dispatch({ type: "remove", id }),
        replace: (lines) => dispatch({ type: "replace", lines }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new ValidationError("CartProvider no está disponible.");
  return value;
}
