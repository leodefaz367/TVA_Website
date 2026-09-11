import SiteImage from "../../components/SiteImage";
export default function AcademiaPage() {
  return (
    <main>
      <section className="academy section page-section">
        <div className="section-heading">
          <span className="kicker">LA ACADEMIA</span>

          <h1>
            {" "}
            ENTRENA CON
            <br />
            <em>PROPÓSITO</em>
          </h1>
        </div>

        <div className="academy-copy">
          <p className="lead">
            Un espacio para quienes buscan aprender a luchar, superar sus
            límites y formar parte de un equipo.
          </p>
          <p>
            En Team Vivas Academy entrenamos desde los fundamentos hasta la
            competencia, con clases para adultos, jóvenes y niños.
          </p>

          <div className="stats">
            <div>
              <strong>3</strong>
              <span>Disciplinas</span>
            </div>

            <div>
              <strong>TODOS</strong>
              <span>Niveles</span>
            </div>

            <div>
              <strong>TVA</strong>
              <span>Una familia</span>
            </div>
          </div>
        </div>

        <div className="academy-photo">
          <SiteImage
            src="/assets/training.png"
            alt="Entrenamiento de grappling en Team Vivas Academy"
          />

          <span>DISCIPLINA · TÉCNICA · COMUNIDAD</span>
        </div>
      </section>
    </main>
  );
}
