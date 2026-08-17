import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Team Vivas Academy | Jiu Jitsu, MMA y Grappling", description: "Team Vivas Academy: Jiu Jitsu, MMA y Submission Grappling en el sur de Quito.", other: { "codex-preview": "development" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
