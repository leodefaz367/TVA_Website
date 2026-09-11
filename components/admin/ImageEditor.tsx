"use client";
import SiteImage from "../SiteImage";

import { useState, type FormEvent } from "react";
import type { Product, ProductImage } from "../../types/commerce";
import {
  removeContent,
  setPrimaryImage,
  updateImage,
  uploadImage,
} from "../../services/admin";
import { useAction } from "../../hooks/useAction";
import { integer, variantLabel } from "../../utils/commerce";
import ActionFeedback from "./ActionFeedback";
export default function ImageEditor({
  product: p,
  reload,
}: {
  product: Product;
  reload: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [variant, setVariant] = useState("");
  const [uploadKey, setUploadKey] = useState(0);
  const action = useAction();
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      if (!file) throw new Error("Selecciona una imagen.");
      await uploadImage(file, p.id, variant || null, alt);
      setFile(null);
      setAlt("");
      setUploadKey((x) => x + 1);
      reload();
    });
  }
  return (
    <section className="admin-section">
      <h3>{p.kind === "course" ? "Portada e imágenes" : "Imágenes"}</h3>
      <p>
        JPG, PNG o WebP, máximo 5 MB. La portada puede elegirse después de
        subirla.
      </p>
      <div className="admin-images">
        {p.product_images.map((i) => (
          <ImageRow key={i.id} image={i} product={p} reload={reload} />
        ))}
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={action.busy}>
          <div className="form-grid">
            <label>
              Archivo
              <input
                key={uploadKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Texto alternativo
              <input
                value={alt}
                maxLength={300}
                onChange={(e) => setAlt(e.target.value)}
              />
            </label>
            {p.kind === "physical" && (
              <label>
                Variante
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                >
                  <option value="">Todas</option>
                  {p.product_variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button className="button button-primary">Subir imagen</button>
        </fieldset>
      </form>
      <ActionFeedback {...action} />
    </section>
  );
}
function ImageRow({
  image: i,
  product: p,
  reload,
}: {
  image: ProductImage;
  product: Product;
  reload: () => void;
}) {
  const [alt, setAlt] = useState(i.alt);
  const [position, setPosition] = useState(String(i.position));
  const [variant, setVariant] = useState(i.variant_id ?? "");
  const action = useAction();
  return (
    <article>
      <SiteImage
        src={i.url}
        alt={i.alt}
        width="180"
        height="180"
        loading="lazy"
      />
      {i.is_primary && <strong>Imagen principal</strong>}
      <label>
        Descripción
        <input
          value={alt}
          maxLength={300}
          onChange={(e) => setAlt(e.target.value)}
        />
      </label>
      <label>
        Orden
        <input
          type="number"
          min="0"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </label>
      {p.kind === "physical" && (
        <label>
          Variante
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="">Todas</option>
            {p.product_variants.map((v) => (
              <option key={v.id} value={v.id}>
                {variantLabel(v)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-actions">
        <button
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              await updateImage(i.id, {
                alt,
                position: integer(position, 0, 10000, "Orden"),
                variant_id: variant || null,
              });
              reload();
            })
          }
        >
          Guardar
        </button>
        <button
          disabled={action.busy || i.is_primary}
          onClick={() =>
            void action.run(async () => {
              await setPrimaryImage(i.id);
              reload();
            })
          }
        >
          Usar como principal
        </button>
        <button
          disabled={action.busy}
          onClick={() => {
            if (
              window.confirm(
                "¿Retirar esta imagen del producto? El archivo se conserva en el almacenamiento.",
              )
            )
              void action.run(async () => {
                await removeContent("product_images", i.id);
                reload();
              });
          }}
        >
          Retirar imagen
        </button>
      </div>
      <ActionFeedback {...action} />
    </article>
  );
}
