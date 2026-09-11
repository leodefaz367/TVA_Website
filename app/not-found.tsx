import Link from "next/link";
export default function NotFound() {
  return (
    <main className="section">
      <h1 className="compact-title">Página no encontrada</h1>
      <Link className="button button-primary" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
