export default function InstruccionalesPage(){
    return(
        <main>
            <section className="instructionals instructionals-page page-section">
                <div className="course-art">
                    <img
                        src="/assets/protect-ya-neck.png"
                        alt="Protect Ya Neck, sistema de grappling de Team Vivas ACademy"
                    />
                </div>

                <div className="course-copy">
                    <span className="kicker">INSTRUCCIONALES TVA</span>

                    <h1>
                        APRENDE EL
                        <br />
                        <em>SISTEMA.</em>
                    </h1>

                    <p>
                        Instruccionales organizados por posiciones, conceptos y secuencias
                        para que puedas estudiar dentro y fuera del tatami.
                    </p>

                    <div className="course-meta">
                        <span>Acceso digital</span>
                        <span>A tu ritmo</span>
                        <span>Contenido TVA</span>
                    </div>
                    <button className="button button-light" type="button" disabled>
                        Próximamente
                    </button>
                </div>
            </section>
        </main>
    );
}