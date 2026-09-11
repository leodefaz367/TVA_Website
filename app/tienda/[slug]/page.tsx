import ProductRoute from "../../../components/catalog/ProductRoute";
export const metadata = { title: "Producto" };
export const dynamic = "force-dynamic";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main>
      <ProductRoute slug={slug} kind="physical" />
    </main>
  );
}
