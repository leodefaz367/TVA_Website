"use client";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { getSupabase } from "../../services/supabase";
import { errorMessage } from "../../services/errors";
import { MfaChallenge } from "./MfaPanel";
export default function AdminGate({ children }: { children: ReactNode }) {
  const auth = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link href="/admin">TVA / Administración</Link>
        <div>
          <Link href="/">Ver sitio</Link>
          {auth.email && <button onClick={logout}>Cerrar sesión</button>}
        </div>
      </header>
      {auth.loading ? (
        <p role="status">Comprobando sesión…</p>
      ) : auth.factorId ? (
        <MfaChallenge factorId={auth.factorId} />
      ) : auth.admin ? (
        <>
          {error && <p role="alert">{error}</p>}
          {children}
        </>
      ) : (
        <section className="login-panel">
          <h1>Acceso privado</h1>
          <p>Ingresa con tu cuenta administrativa.</p>
          {auth.error && (
            <p className="error" role="alert">
              {auth.error}
            </p>
          )}
          <form onSubmit={login}>
            <label>
              Correo
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-primary" disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
