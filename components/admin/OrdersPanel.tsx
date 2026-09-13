"use client";
import { useCallback, useState } from "react";
import {
  listOrders,
  changeOrderStatus,
  listDeliverySettings,
  ORDERS_PAGE_SIZE,
  type OrderFilters,
} from "../../services/admin";
import { listProducts } from "../../services/catalog";
import OrderDelivery from "./OrderDelivery";
import { useResource } from "../../hooks/useResource";
import { useAction } from "../../hooks/useAction";
import { money } from "../../utils/commerce";
import type { OrderStatus } from "../../types/commerce";
import ActionFeedback from "./ActionFeedback";
import { AsyncState } from "../AsyncState";
const labels: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Pago confirmado",
  fulfilled: "Entregada",
  cancelled: "Cancelada",
};
async function loadDeliveryData() {
  const [settings, products] = await Promise.all([
    listDeliverySettings(),
    listProducts("course", true),
  ]);
  return { settings, products };
}
const emptyFilters: OrderFilters = {
  search: "",
  field: "email",
  status: "",
  from: "",
  to: "",
};
export default function OrdersPanel() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<OrderFilters>(emptyFilters);
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);
  const loader = useCallback(() => listOrders(page, filters), [page, filters]);
  const resource = useResource(loader);
  const totalPages = Math.max(
    1,
    Math.ceil((resource.data?.total ?? 0) / ORDERS_PAGE_SIZE),
  );
  const deliveries = useResource(loadDeliveryData);
  const action = useAction();
  return (
    <section>
      <div className="section-toolbar">
        <h2>Historial de órdenes</h2>
        <button
          onClick={() => {
            resource.reload();
            deliveries.reload();
          }}
        >
          Actualizar
        </button>
      </div>
      <p>
        Consulta todo el historial, con 25 órdenes por página. Confirma una
        orden después de verificar el pago fuera de la web. Cancelarla devuelve
        el stock reservado.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters({ ...draft });
        }}
      >
        <div className="form-grid">
          <label>
            Buscar por
            <select
              value={draft.field}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  field: e.target.value as OrderFilters["field"],
                })
              }
            >
              <option value="email">Correo</option>
              <option value="customer_name">Nombre</option>
              <option value="id">Referencia completa</option>
            </select>
          </label>
          <label>
            Búsqueda
            <input
              value={draft.search}
              maxLength={254}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            />
          </label>
          <label>
            Estado
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  status: e.target.value as OrderFilters["status"],
                })
              }
            >
              <option value="">Todos los estados</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde (fecha de creación)
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label>
            Hasta (fecha de creación)
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
        </div>
        <p>Las fechas se consultan en horario de Ecuador continental.</p>
        <div className="form-actions">
          <button disabled={resource.loading}>Aplicar filtros</button>
          <button
            type="button"
            onClick={() => {
              setDraft(emptyFilters);
              setFilters(emptyFilters);
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </form>
      <AsyncState
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      <p>
        Confirmar el pago no concede acceso a Drive ni envía enlaces. Registra
        las entregas por artículo después de realizarlas.
      </p>
      <AsyncState
        loading={deliveries.loading}
        error={deliveries.error}
        retry={deliveries.reload}
      />
      <ActionFeedback {...action} />
      {!resource.loading &&
        !resource.error &&
        !resource.data?.orders.length && (
          <p className="notice">
            No hay órdenes en esta página con los filtros aplicados.
          </p>
        )}
      <nav className="form-actions" aria-label="Páginas de órdenes">
        <button
          disabled={resource.loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span role="status">
          {resource.loading
            ? "Cargando órdenes…"
            : resource.error
              ? "No se pudo cargar la página"
              : `Página ${page} · ${resource.data?.total ?? 0} órdenes encontradas`}
        </span>
        <button
          disabled={resource.loading || !!resource.error || page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
        {page > 1 && (
          <button disabled={resource.loading} onClick={() => setPage(1)}>
            Primera página
          </button>
        )}
      </nav>
      {!resource.loading &&
        !resource.error &&
        resource.data?.orders.map((o) => (
          <details className="order-detail" key={o.id}>
            <summary>
              {new Date(o.created_at).toLocaleDateString("es-EC")} ·{" "}
              {o.customer_name} · {money(o.total_cents)} · {labels[o.status]}
            </summary>
            <p className="break-word">Referencia: {o.id}</p>
            <p>
              {o.email} · {o.phone}
            </p>
            <p>
              Entrega:{" "}
              {o.delivery_method === "pickup"
                ? "Retiro en academia"
                : "Digital"}
            </p>
            <p className="preserve-lines">{o.notes}</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto / SKU</th>
                    <th>Variante</th>
                    <th>Cantidad</th>
                    <th>Precio histórico</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {o.order_items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.product_name}
                        <br />
                        {i.sku}
                      </td>
                      <td>{i.variant_label}</td>
                      <td>{i.quantity}</td>
                      <td>{money(i.unit_price_cents)}</td>
                      <td>{money(i.quantity * i.unit_price_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Total: {money(o.total_cents)}</p>
            <p>
              {o.status === "fulfilled"
                ? "Todos los artículos entregados"
                : `${o.order_items.filter((i) => i.order_item_deliveries).length} de ${o.order_items.length} artículos entregados`}
            </p>
            {o.order_items.map((i) => (
              <OrderDelivery
                key={i.id}
                order={o}
                item={i}
                driveUrl={
                  deliveries.data?.settings.find(
                    (s) => s.product_id === i.product_id,
                  )?.drive_url
                }
                note={
                  deliveries.data?.products.find((p) => p.id === i.product_id)
                    ?.instructional_courses?.delivery_note
                }
                reload={resource.reload}
              />
            ))}
            <div className="form-actions">
              {(o.status === "pending"
                ? ["confirmed", "cancelled"]
                : o.status === "confirmed" &&
                    !o.order_items.some((i) => i.order_item_deliveries)
                  ? ["cancelled"]
                  : []
              ).map((s) => (
                <button
                  key={s}
                  disabled={action.busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "¿Cambiar la orden a " + labels[s as OrderStatus] + "?",
                      )
                    )
                      void action.run(async () => {
                        await changeOrderStatus(o.id, s as OrderStatus);
                        resource.reload();
                      });
                  }}
                >
                  {labels[s as OrderStatus]}
                </button>
              ))}
            </div>
          </details>
        ))}
    </section>
  );
}
