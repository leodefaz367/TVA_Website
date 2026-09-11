"use client";
import { useCallback, useState } from "react";
import {
  listDeliverySettings,
  saveDeliverySettings,
} from "../../services/admin";
import { useResource } from "../../hooks/useResource";
import { useAction } from "../../hooks/useAction";
import { AsyncState } from "../AsyncState";
import ActionFeedback from "./ActionFeedback";

export default function DriveEditor({ productId }: { productId: string }) {
  const loader = useCallback(
    async () =>
      (await listDeliverySettings()).find((s) => s.product_id === productId) ??
      null,
    [productId],
  );
  const resource = useResource(loader);
  return (
    <section className="admin-section">
      <h3>Entrega por Google Drive</h3>
      <p>
        Solo los administradores ven este enlace. Mantén el acceso de Drive
        restringido. Después de verificar el pago, añade el correo de compra
        como lector y envía el enlace.
      </p>
      <AsyncState
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && (
        <DriveForm
          key={productId}
          productId={productId}
          initial={resource.data?.drive_url ?? ""}
        />
      )}
    </section>
  );
}
function DriveForm({
  productId,
  initial,
}: {
  productId: string;
  initial: string;
}) {
  const [url, setUrl] = useState(initial);
  const action = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(
          () => saveDeliverySettings(productId, url),
          "Enlace privado guardado. Los permisos de Drive se gestionan manualmente.",
        );
      }}
    >
      <fieldset disabled={action.busy}>
        <label>
          Enlace privado de la carpeta o archivo de Drive
          <input
            type="url"
            maxLength={2000}
            required
            value={url}
            placeholder="https://drive.google.com/drive/folders/…"
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button className="button button-primary">
          Guardar enlace privado
        </button>
      </fieldset>
      <ActionFeedback {...action} />
    </form>
  );
}
