import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(
    "Configure .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY first.",
  );
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const table of [
  "products",
  "categories",
  "product_variants",
  "product_images",
  "instructional_courses",
  "instructional_modules",
  "site_settings",
  "academy_photos",
]) {
  const { error } = await client
    .from(table)
    .select("*", { head: true, count: "exact" });
  if (error) throw new Error(table + ": " + error.message);
  console.log(table + ": accessible");
}
const { error: relationError } = await client
  .from("products")
  .select(
    "id, product_variants(id), product_images(id), instructional_courses(product_id), instructional_modules(id)",
  )
  .limit(1);
if (relationError)
  throw new Error("Catalog relationships: " + relationError.message);
const { data: privateMedia, error: mediaError } = await client
  .from("instructional_media")
  .select("id");
if (mediaError || privateMedia.length)
  throw new Error("Private-media policy needs review.");
const { error: ordersError } = await client
  .from("orders")
  .select("id")
  .limit(1);
if (!ordersError)
  throw new Error("Anonymous access to orders should be denied.");
console.log(
  "Public catalog and anonymous read restrictions verified. Authenticated administration and uploads still require live verification.",
);
const { data: admin, error: adminError } = await client.rpc("is_admin");
if (adminError || admin !== false)
  throw new Error("Anonymous admin check failed");
const { error: auditError } = await client
  .from("admin_audit_log")
  .select("id")
  .limit(1);
if (!auditError) throw new Error("Anonymous audit access should be denied");
console.log("Live security: anonymous admin=false, audit log inaccessible.");
for (const table of [
  "instructional_delivery_settings",
  "order_item_deliveries",
]) {
  const { error } = await client.from(table).select("*").limit(1);
  if (!error || error.code !== "42501")
    throw new Error(
      table +
        ": se esperaba acceso anónimo denegado; revisa que la migración esté aplicada.",
    );
}
const { error: trailerError } = await client
  .from("instructional_courses")
  .select("product_id,trailer_url")
  .limit(1);
if (trailerError)
  throw new Error("No está disponible el campo público del tráiler.");
const { data: bank, error: bankError } = await client
  .from("site_settings")
  .select("value")
  .eq("key", "bank_transfer")
  .single();
if (bankError || !bank?.value)
  throw new Error("Falta configurar la cuenta para transferencias.");
const account = JSON.parse(bank.value);
if (
  !["bank", "account_type", "account_number", "identification", "holder"].every(
    (key) => typeof account[key] === "string" && account[key].trim(),
  )
)
  throw new Error("Los datos bancarios están incompletos.");
console.log(
  "Instruccionales: tráiler disponible; enlaces y entregas privados. Cuenta bancaria configurada.",
);
