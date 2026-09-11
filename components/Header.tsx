"use client";
import SiteImage from "./SiteImage";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "../hooks/useCart";
export default function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Team Vivas Academy, inicio">
        <SiteImage
          src="/assets/logo-tva.png"
          alt="Team Vivas Academy"
          width="260"
          height="80"
        />
      </Link>
      <button
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen(!open)}
      >
        {open ? "Cerrar" : "Menú"}
      </button>
      <nav
        id="main-nav"
        className={open ? "nav-open" : ""}
        aria-label="Navegación principal"
      >
        {(
          [
            ["/", "Inicio"],
            ["/academia", "Academia"],
            ["/profesor", "Profesor"],
            ["/instruccionales", "Instruccionales"],
            ["/contacto", "Contacto"],
            ["/tienda", "Tienda"],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link
        className="cart-link"
        href="/carrito"
        aria-label={"Carrito, " + count + " artículos"}
      >
        Carrito ({count})
      </Link>
    </header>
  );
}
