"use client";
import { useState } from "react";
import type { DeliveryChannel, Order, OrderItem } from "../../types/commerce";
import { recordItemDelivery } from "../../services/admin";
import { deliveryMessage } from "../../utils/instructionals";
import { ValidationError } from "../../utils/validation-error";
import { useAction } from "../../hooks/useAction";
import ActionFeedback from "./ActionFeedback";

export const deliveryChannels: Record<DeliveryChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Correo electrónico",
  other: "Otro medio",
  pickup: "Retiro en academia",
};
export default function OrderDelivery({
  order,
  item,
  driveUrl,
  note,
  reload,
}: {
  order: Order;
  item: OrderItem;
  driveUrl?: string;
  note?: string;
  reload: () => void;
}) {
  const [channel, setChannel] = useState<DeliveryChannel>(
    item.kind === "course" ? "whatsapp" : "pickup",
  );
  const [checked, setChecked] = useState(false);
  const action = useAction();
  const delivery = item.order_item_deliveries;
  const legacy = order.status === "fulfilled" && !delivery;
  const digital = item.kind === "course";
  const url = delivery?.drive_url ?? driveUrl;
  const email = delivery?.recipient_email ?? order.email;
  const copy = (text: string) =>
    void action.run(async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        throw new ValidationError(
          "No se pudo copiar. Selecciona el texto y cópialo manualmente.",
        );
      }
    }, "Texto copiado. No se ha enviado ningún mensaje ni registrado una entrega.");
  return (
    <article className="delivery-card">
      <h4>
        {item.product_name}
        {item.quantity > 1 ? ` · ${item.quantity} unidades` : ""}
      </h4>
      <p>
        {delivery
          ? `Entregado el ${new Date(delivery.delivered_at).toLocaleString("es-EC")} · ${deliveryChannels[delivery.channel]}`
          : legacy
            ? "Entregado según el estado anterior de la orden; no hay registro individual de fecha o medio."
            : order.status === "cancelled"
              ? "Orden cancelada"
              : order.status === "pending"
                ? "Pendiente de verificar el pago"
                : "Pago confirmado · entrega pendiente"}
      </p>
      {digital && (
        <>
          <p className="break-word">
            Cuenta de Google que debes autorizar: <strong>{email}</strong>
          </p>
          <button disabled={action.busy} onClick={() => copy(email)}>
            Copiar correo
          </button>
          {url ? (
            <>
              <p className="break-word">
                Enlace privado:{" "}
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </p>
              <button disabled={action.busy} onClick={() => copy(url)}>
                Copiar enlace de Drive
              </button>
              {(order.status === "confirmed" || delivery) && (
                <details>
                  <summary>Preparar mensaje de entrega</summary>
                  <p>
                    Concede primero permiso de lector a esta cuenta en Drive.
                    Revisa el mensaje y envíalo tú mismo.
                  </p>
                  <textarea
                    aria-label={`Mensaje de entrega de ${item.product_name}`}
                    readOnly
                    rows={6}
                    value={deliveryMessage(
                      item.product_name,
                      email,
                      url,
                      delivery?.delivery_note ?? note ?? "",
                    )}
                  />
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      copy(
                        deliveryMessage(
                          item.product_name,
                          email,
                          url,
                          delivery?.delivery_note ?? note ?? "",
                        ),
                      )
                    }
                  >
                    Copiar mensaje para WhatsApp o correo
                  </button>
                </details>
              )}
            </>
          ) : (
            <p className="notice">
              Falta el enlace privado. Guárdalo en la administración de este
              instruccional antes de entregarlo.
            </p>
          )}
        </>
      )}
      {!delivery && order.status === "confirmed" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!checked) return;
            void action.run(async () => {
              await recordItemDelivery(item.id, channel);
              reload();
            }, "Entrega registrada. La orden se cierra cuando todos los artículos están entregados.");
          }}
        >
          <fieldset disabled={action.busy || (digital && !url)}>
            {digital && (
              <label>
                Medio utilizado
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as DeliveryChannel)
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Correo electrónico</option>
                  <option value="other">Otro medio</option>
                </select>
              </label>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                required
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              {digital
                ? "Ya autoricé el correo en Drive y envié el enlace al comprador."
                : `Ya entregué las ${item.quantity} unidades de este artículo en la academia.`}
            </label>
            <button className="button button-primary" disabled={!checked}>
              Registrar entrega de este artículo
            </button>
          </fieldset>
        </form>
      )}
      <ActionFeedback {...action} />
    </article>
  );
}
