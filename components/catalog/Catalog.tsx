"use client";
import { useCallback, useState } from "react";
import type { ProductKind } from "../../types/commerce";
import { listCategories, listProducts } from "../../services/catalog";
import { useResource } from "../../hooks/useResource";
import { availableVariants } from "../../utils/commerce";
import { AsyncState } from "../AsyncState";
import ProductCard from "../ProductCard";
export default function Catalog({ kind }: { kind: ProductKind }) {
  const loader = useCallback(async () => {
    const [products, categories] = await Promise.all([
      listProducts(kind),
      listCategories(),
    ]);
    return { products, categories };
  }, [kind]);
  const { data, loading, error, reload } = useResource(loader);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const [stock, setStock] = useState(false);
  const price = (p: NonNullable<typeof data>["products"][number]) =>
    Math.min(...availableVariants(p).map((v) => v.price_cents), Infinity);
  const products = (data?.products ?? [])
    .filter(
      (p) =>
        (!category || p.category_id === category) &&
        (p.name + " " + p.description)
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()) &&
        (!stock ||
          availableVariants(p).some((v) => kind === "course" || v.stock > 0)),
    )
    .sort((a, b) =>
      sort === "price-up"
        ? price(a) - price(b)
        : sort === "price-down"
          ? price(b) - price(a)
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : Number(b.featured) - Number(a.featured),
    );
  return (
    <>
      <div className="catalog-filters">
        <label>
          Buscar
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              kind === "course" ? "Nombre o técnica" : "Nombre o descripción"
            }
          />
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {data?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Destacados</option>
            <option value="price-up">Menor precio</option>
            <option value="price-down">Mayor precio</option>
            <option value="name">Nombre</option>
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={stock}
            onChange={(e) => setStock(e.target.checked)}
          />
          Solo disponibles
        </label>
      </div>
      <AsyncState loading={loading} error={error} retry={reload} />
      {!loading &&
        !error &&
        (products.length ? (
          <>
            <p className="result-count">{products.length} resultados</p>
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        ) : (
          <div className="notice">
            No hay {kind === "course" ? "instruccionales" : "productos"}{" "}
            disponibles con estos filtros.
          </div>
        ))}
    </>
  );
}
