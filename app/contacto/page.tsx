export default function ContactoPage(){
return(
    <main>
        <section className="contact section page-section">
            <span>EMPIEZA AHORA</span>

            <h1>
                TU PRIMERA CLASE 
                <br /> COMIENZA <em>HOY.</em>
            </h1>

            <p>Escríbenos para consultar horarios, niveles y disponibilidad.</p>

            <div className="contact-actions">
                <a className="button button-primary"
                href="https://wa.me/593984198059"
                target="_blank"
                rel="noreferrer"
                >
                    WhatsApp · 098 419 8059
                </a>
                <a className="button button-ghost"
                href="https://www.instagram.com/teamvivasacademy/"
                target="_blank"
                rel="noreferrer">
                    @teamvivasacademy
                </a>
            </div>
        </section>
    </main>
);
}