const products = [
  { name: 'Rashguard “Naughty by Nature”', type: 'Rashguard · Edición limitada', image: '/assets/rashguard-naughty.jpeg' },
  { name: 'Rashguard ONYX', type: 'Rashguard manga larga', image: '/assets/rashguard-onyx.jpeg' },
  { name: 'Fightshort Protect Ya Neck', type: 'Fightshort No-Gi', image: '/assets/fightshort-protect.jpeg' },
  { name: 'Colección Serpiente', type: 'Fightshort TVA', image: '/assets/fightshort-collection.jpg' },
];

export default function Home() {
  return <main>
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Team Vivas Academy, inicio"><img src="/assets/logo-tva.png" alt="Team Vivas Academy" /></a>
      <nav aria-label="Navegación principal"><a href="#academia">Academia</a><a href="#instruccionales">Instruccionales</a><a href="#tienda">Tienda</a><a href="#contacto">Contacto</a></nav>
      <a className="header-cta" href="#tienda">Ver tienda</a>
    </header>

    <section className="hero" id="inicio">
      <img className="hero-image" src="/assets/hero-dojo.png" alt="Comunidad de Team Vivas Academy en Quito" /><div className="hero-shade" />
      <div className="hero-content"><span className="eyebrow"><i /> SUR DE QUITO · ECUADOR</span><h1>THE DARK SIDE<br /><em>OF JIU JITSU</em></h1><p>Jiu Jitsu, MMA y Submission Grappling. Técnica, disciplina y una comunidad construida para evolucionar.</p><div className="hero-actions"><a className="button button-primary" href="#contacto">Agenda tu clase</a><a className="button button-ghost" href="#instruccionales">Ver instruccionales</a></div></div>
      <div className="hero-side">TEAM VIVAS ACADEMY <span>蛇</span></div>
    </section>

    <section className="ticker" aria-label="Disciplinas"><span>JIU JITSU</span><b>✦</b><span>MMA</span><b>✦</b><span>SUBMISSION GRAPPLING</span><b>✦</b><span>NO-GI</span></section>

    <section className="academy section" id="academia">
      <div className="section-heading"><span className="kicker">01 / LA ACADEMIA</span><h2>ENTRENA CON<br /><em>PROPÓSITO.</em></h2></div>
      <div className="academy-copy"><p className="lead">Un espacio para quienes buscan aprender a luchar, superar sus límites y formar parte de un equipo.</p><p>En Team Vivas Academy entrenamos desde los fundamentos hasta la competencia, con clases para adultos, jóvenes y niños.</p><div className="stats"><div><strong>3</strong><span>Disciplinas</span></div><div><strong>ALL</strong><span>Niveles</span></div><div><strong>TVA</strong><span>Una familia</span></div></div></div>
      <div className="academy-photo"><img src="/assets/training.png" alt="Entrenamiento de grappling en Team Vivas Academy" /><span>DISCIPLINA · TÉCNICA · COMUNIDAD</span></div>
    </section>

    <section className="coach section"><div><span className="kicker">02 / LIDERAZGO</span><h2>MICHAEL <em>VIVAS</em></h2><p>Deportista, peleador de MMA y atleta de Submission Grappling. Una metodología nacida de la experiencia real en entrenamiento y competencia.</p></div><ul><li><span>01</span> Faixa preta de Brazilian Jiu Jitsu</li><li><span>02</span> Cinturón morado de Luta Livre</li><li><span>03</span> Cinturón negro de Kickboxing</li><li><span>04</span> MMA Fighter &amp; Submission Grappler</li></ul></section>

    <section className="instructionals section" id="instruccionales"><div className="course-art"><img src="/assets/protect-ya-neck.png" alt="Protect Ya Neck, sistema de grappling de Team Vivas Academy" /></div><div className="course-copy"><span className="kicker">03 / TVA INSTRUCTIONALS</span><h2>APRENDE EL<br /><em>SISTEMA.</em></h2><p>Instruccionales organizados por posiciones, conceptos y secuencias para que puedas estudiar dentro y fuera del tatami.</p><div className="course-meta"><span>Acceso digital</span><span>A tu ritmo</span><span>Contenido TVA</span></div><button className="button button-light" type="button">Próximamente</button></div></section>

    <section className="shop section" id="tienda"><div className="shop-heading"><div><span className="kicker">04 / INDUMENTARIA</span><h2>VISTE EL<br /><em>DARK SIDE.</em></h2></div><p>Equipamiento diseñado para entrenar, competir y representar a Team Vivas Academy.</p></div><div className="product-grid">{products.map(product => <article className="product-card" key={product.name}><div className="product-image"><img src={product.image} alt={product.name} /><span>TVA</span></div><div className="product-info"><div><small>{product.type}</small><h3>{product.name}</h3><p>Precio por confirmar</p></div><button type="button" aria-label={`Ver ${product.name}`}>→</button></div></article>)}</div><p className="catalog-note">Los precios, tallas y existencias se conectarán al inventario de la tienda.</p></section>

    <section className="contact section" id="contacto"><span className="kicker">EMPIEZA AHORA</span><h2>TU PRIMERA CLASE<br />COMIENZA <em>HOY.</em></h2><p>Escríbenos para consultar horarios, niveles y disponibilidad.</p><div className="contact-actions"><a className="button button-primary" href="https://wa.me/593984198059" target="_blank" rel="noreferrer">WhatsApp · 098 419 8059</a><a className="button button-ghost" href="https://www.instagram.com/teamvivasacademy/" target="_blank" rel="noreferrer">@teamvivasacademy</a></div></section>

    <footer><img src="/assets/logo-tva.png" alt="Team Vivas Academy" /><p>Jiu Jitsu · MMA · Submission Grappling<br />Sur de Quito, Ecuador</p><p>© 2026 Team Vivas Academy</p></footer>
  </main>;
}
