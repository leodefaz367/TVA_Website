import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CartProvider, useCart } from "../hooks/useCart";
import { ProductView } from "../components/catalog/ProductDetail";
import Trailer from "../components/Trailer";
import { AcademyCarousel } from "../components/AcademyGallery";

test("la galería recorre las fotos con botones, teclado y deslizamiento", () => {
  render(
    <AcademyCarousel
      photos={[
        { id: "a", url: "/assets/training.png", alt: "Original" },
        { id: "b", url: "/assets/logo-tva.png", alt: "Adicional" },
      ]}
    />,
  );
  assert.ok(screen.getByAltText("Original"));
  fireEvent.click(screen.getByRole("button", { name: "Foto siguiente" }));
  assert.ok(screen.getByAltText("Adicional"));
  fireEvent.keyDown(screen.getByRole("button", { name: "Foto siguiente" }), {
    key: "ArrowRight",
  });
  assert.ok(screen.getByAltText("Original"));
  const photo = screen.getByAltText("Original").parentElement!;
  fireEvent.touchStart(photo, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchEnd(photo, {
    changedTouches: [{ clientX: 80, clientY: 105 }],
  });
  assert.ok(screen.getByAltText("Adicional"));
  fireEvent.click(screen.getByRole("button", { name: "Foto anterior" }));
  assert.ok(screen.getByAltText("Original"));
});
import OrderDelivery from "../components/admin/OrderDelivery";
import DigitalPriceEditor from "../components/admin/DigitalPriceEditor";
import type { Product } from "../types/commerce";
const product: Product = {
  id: "p",
  name: "Rashguard de prueba",
  slug: "rashguard-prueba",
  description: "Producto exclusivo de las pruebas automatizadas.",
  category_id: null,
  kind: "physical",
  status: "active",
  featured: false,
  created_at: "",
  updated_at: "",
  product_images: [],
  instructional_courses: null,
  instructional_modules: [],
  product_variants: [
    {
      id: "blue-m",
      product_id: "p",
      sku: "BLUE-M",
      color: "Azul",
      size: "M",
      price_cents: 2400,
      stock: 2,
      active: true,
    },
    {
      id: "blue-l",
      product_id: "p",
      sku: "BLUE-L",
      color: "Azul",
      size: "L",
      price_cents: 2500,
      stock: 0,
      active: true,
    },
    {
      id: "red-m",
      product_id: "p",
      sku: "RED-M",
      color: "Rojo",
      size: "M",
      price_cents: 2800,
      stock: 5,
      active: true,
    },
  ],
};
function CartProbe() {
  const cart = useCart();
  return <output data-testid="cart">{JSON.stringify(cart.lines)}</output>;
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

test("un instruccional sin módulos muestra portada y tráiler sin un temario vacío", () => {
  const { container } = render(
    <CartProvider>
      <ProductView
        product={{
          ...product,
          kind: "course",
          instructional_courses: {
            product_id: "p",
            trainer: "Michael",
            level: "",
            delivery_note: "Entrega manual",
            trailer_url: "https://youtu.be/abcdefghijk",
          },
          product_variants: [
            { ...product.product_variants[0], color: "", size: "", stock: 0 },
          ],
        }}
      />
    </CartProvider>,
  );
  assert.equal(screen.queryByRole("heading", { name: "Contenido" }), null);
  assert.equal(
    container.querySelector("iframe")?.getAttribute("src"),
    "https://www.youtube-nocookie.com/embed/abcdefghijk?hl=es",
  );
  assert.ok(screen.getByText(/autorizaremos manualmente/));
  assert.equal(screen.queryByLabelText("Color"), null);
});

test("los tráileres inválidos muestran una explicación sin incrustar HTML", () => {
  const { container } = render(<Trailer url="javascript:alert(1)" />);
  assert.ok(screen.getByRole("alert"));
  assert.equal(container.querySelector("iframe"), null);
});

test("el precio digital no muestra talla, color ni stock", () => {
  render(
    <DigitalPriceEditor
      product={{ ...product, kind: "course", product_variants: [] }}
      reload={() => {}}
    />,
  );
  assert.ok(screen.getByLabelText("Precio en USD"));
  assert.equal(screen.queryByLabelText("Color"), null);
  assert.equal(screen.queryByLabelText("Stock disponible"), null);
});

test("la entrega exige confirmación manual y conserva el estado al preparar un mensaje", () => {
  const item = {
    id: "i",
    variant_id: "v",
    product_name: "Curso de prueba",
    variant_label: "",
    sku: "c",
    kind: "course" as const,
    quantity: 1,
    unit_price_cents: 1000,
  };
  const order = {
    id: "o",
    status: "confirmed" as const,
    total_cents: 1000,
    subtotal_cents: 1000,
    customer_name: "Prueba",
    email: "cuenta@example.test",
    phone: "0999999999",
    delivery_method: "digital",
    notes: "",
    created_at: "",
    order_items: [item],
  };
  render(
    <OrderDelivery
      order={order}
      item={item}
      driveUrl="https://drive.google.com/drive/folders/prueba"
      reload={() => {}}
    />,
  );
  const button = screen.getByRole("button", {
    name: "Registrar entrega de este artículo",
  }) as HTMLButtonElement;
  assert.equal(button.disabled, true);
  fireEvent.click(screen.getByText("Preparar mensaje de entrega"));
  assert.equal(button.disabled, true);
  assert.ok(screen.getByText(/Pago confirmado · entrega pendiente/));
  fireEvent.click(screen.getByRole("checkbox"));
  assert.equal(button.disabled, false);
});

test("product HTML payloads render as text instead of executable markup", () => {
  const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
  const { container } = render(
    <CartProvider>
      <ProductView
        product={{ ...product, name: payload, description: payload }}
      />
    </CartProvider>,
  );
  assert.ok(container.textContent?.includes(payload));
  assert.equal(container.querySelectorAll("script, [onerror]").length, 0);
});
test("variant selection updates price and disables exhausted combinations", async () => {
  render(
    <CartProvider>
      <ProductView product={product} />
      <CartProbe />
    </CartProvider>,
  );
  await waitFor(() =>
    assert.ok(screen.getByRole("button", { name: "Agregar al carrito" })),
  );
  assert.match(screen.getByText("2 disponibles").textContent ?? "", /2/);
  fireEvent.change(screen.getByLabelText("Color"), {
    target: { value: "Rojo" },
  });
  assert.ok(screen.getByText("5 disponibles"));
  assert.ok(screen.getAllByText(/28[.,]00/).length);
  fireEvent.change(screen.getByLabelText("Color"), {
    target: { value: "Azul" },
  });
  fireEvent.change(screen.getByLabelText("Talla"), { target: { value: "L" } });
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Agregar al carrito",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  assert.ok(screen.getByText("Agotado o sin variantes disponibles"));
});
test("cart keeps variant identity, quantity and rejects addition over stock", async () => {
  render(
    <CartProvider>
      <ProductView product={product} />
      <CartProbe />
    </CartProvider>,
  );
  await waitFor(() => assert.ok(localStorage.getItem("tva-cart-v1")));
  fireEvent.change(screen.getByLabelText("Cantidad"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
  let lines = JSON.parse(screen.getByTestId("cart").textContent ?? "[]");
  assert.equal(lines[0].variant_id, "blue-m");
  assert.equal(lines[0].quantity, 2);
  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
  assert.match(screen.getByRole("alert").textContent ?? "", /supera/);
  lines = JSON.parse(screen.getByTestId("cart").textContent ?? "[]");
  assert.equal(lines[0].quantity, 2);
});
test("cart draft survives provider remount", async () => {
  const first = render(
    <CartProvider>
      <ProductView product={product} />
      <CartProbe />
    </CartProvider>,
  );
  await waitFor(() => assert.ok(localStorage.getItem("tva-cart-v1")));
  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
  await waitFor(() =>
    assert.match(localStorage.getItem("tva-cart-v1") ?? "", /blue-m/),
  );
  first.unmount();
  render(
    <CartProvider>
      <CartProbe />
    </CartProvider>,
  );
  await waitFor(() =>
    assert.match(screen.getByTestId("cart").textContent ?? "", /blue-m/),
  );
});
