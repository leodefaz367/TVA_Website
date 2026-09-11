"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { CartProvider } from "../hooks/useCart";
export default function SiteShell({ children }: { children: ReactNode }) {
  const admin = usePathname().startsWith("/admin");
  return (
    <CartProvider>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {!admin && <Header />}
      <div id="main-content">{children}</div>
      {!admin && <Footer />}
    </CartProvider>
  );
}
