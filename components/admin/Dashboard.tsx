"use client";
import { useCallback, useState } from "react";
import { listProducts, listCategories } from "../../services/catalog";
import { useResource } from "../../hooks/useResource";
import { AsyncState } from "../AsyncState";
import type { ProductKind } from "../../types/commerce";
import ProductEditor from "./ProductEditor";
import OrdersPanel from "./OrdersPanel";
import SettingsPanel from "./SettingsPanel";
import { money, variantLabel } from "../../utils/commerce";
const tabs = [
  ["physical", "Productos"],
  ["course", "Instruccionales"],
  ["inventory", "Inventario"],
  ["orders", "Órdenes"],
  ["settings", "Información"],
] as const;
type Tab = (typeof tabs)[number][0];
export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("physical");
  const [selected, setSelected] = useState<string | null>(null);
  const loader = useCallback(async () => {
    const [products, categories] = await Promise.all([
      listProducts(undefined, true),
      listCategories(),
    ]);
    return { products, categories };
  }, []);
  const resource = useResource(loader);
  const [search, setSearch] = useState("");
  const [low, setLow] = useState(false);
  function edit(id: string, kind: ProductKind) {
    setTab(kind);
    setSelected(id);
  }
  return (
    <>
      <nav className="admin-tabs" aria-label="Administración">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => {
              setTab(key);
              setSelected(null);
              resource.reload();
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "orders" ? (
        <OrdersPanel />
      ) : tab === "settings" ? (
        <SettingsPanel />
      ) : (
        <>
          <AsyncState
            loading={resource.loading}
            error={resource.error}
            retry={resource.reload}
          />
          {resource.data && (
            <>
              {tab === "inventory" ? (
                <section>
                  <h2>Inventario</h2>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={low}
                      onChange={(e) => setLow(e.target.checked)}
                    />
                    Solo stock bajo (5 o menos)
                  </label>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>SKU / Variante</th>
                          <th>Precio</th>
                          <th>Disponible</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resource.data.products
                          .filter((p) => p.kind === "physical")
                          .flatMap((p) =>
                            p.product_variants
                              .filter((v) => !low || v.stock <= 5)
                              .map((v) => (
                                <tr key={v.id}>
                                  <td>{p.name}</td>
                                  <td>
                                    {v.sku}
                                    <br />
                                    {variantLabel(v)}
                                  </td>
                                  <td>{money(v.price_cents)}</td>
                                  <td>{v.stock === 0 ? "Agotado" : v.stock}</td>
                                  <td>
                                    <button onClick={() => edit(p.id, p.kind)}>
                                      Editar stock
                                    </button>
                                  </td>
                                </tr>
                              )),
                          )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : selected !== null ? (
                selected !== "new" &&
                !resource.data.products.some((p) => p.id === selected) ? (
                  <p role="status">Cargando registro guardado…</p>
                ) : (
                  <ProductEditor
                    key={selected}
                    product={resource.data.products.find(
                      (p) => p.id === selected,
                    )}
                    categories={resource.data.categories}
                    kind={tab}
                    onClose={() => setSelected(null)}
                    onSaved={(id) => {
                      setSelected(id);
                      resource.reload();
                    }}
                  />
                )
              ) : (
                <section>
                  <div className="section-toolbar">
                    <h1>
                      {tab === "course" ? "Instruccionales" : "Productos"}
                    </h1>
                    <button
                      className="button button-primary"
                      onClick={() => setSelected("new")}
                    >
                      Crear {tab === "course" ? "instruccional" : "producto"}
                    </button>
                  </div>
                  <label>
                    Buscar
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Estado</th>
                          <th>{tab === "course" ? "Precio" : "Variantes"}</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resource.data.products
                          .filter(
                            (p) =>
                              p.kind === tab &&
                              p.name
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                          )
                          .map((p) => (
                            <tr key={p.id}>
                              <td>{p.name}</td>
                              <td>
                                {
                                  {
                                    active: "Publicado",
                                    draft: "Borrador",
                                    archived: "Desactivado",
                                  }[p.status]
                                }
                              </td>
                              <td>
                                {tab === "course"
                                  ? p.product_variants[0]
                                    ? money(p.product_variants[0].price_cents)
                                    : "Sin precio"
                                  : p.product_variants.length}
                              </td>
                              <td>
                                <button onClick={() => setSelected(p.id)}>
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {!resource.data.products.some((p) => p.kind === tab) && (
                    <p className="notice">No hay registros. Crea el primero.</p>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
