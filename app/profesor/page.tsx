import SiteImage from "../../components/SiteImage";
export default function ProfesorPage() {
  return (
    <main>
      <section className="coach section page-section">
        <div className="coach-photo">
          <SiteImage
            src="/assets/michael-vivas.png"
            alt="Michael Vivas, profesor de Team Vivas Academy"
          />
        </div>

        <div className="coach-details">
          <span className="kicker">LIDERAZGO</span>

          <h1>
            MICHAEL <em>VIVAS</em>
          </h1>

          <p>
            Deportista, peleador de MMA y atleta de Submission Grappling. Una
            metodología nacida de la experiencia real en entrenamiento y
            competencia.
          </p>

          <ul>
            <li>
              <span>01</span>
              Faixa preta de Brazilian Jiu Jitsu
            </li>

            <li>
              <span>02</span>
              Cinturón morado de Luta Livre
            </li>

            <li>
              <span>03</span>
              Cinturón negro de Kickboxing
            </li>

            <li>
              <span>04</span>
              MMA Fighter &amp; Submission Grappler
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
