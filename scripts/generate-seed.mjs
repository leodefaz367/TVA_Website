import { writeFile } from "node:fs/promises";
import { products } from "../data/products.ts";
const sql = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const statements = [
  "-- Initial TVA catalog. Re-runnable; existing records are preserved.",
  "-- Legacy prices and images are retained. Stock and sizes must be confirmed by an administrator.",
  "begin;",
  "insert into public.categories(name,slug) values ('Indumentaria','indumentaria'),('Instruccionales','instruccionales') on conflict(slug) do nothing;",
];
for (const [index, p] of products.entries()) {
  statements.push(
    "insert into public.products(name,slug,description,category_id,status) values (" +
      [
        sql(p.name),
        sql(p.slug),
        sql(p.description),
        "(select id from public.categories where slug='indumentaria')",
        "'draft'",
      ].join(",") +
      ") on conflict(slug) do nothing;",
  );
  statements.push(
    "insert into public.product_variants(product_id,sku,color,size,price_cents,stock,active) select id," +
      sql("TVA-LEGACY-" + String(index + 1).padStart(3, "0")) +
      ",'Por confirmar','Por confirmar'," +
      Math.round((p.price ?? 0) * 100) +
      ",0,false from public.products where slug=" +
      sql(p.slug) +
      " on conflict do nothing;",
  );
  statements.push(
    "insert into public.product_images(product_id,url,alt,is_primary) select id," +
      sql(p.image) +
      "," +
      sql(p.name) +
      ",not exists(select 1 from public.product_images i where i.product_id=p.id and i.is_primary) from public.products p where slug=" +
      sql(p.slug) +
      " and not exists(select 1 from public.product_images i where i.product_id=p.id and i.url=" +
      sql(p.image) +
      ");",
  );
}
statements.push(
  "insert into public.products(name,slug,description,kind,category_id,status) values ('Protect Ya Neck','protect-ya-neck','Sistema de grappling de Team Vivas Academy. Temario y precio por confirmar.','course',(select id from public.categories where slug='instruccionales'),'draft') on conflict(slug) do nothing;",
);
statements.push(
  "insert into public.instructional_courses(product_id) select id from public.products where slug='protect-ya-neck' on conflict do nothing;",
);
statements.push(
  "insert into public.product_images(product_id,url,alt,is_primary) select id,'/assets/protect-ya-neck.png','Protect Ya Neck',true from public.products p where slug='protect-ya-neck' and not exists(select 1 from public.product_images i where i.product_id=p.id);",
);
statements.push("commit;");
await writeFile(
  new URL("../supabase/seed.sql", import.meta.url),
  statements.join("\n") + "\n",
);
console.log(
  "Generated supabase/seed.sql from " +
    products.length +
    " original products; no database was modified.",
);
