"use client";
import SiteImage from "../SiteImage";
import Trailer from "../Trailer";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { Product, ProductKind } from "../../types/commerce";
import { getProduct } from "../../services/catalog";
import { useResource } from "../../hooks/useResource";
import { useCart } from "../../hooks/useCart";
import { availableStock, availableVariants, money } from "../../utils/commerce";
import { errorMessage } from "../../services/errors";
import { AsyncState } from "../AsyncState";
export default function ProductDetail({
  slug,
  kind,
}: {
  slug: string;
  kind: ProductKind;
}) {
  const loader = useCallback(() => getProduct(slug), [slug]);
  const { data, loading, error, reload } = useResource(loader);
  if (loading || error)
    return (
      <section className="section page-section">
        <AsyncState loading={loading} error={error} retry={reload} />
      </section>
    );
  if (!data || data.kind !== kind)
    return (
      <section className="section page-section">
        <h1 className="compact-title">Producto no encontrado</h1>
        <p>Puede haberse retirado del catálogo.</p>
        <Link
          className="button button-primary"
          href={kind === "course" ? "/instruccionales" : "/tienda"}
        >
          Volver al catálogo
        </Link>
      </section>
    );
  return <ProductView key={data.id} product={data} />;
}
export function ProductView({
  product: p,
  preview = false,
}: {
  product: Product;
  preview?: boolean;
}) {
  const variants = availableVariants(p);
  const initial = variants.find((v) => availableStock(p, v) > 0) ?? variants[0];
  const [color, setColor] = useState(initial?.color ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { add } = useCart();
  const variant = variants.find((v) => v.color === color && v.size === size);
  const max = variant ? availableStock(p, variant) : 0;
  const images = [...p.product_images]
    .filter((i) => !i.variant_id || i.variant_id === variant?.id)
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
    );
  const image = images.find((i) => i.id === selectedImage) ?? images[0];
  function changeColor(value: string) {
    setColor(value);
    setQuantity(1);
    setSelectedImage("");
    setMessage("");
    const first =
      variants.find((v) => v.color === value && v.size === size) ??
      variants.find((v) => v.color === value);
    setSize(first?.size ?? "");
  }
  return (
    <section className="product-detail section page-section">
      <div className="product-gallery">
        <div className="product-detail-image">
          {image ? (
            <SiteImage
              src={image.url}
              alt={image.alt || p.name}
              width="700"
              height="700"
            />
          ) : (
            <div className="image-placeholder">Sin imagen</div>
          )}
        </div>
        <div className="gallery-thumbnails">
          {images.map((i) => (
            <button
              key={i.id}
              aria-label={"Ver " + (i.alt || p.name)}
              aria-pressed={image?.id === i.id}
              onClick={() => setSelectedImage(i.id)}
            >
              <SiteImage
                src={i.url}
                alt=""
                loading="lazy"
                width="90"
                height="90"
              />
            </button>
          ))}
        </div>
      </div>
      <div className="product-detail-info">
        <Link href={p.kind === "course" ? "/instruccionales" : "/tienda"}>
          ← Volver al catálogo
        </Link>
        <h1>{p.name}</h1>
        <p className="preserve-lines">{p.description}</p>
        {p.kind === "course" && p.instructional_courses && (
          <p>
            {[p.instructional_courses.trainer, p.instructional_courses.level]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <p className="product-detail-price">
          {variant ? money(variant.price_cents) : "Combinación no disponible"}
        </p>
        <div className="variant-selectors">
          {p.kind === "physical" && (
            <>
              <label>
                Color
                <select
                  value={color}
                  onChange={(e) => changeColor(e.target.value)}
                >
                  {[...new Set(variants.map((v) => v.color))].map((c) => (
                    <option key={c} value={c}>
                      {c || "Único"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Talla
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(e.target.value);
                    setQuantity(1);
                    setSelectedImage("");
                    setMessage("");
                  }}
                >
                  {[
                    ...new Set(
                      variants
                        .filter((v) => v.color === color)
                        .map((v) => v.size),
                    ),
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s || "Única"}
                      {variants.find((v) => v.color === color && v.size === s)
                        ?.stock === 0
                        ? " · Agotada"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Cantidad
            <input
              type="number"
              min="1"
              max={max || 1}
              value={quantity}
              disabled={p.kind === "course" || !max}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
        </div>
        <p role="status">
          {max > 0
            ? p.kind === "course"
              ? "Acceso digital disponible"
              : variant?.stock + " disponibles"
            : "Agotado o sin variantes disponibles"}
        </p>
        <button
          className="button button-primary"
          disabled={preview || !max || !variant}
          onClick={() => {
            setError("");
            setMessage("");
            try {
              if (variant) {
                add(p, variant, quantity);
                setMessage("Agregado al carrito.");
              }
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Agregar al carrito
        </button>
        {message && (
          <p className="success" role="status">
            {message} <Link href="/carrito">Ver carrito →</Link>
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p>
          {p.kind === "course"
            ? p.instructional_courses?.delivery_note
            : "Retiro en la academia. Coordinaremos contigo después de recibir la orden."}
        </p>
        {p.kind === "course" && (
          <p>
            Después de verificar el pago, autorizaremos manualmente tu cuenta de
            Google y te enviaremos el enlace por WhatsApp o correo. La compra no
            habilita el acceso de inmediato.
          </p>
        )}
        {p.kind === "course" && p.instructional_courses?.trailer_url && (
          <Trailer url={p.instructional_courses.trailer_url} />
        )}
        {p.kind === "course" && p.instructional_modules.length > 0 && (
          <div className="course-modules">
            <h2>Contenido</h2>
            {p.instructional_modules.length ? (
              <ol>
                {[...p.instructional_modules]
                  .sort((a, b) => a.position - b.position)
                  .map((m) => (
                    <li key={m.id}>
                      <strong>{m.title}</strong>
                      <p>{m.description}</p>
                    </li>
                  ))}
              </ol>
            ) : (
              <p>Consulta el temario con la academia antes de comprar.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
