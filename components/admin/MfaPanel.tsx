"use client";
import { useState } from "react";
import { getSupabase } from "../../services/supabase";
import { useAction } from "../../hooks/useAction";
import ActionFeedback from "./ActionFeedback";

export function MfaChallenge({ factorId }: { factorId: string }) {
  const [code, setCode] = useState("");
  const action = useAction();
  return (
    <section className="login-panel">
      <h1>Verificación en dos pasos</h1>
      <p>Ingresa el código de tu aplicación de autenticación.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () => {
            const { error } = await getSupabase().auth.mfa.challengeAndVerify({
              factorId,
              code,
            });
            if (error) throw error;
            setCode("");
          }, "Código verificado.");
        }}
      >
        <label>
          Código de seis dígitos
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <button disabled={action.busy}>Verificar</button>
        <ActionFeedback {...action} />
      </form>
    </section>
  );
}
export default function MfaPanel() {
  const [setup, setSetup] = useState<{ id: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const action = useAction();
  return (
    <section className="admin-section">
      <h3>Seguridad de tu cuenta</h3>
      <p>
        Activa un segundo factor con una aplicación de autenticación. Guarda
        acceso a esa aplicación; si lo pierdes, el propietario deberá recuperar
        la cuenta desde Supabase.
      </p>
      {!setup && !enabled && (
        <button
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const client = getSupabase();
              const existing = await client.auth.mfa.listFactors();
              if (existing.error) throw existing.error;
              if (
                existing.data.totp.some(
                  (factor) => factor.status === "verified",
                )
              ) {
                setEnabled(true);
                return;
              }
              for (const pending of existing.data.all.filter(
                (factor) =>
                  factor.factor_type === "totp" &&
                  factor.status === "unverified",
              )) {
                const removed = await client.auth.mfa.unenroll({
                  factorId: pending.id,
                });
                if (removed.error) throw removed.error;
              }
              const { data, error } = await client.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "TVA administrador",
              });
              if (error) throw error;
              setSetup({ id: data.id, qr: data.totp.qr_code });
            }, "Estado de verificación consultado.")
          }
        >
          Configurar verificación en dos pasos
        </button>
      )}
      {enabled && (
        <p role="status">
          La cuenta ya tiene verificación en dos pasos activada.
        </p>
      )}
      {setup && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const { error } = await getSupabase().auth.mfa.challengeAndVerify(
                { factorId: setup.id, code },
              );
              if (error) throw error;
              setSetup(null);
              setCode("");
              setEnabled(true);
            }, "Verificación en dos pasos activada.");
          }}
        >
          <p>
            Escanea este QR con tu aplicación de autenticación. No lo compartas.
          </p>
          {/* Trusted Auth QR is displayed as an image, never inserted as HTML. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.qr}
            width={220}
            height={220}
            alt="QR para configurar tu aplicación de autenticación"
          />
          <label>
            Código de seis dígitos
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button disabled={action.busy}>Activar</button>
        </form>
      )}
      <ActionFeedback {...action} />
    </section>
  );
}
