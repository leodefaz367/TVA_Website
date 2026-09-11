import AdminGate from "../../components/admin/AdminGate";
import Dashboard from "../../components/admin/Dashboard";
export const metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <AdminGate>
      <Dashboard />
    </AdminGate>
  );
}
