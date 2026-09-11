import SiteImage from "./SiteImage";
import Link from "next/link";
import type { Product } from "../types/commerce";
import { availableVariants, money, primaryImage } from "../utils/commerce";
export default function ProductCard({ product }: { product: Product }) {
  const image = primaryImage(product);
  const variants = availableVariants(product);
  const prices = variants.map((v) => v.price_cents);
  const soldOut = !variants.some(
    (v) => product.kind === "course" || v.stock > 0,
  );
  return (
    <Link
      className="product-card-link"
      href={
        "/" +
        (product.kind === "course" ? "instruccionales" : "tienda") +
        "/" +
        product.slug
      }
    >
      <article className="product-card">
        <div className="product-image">
          {image ? (
            <SiteImage
              src={image.url}
              alt={image.alt || product.name}
              loading="lazy"
              width="480"
              height="480"
            />
          ) : (
            <div className="image-placeholder">TVA</div>
          )}
          <span>
            {soldOut ? "Agotado" : product.featured ? "Destacado" : "TVA"}
          </span>
        </div>
        <div className="product-info">
          <div>
            <small>
              {product.kind === "course"
                ? "Instruccional digital"
                : "Indumentaria TVA"}
            </small>
            <h3>{product.name}</h3>
            <p>
              {prices.length
                ? (new Set(prices).size > 1 ? "Desde " : "") +
                  money(Math.min(...prices))
                : "Sin variantes disponibles"}
            </p>
          </div>
          <span className="product-link" aria-hidden="true">
            →
          </span>
        </div>
      </article>
    </Link>
  );
}
