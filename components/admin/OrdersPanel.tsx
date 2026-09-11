"use client";
import {
  listOrders,
  changeOrderStatus,
  listDeliverySettings,
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
export default function OrdersPanel() {
  const resource = useResource(listOrders);
  const deliveries = useResource(loadDeliveryData);
  const action = useAction();
  return (
    <section>
      <div className="section-toolbar">
        <h2>Órdenes recientes</h2>
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
        Hasta 200 órdenes recientes. Confirma una orden después de verificar el
        pago fuera de la web. Cancelarla devuelve el stock reservado.
      </p>
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
      {!resource.loading && !resource.error && !resource.data?.length && (
        <p className="notice">Todavía no hay órdenes.</p>
      )}
      {resource.data?.map((o) => (
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
            {o.delivery_method === "pickup" ? "Retiro en academia" : "Digital"}
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
