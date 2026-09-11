"use client";
import { useState } from "react";
import {
  emptyBank,
  loadBankTransfer,
  saveBankTransfer,
  type BankTransfer,
} from "../../services/bank-transfer";
import { useResource } from "../../hooks/useResource";
import { useAction } from "../../hooks/useAction";
import { AsyncState } from "../AsyncState";
import ActionFeedback from "./ActionFeedback";
export default function BankTransferEditor() {
  const resource = useResource(loadBankTransfer);
  return (
    <section className="admin-section">
      <h3>Cuenta para transferencias</h3>
      <p>
        Estos datos se muestran a los compradores en el carrito y al confirmar
        la orden.
      </p>
      <AsyncState
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && (
        <BankForm initial={resource.data ?? emptyBank} />
      )}
    </section>
  );
}
function BankForm({ initial }: { initial: BankTransfer }) {
  const [form, setForm] = useState(initial);
  const action = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(
          () => saveBankTransfer(form),
          "Datos bancarios guardados y visibles para los compradores.",
        );
      }}
    >
      <fieldset disabled={action.busy}>
        <div className="form-grid">
          {(
            [
              ["bank", "Banco"],
              ["account_number", "Número de cuenta"],
              ["identification", "Cédula / RUC"],
              ["holder", "Nombre completo del titular"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required
                maxLength={key === "holder" ? 180 : key === "bank" ? 120 : 30}
                inputMode={
                  key === "account_number" || key === "identification"
                    ? "numeric"
                    : "text"
                }
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Tipo de cuenta
            <select
              value={form.account_type}
              onChange={(e) =>
                setForm({ ...form, account_type: e.target.value })
              }
            >
              <option>Ahorros</option>
              <option>Corriente</option>
            </select>
          </label>
        </div>
        <button className="button button-primary">
          Guardar cuenta para transferencias
        </button>
      </fieldset>
      <ActionFeedback {...action} />
    </form>
  );
}
