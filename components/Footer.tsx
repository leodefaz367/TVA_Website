import SiteImage from "./SiteImage";
import Link from "next/link";
export default function Footer() {
  return (
    <footer>
      <SiteImage src="/assets/logo-tva.png" alt="Team Vivas Academy" />
      <p>
        Jiu Jitsu · MMA · Submission Grappling
        <br />
        Sur de Quito, Ecuador
      </p>
      <div>
        <p>© 2026 Team Vivas Academy</p>
        <Link className="footer-admin-link" href="/admin">
          Administración
        </Link>
      </div>
    </footer>
  );
}
