import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { trailerEmbed, validateDriveUrl } from "../utils/instructionals.ts";

test("el tráiler admite YouTube y rechaza HTML, protocolos y dominios ajenos", () => {
  assert.equal(trailerEmbed(""), null);
  for (const url of [
    "https://youtu.be/abcdefghijk",
    "https://www.youtube.com/watch?v=abcdefghijk&t=30",
    "https://youtube.com/shorts/abcdefghijk",
  ])
    assert.equal(
      trailerEmbed(url),
      "https://www.youtube-nocookie.com/embed/abcdefghijk?hl=es",
    );
  for (const url of [
    "<iframe src=x>",
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
    "https://evil.test@youtube.com/watch?v=abcdefghijk",
    "https://youtube.com:444/watch?v=abcdefghijk",
    "https://drive.google.com/file/d/privado/view",
  ])
    assert.throws(() => trailerEmbed(url));
  assert.equal(
    validateDriveUrl(
      "https://drive.google.com/drive/folders/curso_123?usp=sharing",
    ),
    "https://drive.google.com/drive/folders/curso_123?usp=sharing",
  );
  for (const url of [
    "http://drive.google.com/drive/folders/a",
    "https://drive.google.com.evil.test/drive/folders/a",
    "https://drive.google.com@evil.test/drive/folders/a",
  ])
    assert.throws(() => validateDriveUrl(url));
});

test("Drive privado y entregas parciales persisten con permisos y transacciones reales", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,banned_until timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true))$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    for (const file of [
      "202609100001_commerce.sql",
      "202609100002_security.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(
      await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    const legacyProduct = (
      await db.query(
        "insert into public.products(name,slug,status) values ('Compra histórica','compra-historica','active') returning id",
      )
    ).rows[0].id;
    const legacyVariant = (
      await db.query(
        "insert into public.product_variants(product_id,sku,price_cents,stock) values ($1,'HISTORICO',700,2) returning id",
        [legacyProduct],
      )
    ).rows[0].id;
    const legacyOrder = (
      await db.query("select public.create_order($1,$2,$3) receipt", [
        crypto.randomUUID(),
        JSON.stringify({
          name: "Cliente anterior",
          email: "anterior@example.test",
          phone: "0999999999",
          delivery_method: "pickup",
        }),
        JSON.stringify([{ variant_id: legacyVariant, quantity: 1 }]),
      ])
    ).rows[0].receipt.id;
    await db.query("update public.orders set status='fulfilled' where id=$1", [
      legacyOrder,
    ]);
    await db.exec(
      "insert into public.instructional_modules(product_id,title) select product_id,'Módulo anterior' from public.instructional_courses; insert into public.instructional_media(module_id,title,resource) select id,'Referencia anterior','ubicación privada anterior' from public.instructional_modules;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609110001_instructionals.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const historical = (
      await db.query(
        "select product_id,product_name,unit_price_cents from public.order_items where order_id=$1",
        [legacyOrder],
      )
    ).rows[0];
    assert.deepEqual(historical, {
      product_id: legacyProduct,
      product_name: "Compra histórica",
      unit_price_cents: 700,
    });
    assert.equal(
      (
        await db.query("select status from public.orders where id=$1", [
          legacyOrder,
        ])
      ).rows[0].status,
      "fulfilled",
    );
    assert.equal(
      (await db.query("select * from public.instructional_media")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.order_item_deliveries")).rows
        .length,
      0,
    );
    const admin = crypto.randomUUID(),
      session = crypto.randomUUID(),
      ordinary = crypto.randomUUID();
    await db.query("insert into auth.users(id) values ($1),($2)", [
      admin,
      ordinary,
    ]);
    await db.query("insert into auth.sessions(id,user_id) values ($1,$2)", [
      session,
      admin,
    ]);
    await db.query("insert into public.admin_users(user_id) values ($1)", [
      admin,
    ]);
    const identity = async (role, user = admin, sid = session) => {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.session_id',$2,false)",
        [user, sid],
      );
      await db.exec("set role " + role);
    };
    const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
    const variants = [],
      products = [];
    for (let n = 0; n < 3; n++) {
      const kind = n < 2 ? "course" : "physical";
      const p = await one(
        "insert into public.products(name,slug,kind) values ($1,$2,$3) returning id",
        ["Prueba " + n, "prueba-" + n, kind],
      );
      products.push(p.id);
      const v = await one(
        "insert into public.product_variants(product_id,sku,price_cents,stock) values ($1,$2,1000,$3) returning id",
        [p.id, "PRUEBA-" + n, n < 2 ? 0 : 10],
      );
      variants.push(v.id);
      if (n < 2) {
        await db.query(
          "insert into public.instructional_courses(product_id,trailer_url) values ($1,'https://youtu.be/abcdefghijk')",
          [p.id],
        );
        await assert.rejects(
          db.query("update public.products set status='active' where id=$1", [
            p.id,
          ]),
          /COURSE_PUBLICATION_INCOMPLETE/,
        );
        await db.query(
          "insert into public.product_images(product_id,url) values ($1,'/assets/test.png')",
          [p.id],
        );
        await db.query(
          "insert into public.instructional_delivery_settings(product_id,drive_url) values ($1,'https://drive.google.com/drive/folders/privado')",
          [p.id],
        );
      }
      // Publicar sin módulos está permitido.
      await db.query("update public.products set status='active' where id=$1", [
        p.id,
      ]);
    }
    for (const role of ["anon", "authenticated"]) {
      await identity(role, ordinary, "");
      assert.equal(
        (await db.query("select * from public.instructional_courses")).rows
          .length,
        2,
      );
      if (role === "anon") {
        await assert.rejects(
          db.query("select * from public.instructional_delivery_settings"),
          /permission denied/,
        );
        await assert.rejects(
          db.query("select * from public.order_item_deliveries"),
          /permission denied/,
        );
      } else {
        assert.equal(
          (
            await db.query(
              "select * from public.instructional_delivery_settings",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.order_item_deliveries")).rows
            .length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.instructional_delivery_settings(product_id,drive_url) values ($1,'https://drive.google.com/drive/folders/ataque')",
            [products[2]],
          ),
          /row-level security/,
        );
        await assert.rejects(
          db.query("select public.record_item_delivery($1,'email')", [
            crypto.randomUUID(),
          ]),
          /FORBIDDEN/,
        );
      }
    }
    const customer = {
      name: "Comprador de prueba",
      email: "cuenta@example.test",
      phone: "0999999999",
      delivery_method: "pickup",
      notes: "",
    };
    const receipt = (
      await one("select public.create_order($1,$2,$3) receipt", [
        crypto.randomUUID(),
        JSON.stringify(customer),
        JSON.stringify(
          variants.map((variant_id) => ({
            variant_id,
            quantity: 1,
            expected_price_cents: 1000,
          })),
        ),
      ])
    ).receipt;
    await identity("authenticated");
    const items = (
      await db.query(
        "select * from public.order_items where order_id=$1 order by kind,product_name",
        [receipt.id],
      )
    ).rows;
    assert.ok(items.every((i) => i.product_id));
    assert.equal(
      (await db.query("select * from public.order_item_deliveries")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("select public.record_item_delivery($1,'email')", [items[0].id]),
      /PAYMENT_NOT_CONFIRMED/,
    );
    await db.query("select public.change_order_status($1,'confirmed')", [
      receipt.id,
    ]);
    assert.equal(
      (await db.query("select * from public.order_item_deliveries")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("select public.change_order_status($1,'fulfilled')", [
        receipt.id,
      ]),
      /DELIVERY_PENDING/,
    );
    await assert.rejects(
      db.query("select public.record_item_delivery($1,'pickup')", [
        items[0].id,
      ]),
      /INVALID_DELIVERY_CHANNEL/,
    );
    await db.query("select public.record_item_delivery($1,'email')", [
      items[0].id,
    ]);
    // Un reintento no cambia la fecha ni el medio de la entrega original.
    const first = await one(
      "select * from public.order_item_deliveries where order_item_id=$1",
      [items[0].id],
    );
    await db.query("select public.record_item_delivery($1,'whatsapp')", [
      items[0].id,
    ]);
    assert.deepEqual(
      await one(
        "select * from public.order_item_deliveries where order_item_id=$1",
        [items[0].id],
      ),
      first,
    );
    assert.equal(
      (await one("select status from public.orders where id=$1", [receipt.id]))
        .status,
      "confirmed",
    );
    await assert.rejects(
      db.query("select public.change_order_status($1,'cancelled')", [
        receipt.id,
      ]),
      /DELIVERY_ALREADY_RECORDED/,
    );
    assert.equal(
      (
        await one("select stock from public.product_variants where id=$1", [
          variants[2],
        ])
      ).stock,
      9,
    );
    await db.query("select public.record_item_delivery($1,'whatsapp')", [
      items[1].id,
    ]);
    await assert.rejects(
      db.query("select public.change_order_status($1,'fulfilled')", [
        receipt.id,
      ]),
      /DELIVERY_PENDING/,
    );
    await db.query("select public.record_item_delivery($1,'pickup')", [
      items[2].id,
    ]);
    assert.equal(
      (await one("select status from public.orders where id=$1", [receipt.id]))
        .status,
      "fulfilled",
    );
    await db.query(
      "update public.instructional_delivery_settings set drive_url='https://drive.google.com/drive/folders/nuevo' where product_id=$1",
      [items[0].product_id],
    );
    assert.equal(
      (
        await one(
          "select drive_url from public.order_item_deliveries where order_item_id=$1",
          [items[0].id],
        )
      ).drive_url,
      first.drive_url,
    );
    await assert.rejects(
      db.query(
        "delete from public.order_item_deliveries where order_item_id=$1",
        [items[0].id],
      ),
      /permission denied/,
    );
    await identity("authenticated", admin, "");
    assert.equal(
      (await db.query("select * from public.instructional_delivery_settings"))
        .rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.record_item_delivery($1,'email')", [items[0].id]),
      /FORBIDDEN/,
    );
  } finally {
    await db.close();
  }
});
