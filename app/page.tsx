import Link from "next/link";
import SiteImage from "../components/SiteImage";

export default function Home() {
  return (
    <main>
      <section className="hero" id="inicio">
        <SiteImage
          loading="eager"
          fetchPriority="high"
          className="hero-image"
          src="/assets/hero-dojo.png"
          alt="Comunidad de Team Vivas Academy en Quito"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">
            <i /> SUR DE QUITO · ECUADOR
          </span>
          <h1>
            THE DARK SIDE
            <br />
            <em>OF JIU JITSU</em>
          </h1>
          <p>
            Jiu Jitsu, MMA y Submission Grappling. Técnica, disciplina y una
            comunidad construida para evolucionar.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/contacto">
              Agenda tu clase
            </Link>
            <Link className="button button-ghost" href="/instruccionales">
              Ver instruccionales
            </Link>
          </div>
        </div>
        <div className="hero-side">
          TEAM VIVAS ACADEMY <span>蛇</span>
        </div>
      </section>

      <section className="ticker" aria-label="Disciplinas">
        <span>JIU JITSU</span>
        <b>✦</b>
        <span>MMA</span>
        <b>✦</b>
        <span>SUBMISSION GRAPPLING</span>
        <b>✦</b>
        <span>NO-GI</span>
      </section>
    </main>
  );
}
