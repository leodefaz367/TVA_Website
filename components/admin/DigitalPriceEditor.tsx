"use client";
import { useState } from "react";
import type { Product } from "../../types/commerce";
import { saveVariant } from "../../services/admin";
import { cents, money } from "../../utils/commerce";
import { useAction } from "../../hooks/useAction";
import ActionFeedback from "./ActionFeedback";

export default function DigitalPriceEditor({
  product,
  reload,
}: {
  product: Product;
  reload: () => void;
}) {
  const current = product.product_variants[0];
  const [price, setPrice] = useState(
    current ? (current.price_cents / 100).toFixed(2) : "",
  );
  const action = useAction();
  return (
    <section className="admin-section">
      <h3>Precio del acceso digital</h3>
      <p>
        {current
          ? `Precio guardado: ${money(current.price_cents)}.`
          : "Guarda el precio para habilitar la venta."}{" "}
        Un acceso por instruccional y por orden.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await saveVariant(
              {
                product_id: product.id,
                sku: current?.sku ?? `CURSO-${product.id}`,
                color: "",
                size: "",
                price_cents: cents(price),
                stock: 0,
                active: true,
              },
              current?.id,
              current?.stock,
            );
            reload();
          }, "Precio del acceso guardado.");
        }}
      >
        <fieldset disabled={action.busy}>
          <label>
            Precio en USD
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <button className="button button-primary">Guardar precio</button>
        </fieldset>
      </form>
      <ActionFeedback {...action} />
    </section>
  );
}
