import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL commerce transactions and access policies", async (t) => {
  const db = new PGlite();
  try {
    // Minimal platform schemas only; the production commerce SQL is run unchanged.
    await db.exec(`
   create role anon; create role authenticated;
   create schema auth; create schema storage;
   create table auth.users(id uuid primary key, banned_until timestamptz);
   create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
   create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true)) $$;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth,storage to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
   alter table storage.objects enable row level security;
   grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609100001_commerce.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    const count = async (sql) => (await db.query(sql)).rows[0];
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609100002_security.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await t.test(
      "seed preserves seven legacy products and is repeatable",
      async () => {
        assert.equal(
          (
            await count(
              "select count(*)::int n from public.products where kind='physical'",
            )
          ).n,
          7,
        );
        await db.exec(
          await readFile(
            new URL("../supabase/seed.sql", import.meta.url),
            "utf8",
          ),
        );
        assert.equal(
          (await count("select count(*)::int n from public.products")).n,
          8,
        );
        assert.equal(
          (await count("select count(*)::int n from public.product_images")).n,
          8,
        );
      },
    );
    const admin = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users(id) values ($1)", [admin]);
    await db.query("insert into auth.sessions(id,user_id) values ($1,$1)", [
      admin,
    ]);
    await db.query(
      "select set_config('request.jwt.claim.session_id',$1,false)",
      [admin],
    );
    await db.query("insert into public.admin_users(user_id) values ($1)", [
      admin,
    ]);
    const product = (
      await db.query(
        "insert into public.products(name,slug,status) values ('Test Rashguard','test-rashguard','active') returning id",
      )
    ).rows[0].id;
    const v = (
      await db.query(
        "insert into public.product_variants(product_id,sku,color,size,price_cents,stock) values ($1,'TEST-BLUE-M','Azul','M',2499,3) returning id",
        [product],
      )
    ).rows[0].id;
    const second = (
      await db.query(
        "insert into public.product_variants(product_id,sku,color,size,price_cents,stock) values ($1,'TEST-RED-S','Rojo','S',2999,1) returning id",
        [product],
      )
    ).rows[0].id;
    const buyer = {
      name: "Cliente de prueba",
      email: "test@example.com",
      phone: "0984198059",
      delivery_method: "pickup",
      notes: "",
    };
    const make = (key, items, customer = buyer) =>
      db.query("select public.create_order($1,$2::jsonb,$3::jsonb) receipt", [
        key,
        JSON.stringify(customer),
        JSON.stringify(items),
      ]);
    let order;
    await t.test(
      "anonymous order reserves stock and stores authoritative historical prices",
      async () => {
        await db.exec("set role anon");
        const result = await make("22222222-2222-4222-8222-222222222222", [
          { variant_id: v, quantity: 2, price_cents: 1 },
        ]);
        order = result.rows[0].receipt.id;
        assert.equal(result.rows[0].receipt.total_cents, 4998);
        await db.exec("reset role");
        assert.equal(
          (
            await count(
              "select stock from public.product_variants where id='" + v + "'",
            )
          ).stock,
          1,
        );
        assert.equal(
          (
            await count(
              "select unit_price_cents from public.order_items where order_id='" +
                order +
                "'",
            )
          ).unit_price_cents,
          2499,
        );
      },
    );
    await t.test(
      "identical retry creates no duplicate and reserves no extra stock",
      async () => {
        const result = await make("22222222-2222-4222-8222-222222222222", [
          { variant_id: v, quantity: 2, price_cents: 1 },
        ]);
        assert.equal(result.rows[0].receipt.id, order);
        assert.equal(
          (await count("select count(*)::int n from public.orders")).n,
          1,
        );
        assert.equal(
          (
            await count(
              "select stock from public.product_variants where id='" + v + "'",
            )
          ).stock,
          1,
        );
      },
    );
    await t.test(
      "reusing a request key with changed contents is rejected",
      async () => {
        await assert.rejects(
          () =>
            make("22222222-2222-4222-8222-222222222222", [
              { variant_id: v, quantity: 1 },
            ]),
          /REQUEST_CONFLICT/,
        );
      },
    );
    await t.test("insufficient stock rolls back the whole order", async () => {
      await assert.rejects(
        () =>
          make(crypto.randomUUID(), [
            { variant_id: second, quantity: 1 },
            { variant_id: v, quantity: 2 },
          ]),
        /INSUFFICIENT_STOCK/,
      );
      assert.equal(
        (await count("select count(*)::int n from public.orders")).n,
        1,
      );
      assert.equal(
        (
          await count(
            "select stock from public.product_variants where id='" +
              second +
              "'",
          )
        ).stock,
        1,
      );
    });
    await t.test(
      "price changes require renewed buyer confirmation",
      async () => {
        await assert.rejects(
          () =>
            make(crypto.randomUUID(), [
              { variant_id: v, quantity: 1, expected_price_cents: 1 },
            ]),
          /PRICE_CHANGED/,
        );
      },
    );
    await t.test(
      "server rejects fractional, missing and duplicate quantities",
      async () => {
        await assert.rejects(
          () => make(crypto.randomUUID(), [{ variant_id: v, quantity: 1.5 }]),
          /INVALID_QUANTITY/,
        );
        await assert.rejects(
          () => make(crypto.randomUUID(), [{ variant_id: v }]),
          /INVALID_QUANTITY/,
        );
        await assert.rejects(
          () =>
            make(crypto.randomUUID(), [
              { variant_id: v, quantity: 1 },
              { variant_id: v, quantity: 1 },
            ]),
          /DUPLICATE_VARIANT/,
        );
        await assert.rejects(
          () =>
            make(crypto.randomUUID(), [{ variant_id: v, quantity: 1 }], {
              ...buyer,
              email: "wrong",
            }),
          /check constraint/,
        );
      },
    );
    await t.test(
      "anonymous callers cannot view orders, drafts or change stock",
      async () => {
        await db.exec("set role anon");
        assert.equal(
          (
            await count(
              "select count(*)::int n from public.products where status='draft'",
            )
          ).n,
          0,
        );
        await assert.rejects(
          () => db.query("select * from public.orders"),
          /permission denied/,
        );
        await assert.rejects(
          () => db.query("update public.product_variants set stock=100"),
          /permission denied/,
        );
        await assert.rejects(
          () =>
            db.query("select public.change_order_status($1,'cancelled')", [
              order,
            ]),
          /permission denied/,
        );
        assert.equal(
          (
            await count(
              "select count(*)::int n from public.instructional_media",
            )
          ).n,
          0,
        );
        await db.exec("reset role");
      },
    );
    await t.test(
      "ordinary authenticated users cannot promote themselves or administer orders",
      async () => {
        await db.exec("set role authenticated");
        await assert.rejects(
          () =>
            db.query("insert into public.admin_users(user_id) values ($1)", [
              admin,
            ]),
          /permission denied/,
        );
        await assert.rejects(
          () =>
            db.query("select public.change_order_status($1,'cancelled')", [
              order,
            ]),
          /FORBIDDEN/,
        );
        assert.equal(
          (await count("select count(*)::int n from public.orders")).n,
          0,
        );
        await db.exec("reset role");
      },
    );
    await t.test(
      "admin cancellation returns stock exactly once and terminal status is enforced",
      async () => {
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          admin,
        ]);
        await db.exec("set role authenticated");
        assert.equal(
          (await count("select count(*)::int n from public.orders")).n,
          1,
        );
        await db.query("select public.change_order_status($1,'cancelled')", [
          order,
        ]);
        await db.query("select public.change_order_status($1,'cancelled')", [
          order,
        ]);
        assert.equal(
          (
            await count(
              "select stock from public.product_variants where id='" + v + "'",
            )
          ).stock,
          3,
        );
        await assert.rejects(
          () =>
            db.query("select public.change_order_status($1,'fulfilled')", [
              order,
            ]),
          /INVALID_TRANSITION/,
        );
        await db.exec("reset role");
      },
    );
    await t.test(
      "historical order price does not follow catalog changes",
      async () => {
        await db.query(
          "update public.product_variants set price_cents=3000 where id=$1",
          [v],
        );
        assert.equal(
          (
            await count(
              "select unit_price_cents from public.order_items where order_id='" +
                order +
                "'",
            )
          ).unit_price_cents,
          2499,
        );
      },
    );
    await t.test(
      "digital access requires quantity one and does not decrement stock",
      async () => {
        const p = (
          await db.query(
            "insert into public.products(name,slug,kind,status) values ('Course test','course-test','course','active') returning id",
          )
        ).rows[0].id;
        const variant = (
          await db.query(
            "insert into public.product_variants(product_id,sku,price_cents,stock) values ($1,'TEST-DIGITAL',5000,0) returning id",
            [p],
          )
        ).rows[0].id;
        await assert.rejects(
          () =>
            make(crypto.randomUUID(), [{ variant_id: variant, quantity: 2 }], {
              ...buyer,
              delivery_method: "digital",
            }),
          /DIGITAL_QUANTITY/,
        );
        const receipt = (
          await make(
            crypto.randomUUID(),
            [{ variant_id: variant, quantity: 1 }],
            { ...buyer, delivery_method: "digital" },
          )
        ).rows[0].receipt;
        assert.equal(receipt.total_cents, 5000);
        assert.equal(
          (
            await count(
              "select stock from public.product_variants where id='" +
                variant +
                "'",
            )
          ).stock,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
