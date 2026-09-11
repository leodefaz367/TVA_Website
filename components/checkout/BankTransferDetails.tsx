"use client";
import { useState } from "react";
import Link from "next/link";
import { loadBankTransfer } from "../../services/bank-transfer";
import { useResource } from "../../hooks/useResource";
export default function BankTransferDetails({ orderId }: { orderId?: string }) {
  const { data, error, loading, reload } = useResource(loadBankTransfer);
  const [message, setMessage] = useState("");
  return (
    <section className="bank-transfer" aria-label="Datos para transferencia">
      <h3>Datos para transferencia</h3>
      {loading ? (
        <p role="status">Consultando la cuenta bancaria…</p>
      ) : error ? (
        <>
          <p role="alert">
            No pudimos consultar la cuenta. Vuelve a intentarlo antes de
            transferir.
          </p>
          <button type="button" onClick={reload}>
            Reintentar
          </button>
        </>
      ) : data ? (
        <>
          <dl>
            {[
              ["Banco", data.bank],
              ["Tipo de cuenta", data.account_type],
              ["Número de cuenta", data.account_number],
              ["Cédula / RUC", data.identification],
              ["Titular", data.holder],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${data.bank}\nCuenta de ${data.account_type.toLowerCase()}: ${data.account_number}\nCédula / RUC: ${data.identification}\nTitular: ${data.holder}`,
                );
                setMessage("Datos copiados.");
              } catch {
                setMessage("Selecciona los datos y cópialos manualmente.");
              }
            }}
          >
            Copiar datos bancarios
          </button>
          {message && <p role="status">{message}</p>}
          <p>
            {orderId ? (
              <>
                Incluye la referencia{" "}
                <strong className="break-word">{orderId}</strong> al enviar tu
                comprobante.
              </>
            ) : (
              "Primero registra tu orden. Después realiza la transferencia por el total confirmado y envíanos el comprobante con la referencia de tu orden."
            )}
          </p>
          <p>
            Revisaremos el ingreso en la cuenta antes de aprobar la compra.
            Enviar un comprobante no confirma el pago automáticamente.
          </p>
          <Link href="/contacto">Contactar para enviar el comprobante</Link>
        </>
      ) : (
        <p>
          Contacta a la academia para confirmar los datos bancarios antes de
          transferir.
        </p>
      )}
    </section>
  );
}
