"use client";
import { ValidationError } from "../../utils/validation-error";

import Link from "next/link";
import BankTransferDetails from "./BankTransferDetails";
import { useEffect, useState, type FormEvent } from "react";
import { useCart } from "../../hooks/useCart";
import type { CartLine, Customer, OrderReceipt } from "../../types/commerce";
import {
  cartTotal,
  money,
  reconcileCart,
  validateCustomer,
} from "../../utils/commerce";
import { createOrder } from "../../services/orders";
import { listProducts } from "../../services/catalog";
import { errorMessage } from "../../services/errors";
interface Submission {
  key: string;
  customer: Customer;
  lines: CartLine[];
}
const pendingKey = "tva-pending-order";
export default function Checkout() {
  const cart = useCart();
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    delivery_method: "pickup",
    notes: "",
  });
  const [pending, setPending] = useState<Submission | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Hydrate the browser-only retry draft after the server-rendered form mounts.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(pendingKey);
      if (saved) {
        const data = JSON.parse(saved) as Submission;
        if (data.key && data.customer && Array.isArray(data.lines)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPending(data);
          setCustomer(data.customer);
        }
      }
    } catch {
      /* Discard invalid draft. */
    }
  }, []);
  async function send(submission: Submission) {
    const result = await createOrder(
      submission.key,
      submission.customer,
      submission.lines,
    );
    setReceipt(result);
    setPending(null);
    cart.replace([]);
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {
      /* No persisted draft. */
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (pending) {
        await send(pending);
        return;
      }
      const buyer = {
        ...customer,
        delivery_method: cart.lines.some((l) => l.kind === "physical")
          ? ("pickup" as const)
          : ("digital" as const),
      };
      validateCustomer(buyer);
      const checked = reconcileCart(cart.lines, await listProducts());
      cart.replace(checked.lines);
      if (checked.changed)
        throw new ValidationError(
          "Cambió el precio o la disponibilidad. Revisa el resumen y confirma de nuevo.",
        );
      if (!checked.lines.length)
        throw new ValidationError("Tu carrito está vacío.");
      const submission = {
        key: crypto.randomUUID(),
        customer: buyer,
        lines: checked.lines,
      };
      // Keep the same request on retry, even if a successful response was lost.
      try {
        sessionStorage.setItem(pendingKey, JSON.stringify(submission));
      } catch {
        /* In-memory retry remains available. */
      }
      setPending(submission);
      await send(submission);
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      const code = (e as { message?: string })?.message ?? "";
      if (
        /INSUFFICIENT_STOCK|VARIANT_UNAVAILABLE|PRODUCT_UNAVAILABLE|PRICE_CHANGED|INVALID_|PICKUP_REQUIRED|DIGITAL_QUANTITY/.test(
          code,
        )
      ) {
        setPending(null);
        try {
          sessionStorage.removeItem(pendingKey);
        } catch {
          /* No persisted draft. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div className="notice success">
        <h2>Orden recibida</h2>
        <p>
          Referencia: <strong className="break-word">{receipt.id}</strong>
        </p>
        <p>Total: {money(receipt.total_cents)}</p>
        <p>
          Estado: pendiente de confirmación. Todavía no se ha realizado ningún
          cobro. Conserva esta referencia; la academia coordinará el pago y la
          entrega contigo.
        </p>
        <Link className="button button-primary" href="/contacto">
          Contactar a la academia
        </Link>
        <BankTransferDetails orderId={receipt.id} />
      </div>
    );
  if (!cart.ready) return <p role="status">Cargando…</p>;
  const lines = pending?.lines ?? cart.lines;
  if (!lines.length)
    return (
      <div className="notice">
        <p>Agrega productos antes de continuar.</p>
        <Link href="/tienda">Ir a la tienda</Link>
      </div>
    );
  return (
    <div className="checkout-grid">
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy || !!pending}>
          <legend>Datos de contacto</legend>
          <label>
            Nombre completo
            <input
              autoComplete="name"
              value={customer.name}
              maxLength={180}
              onChange={(e) =>
                setCustomer({ ...customer, name: e.target.value })
              }
            />
          </label>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              aria-describedby={
                lines.some((l) => l.kind === "course")
                  ? "correo-drive"
                  : undefined
              }
              maxLength={254}
              value={customer.email}
              onChange={(e) =>
                setCustomer({ ...customer, email: e.target.value })
              }
            />
          </label>
          <label>
            Teléfono / WhatsApp
            <input
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={customer.phone}
              onChange={(e) =>
                setCustomer({ ...customer, phone: e.target.value })
              }
            />
          </label>
          {lines.some((l) => l.kind === "course") && (
            <p id="correo-drive" className="notice">
              Para tus instruccionales, utiliza el correo de la cuenta de Google
              con la que abrirás Drive; no tiene que ser Gmail. Tras verificar
              el pago, autorizaremos esa cuenta y enviaremos el enlace por
              WhatsApp o correo. El acceso es manual.
            </p>
          )}
          <label>
            Observaciones
            <textarea
              maxLength={1000}
              value={customer.notes}
              onChange={(e) =>
                setCustomer({ ...customer, notes: e.target.value })
              }
            />
          </label>
        </fieldset>
        {pending && (
          <p className="notice">
            Hay una solicitud en curso. Puedes reintentarla con la misma
            referencia sin crear otra orden.
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" disabled={busy}>
          {busy
            ? "Enviando…"
            : pending
              ? "Reintentar solicitud"
              : "Confirmar orden sin pago en línea"}
        </button>
      </form>
      <aside className="order-summary">
        <h2>Tu orden</h2>
        {lines.map((l) => (
          <p key={l.variant_id}>
            {l.quantity} × {l.name} · {l.label}
            <br />
            <strong>{money(l.quantity * l.price_cents)}</strong>
          </p>
        ))}
        <hr />
        <p>
          Total: <strong>{money(cartTotal(lines))}</strong>
        </p>
        <p>
          {lines.some((l) => l.kind === "physical")
            ? "Retiro en Team Vivas Academy. No se añade costo de envío."
            : "Acceso en Drive para la cuenta de Google indicada, después de verificar el pago."}
        </p>
        <p>
          La academia confirmará disponibilidad, pago y entrega por los datos de
          contacto indicados.
        </p>
        <Link href="/carrito">Revisar carrito</Link>
        <BankTransferDetails />
      </aside>
    </div>
  );
}
