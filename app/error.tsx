"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section">
      <h1 className="compact-title">No pudimos cargar esta página</h1>
      <p>Vuelve a intentarlo en unos momentos.</p>
      <button className="button button-primary" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
