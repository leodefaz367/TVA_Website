import { notFound } from "next/navigation";
import type { Product, ProductKind } from "../../types/commerce";
import { getPublicProduct } from "../../services/publicCatalog";
import ProductDetail, { ProductView } from "./ProductDetail";
export default async function ProductRoute({
  slug,
  kind,
}: {
  slug: string;
  kind: ProductKind;
}) {
  let product: Product | null;
  try {
    product = await getPublicProduct(slug);
  } catch {
    // Keep a recoverable client boundary for configuration and connection failures.
    return <ProductDetail slug={slug} kind={kind} />;
  }
  if (!product || product.kind !== kind) notFound();
  return <ProductView product={product} />;
}
