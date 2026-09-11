"use client";
import { useState, type FormEvent } from "react";
import type { Product, Variant } from "../../types/commerce";
import { saveVariant } from "../../services/admin";
import { useAction } from "../../hooks/useAction";
import {
  cents,
  integer,
  money,
  required,
  variantLabel,
} from "../../utils/commerce";
import ActionFeedback from "./ActionFeedback";
interface Draft {
  expectedStock?: number;
  id?: string;
  sku: string;
  color: string;
  size: string;
  price: string;
  stock: string;
  active: boolean;
}
const empty: Draft = {
  sku: "",
  color: "",
  size: "",
  price: "",
  stock: "0",
  active: true,
};
export default function VariantEditor({
  product: p,
  reload,
}: {
  product: Product;
  reload: () => void;
}) {
  const [form, setForm] = useState<Draft>(empty);
  const action = useAction();
  function edit(v: Variant) {
    setForm({
      expectedStock: v.stock,
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      price: (v.price_cents / 100).toFixed(2),
      stock: String(v.stock),
      active: v.active,
    });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      await saveVariant(
        {
          product_id: p.id,
          sku: required(form.sku, "SKU", 100),
          color: p.kind === "course" ? "" : form.color.trim(),
          size: p.kind === "course" ? "" : form.size.trim(),
          price_cents: cents(form.price),
          stock:
            p.kind === "course" ? 0 : integer(form.stock, 0, 1000000, "Stock"),
          active: form.active,
        },
        form.id,
        form.expectedStock,
      );
      setForm(empty);
      reload();
    });
  }
  return (
    <section className="admin-section">
      <h3>Variantes y stock</h3>
      <p>
        {p.kind === "course"
          ? "Crea una variante de acceso digital. El stock no limita los cursos; solo se permite un acceso por orden."
          : "Cada combinación tiene su propio precio y stock. El stock mostrado ya descuenta las órdenes pendientes."}
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Variante</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {p.product_variants.map((v) => (
              <tr key={v.id}>
                <td>{v.sku}</td>
                <td>{variantLabel(v)}</td>
                <td>{money(v.price_cents)}</td>
                <td>{p.kind === "course" ? "Digital" : v.stock}</td>
                <td>{v.active ? "Activa" : "Desactivada"}</td>
                <td>
                  <button onClick={() => edit(v)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={action.busy}>
          <legend>{form.id ? "Editar variante" : "Agregar variante"}</legend>
          <div className="form-grid">
            <label>
              SKU
              <input
                maxLength={100}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </label>
            <label>
              Color
              <input
                disabled={p.kind === "course"}
                maxLength={80}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </label>
            <label>
              Talla
              <input
                disabled={p.kind === "course"}
                maxLength={40}
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </label>
            <label>
              Precio USD
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label>
              Stock disponible
              <input
                disabled={p.kind === "course"}
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Activa
            </label>
          </div>
          <div className="form-actions">
            <button className="button button-primary">Guardar variante</button>
            {form.id && (
              <button type="button" onClick={() => setForm(empty)}>
                Cancelar edición
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <ActionFeedback {...action} />
    </section>
  );
}
