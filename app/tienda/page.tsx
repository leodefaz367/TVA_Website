import Catalog from "../../components/catalog/Catalog";
export const metadata = { title: "Tienda" };
export default function TiendaPage() {
  return (
    <main>
      <section className="shop section page-section">
        <div className="shop-heading">
          <div>
            <span className="kicker">INDUMENTARIA TVA</span>
            <h1>
              VISTE EL
              <br />
              <em>DARK SIDE.</em>
            </h1>
          </div>
          <p>Equipamiento para entrenar, competir y representar al equipo.</p>
        </div>
        <Catalog kind="physical" />
      </section>
    </main>
  );
}
