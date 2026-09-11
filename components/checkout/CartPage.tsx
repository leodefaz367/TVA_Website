"use client";
import SiteImage from "../SiteImage";

import Link from "next/link";
import BankTransferDetails from "./BankTransferDetails";
import { useState } from "react";
import { useCart } from "../../hooks/useCart";
import { cartTotal, money, reconcileCart } from "../../utils/commerce";
import { listProducts } from "../../services/catalog";
import { errorMessage } from "../../services/errors";
export default function CartPage() {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true);
    try {
      const result = reconcileCart(cart.lines, await listProducts());
      cart.replace(result.lines);
      setMessage(
        result.changed
          ? "Actualizamos precios o cantidades según la disponibilidad actual."
          : "Precios y disponibilidad comprobados.",
      );
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!cart.ready) return <p role="status">Cargando carrito…</p>;
  if (!cart.lines.length)
    return (
      <div className="notice">
        <p>Tu carrito está vacío.</p>
        <Link className="button button-primary" href="/tienda">
          Explorar tienda
        </Link>
      </div>
    );
  return (
    <div className="cart-payment-grid">
      <div className="cart-lines">
        {cart.lines.map((l) => (
          <article className="cart-row" key={l.variant_id}>
            {l.image && (
              <SiteImage src={l.image} alt="" width="100" height="100" />
            )}
            <div>
              <Link
                href={
                  "/" +
                  (l.kind === "course" ? "instruccionales" : "tienda") +
                  "/" +
                  l.slug
                }
              >
                <strong>{l.name}</strong>
              </Link>
              <p>
                {l.label} · {money(l.price_cents)}
              </p>
            </div>
            <label>
              Cantidad
              <input
                aria-label={"Cantidad de " + l.name}
                type="number"
                min="1"
                max={l.max}
                disabled={l.kind === "course"}
                value={l.quantity}
                onChange={(e) =>
                  cart.quantity(l.variant_id, Number(e.target.value))
                }
              />
            </label>
            <strong>{money(l.quantity * l.price_cents)}</strong>
            <button
              className="text-button"
              onClick={() => cart.remove(l.variant_id)}
            >
              Eliminar
            </button>
          </article>
        ))}
      </div>
      <div className="order-summary">
        <h2>Subtotal: {money(cartTotal(cart.lines))}</h2>
        <p>
          Productos físicos: retiro en la academia. Instruccionales: entrega
          digital después de confirmar el pago. No se cobra en línea.
        </p>
        <div className="form-actions">
          <button
            className="button button-ghost"
            onClick={refresh}
            disabled={busy}
          >
            {busy ? "Comprobando…" : "Comprobar disponibilidad"}
          </button>
          <Link className="button button-primary" href="/checkout">
            Continuar con la orden
          </Link>
        </div>
        {message && <p role="status">{message}</p>}
        <BankTransferDetails />
      </div>
    </div>
  );
}
