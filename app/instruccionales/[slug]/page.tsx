import ProductRoute from "../../../components/catalog/ProductRoute";
export const metadata = { title: "Instruccional" };
export const dynamic = "force-dynamic";
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main>
      <ProductRoute slug={slug} kind="course" />
    </main>
  );
}
