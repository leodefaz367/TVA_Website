import Catalog from "../../components/catalog/Catalog";
export const metadata = { title: "Instruccionales" };
export default function InstruccionalesPage() {
  return (
    <main>
      <section className="shop section page-section">
        <div className="shop-heading">
          <div>
            <span className="kicker">INSTRUCCIONALES TVA</span>
            <h1>
              APRENDE EL
              <br />
              <em>SISTEMA.</em>
            </h1>
          </div>
          <p>
            Estudia posiciones, conceptos y secuencias con Michael Vivas. Acceso
            digital tras confirmar tu compra.
          </p>
        </div>
        <Catalog kind="course" />
      </section>
    </main>
  );
}
