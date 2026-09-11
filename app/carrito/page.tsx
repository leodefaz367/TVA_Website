import CartPage from "../../components/checkout/CartPage";
export const metadata = { title: "Carrito" };
export default function Page() {
  return (
    <main className="commerce-page section">
      <h1 className="compact-title">Tu carrito</h1>
      <CartPage />
    </main>
  );
}
