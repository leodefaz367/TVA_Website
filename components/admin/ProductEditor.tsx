"use client";
import { useState, type FormEvent } from "react";
import type {
  Category,
  Product,
  ProductKind,
  ProductStatus,
} from "../../types/commerce";
import { saveProduct, type ProductInput } from "../../services/admin";
import { useAction } from "../../hooks/useAction";
import ActionFeedback from "./ActionFeedback";
import VariantEditor from "./VariantEditor";
import ImageEditor from "./ImageEditor";
import CourseEditor from "./CourseEditor";
import DigitalPriceEditor from "./DigitalPriceEditor";
import { ValidationError } from "../../utils/validation-error";
import { ProductView } from "../catalog/ProductDetail";
export default function ProductEditor({
  product,
  categories,
  kind,
  onSaved,
  onClose,
}: {
  product?: Product;
  categories: Category[];
  kind: ProductKind;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? null,
    kind: product?.kind ?? kind,
    status: product?.status ?? "draft",
    featured: product?.featured ?? false,
  });
  const action = useAction();
  const [preview, setPreview] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      if (
        form.status === "active" &&
        (!product?.product_variants.some((v) => v.active) ||
          !product?.product_images.length)
      )
        throw new ValidationError(
          form.kind === "course"
            ? "Antes de publicar, guarda el precio del acceso y al menos una portada."
            : "Antes de publicar, guarda una variante activa y al menos una imagen.",
        );
      if (
        form.status === "active" &&
        form.kind === "course" &&
        !product?.instructional_courses
      )
        throw new ValidationError(
          "Guarda la presentación del instruccional antes de publicarlo. Los módulos son opcionales.",
        );
      const id = await saveProduct(form, product?.id);
      onSaved(id);
    });
  }
  return (
    <section className="admin-editor">
      <div className="section-toolbar">
        <h2>
          {product
            ? "Editar " + product.name
            : "Nuevo " + (kind === "course" ? "instruccional" : "producto")}
        </h2>
        <button className="text-button" onClick={onClose}>
          Volver al listado
        </button>
      </div>
      <form onSubmit={submit} noValidate>
        <h3>Presentación y publicación</h3>
        <fieldset disabled={action.busy}>
          <div className="form-grid">
            <label>
              Nombre
              <input
                maxLength={180}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Dirección amigable
              <input
                placeholder={
                  kind === "course" ? "fundamentos-jiu-jitsu" : "rashguard-onyx"
                }
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label>
              Categoría
              <select
                value={form.category_id ?? ""}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value || null })
                }
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProductStatus })
                }
              >
                <option value="draft">Borrador</option>
                <option value="active">Publicado</option>
                <option value="archived">Desactivado</option>
              </select>
            </label>
          </div>
          <label>
            Descripción
            <textarea
              rows={5}
              maxLength={10000}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Destacado
          </label>
          <button className="button button-primary">
            Guardar datos generales
          </button>
        </fieldset>
      </form>
      <ActionFeedback {...action} />
      {product?.kind === "course" && (
        <div className="admin-section">
          <button type="button" onClick={() => setPreview(!preview)}>
            {preview
              ? "Cerrar vista previa"
              : "Ver ficha pública con los datos guardados"}
          </button>
          {preview && (
            <>
              <p className="notice">
                Vista previa de los datos guardados. Para actualizarla, guarda
                cada sección. No se publica al abrirla.
              </p>
              <ProductView product={product} preview />
            </>
          )}
        </div>
      )}
      {product ? (
        <>
          {product.kind === "course" ? (
            <DigitalPriceEditor
              product={product}
              reload={() => onSaved(product.id)}
            />
          ) : (
            <VariantEditor
              product={product}
              reload={() => onSaved(product.id)}
            />
          )}
          <ImageEditor product={product} reload={() => onSaved(product.id)} />
          {product.kind === "course" && (
            <CourseEditor
              product={product}
              reload={() => onSaved(product.id)}
            />
          )}
        </>
      ) : (
        <p className="notice">
          {kind === "course"
            ? "Guarda el borrador para añadir la portada, el precio, el tráiler y el enlace privado de Drive. Cada sección tiene su propio botón para guardar."
            : "Guarda el borrador para agregar variantes, imágenes y contenido."}
        </p>
      )}
    </section>
  );
}
