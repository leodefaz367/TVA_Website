import Link from "next/link";

export default function Header(){
    return(
        <header className="site-header">
            <Link
                className="brand"
                href="/"
                aria-label="Team Vivas Acadey, inicio"
            >
                <img src="/assets/logo-tva.png" alt="Team Vivas Academy"/>
            </Link>

            <nav aria-label="Navegación principal">
                <Link href="/">Inicio</Link>
                <Link href="/academia">Academia</Link>
                <Link href="/profesor">Profesor</Link>
                <Link href="instruccionales">Instruccionales</Link>
                <Link href="/contacto">Contacto</Link>
            </nav>

            <Link className="header-cta" href="/tienda">
                Ver Tienda
            </Link> 
        </header>
    )
}