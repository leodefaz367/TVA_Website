import type { Metadata } from "next";
import "./globals.css";
import "./commerce.css";
import SiteShell from "../layouts/SiteShell";
// Dynamic rendering is required for a fresh CSP nonce on each response.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "Team Vivas Academy | Jiu Jitsu en Quito",
    template: "%s | Team Vivas Academy",
  },
  description:
    "Jiu Jitsu, MMA y Submission Grappling en el sur de Quito. Conoce la academia, nuestra indumentaria y los instruccionales TVA.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
