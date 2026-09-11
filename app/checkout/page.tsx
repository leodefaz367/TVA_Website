import Checkout from "../../components/checkout/Checkout";
export const metadata = { title: "Confirmar orden" };
export default function Page() {
  return (
    <main className="commerce-page section">
      <h1 className="compact-title">Confirmar orden</h1>
      <Checkout />
    </main>
  );
}
