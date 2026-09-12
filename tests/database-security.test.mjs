import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("security migration enforces roles, revocation, quotas and auditing", async (t) => {
  const db = new PGlite();
  const admin = crypto.randomUUID(),
    session = crypto.randomUUID(),
    ordinary = crypto.randomUUID();
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
      "202609120001_academy_photos.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
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
    const p = (
      await db.query(
        "insert into public.products(name,slug,status) values ('<img src=x onerror=alert(1)>','security-fixture','active') returning id",
      )
    ).rows[0].id;
    const v = (
      await db.query(
        "insert into public.product_variants(product_id,sku,price_cents,stock) values ($1,'SECURITY',2500,100) returning id",
        [p],
      )
    ).rows[0].id;
    const identity = async (uid, sid, role = "authenticated") => {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.session_id',$2,false)",
        [uid, sid],
      );
      await db.exec("set role " + role);
    };
    const customer = {
      name: "Security test",
      email: "security@example.test",
      phone: "0999999999",
      delivery_method: "pickup",
      notes: "",
    };
    const order = (
      key = crypto.randomUUID(),
      items = [{ variant_id: v, quantity: 1, expected_price_cents: 2500 }],
    ) =>
      db.query("select public.create_order($1,$2,$3) receipt", [
        key,
        JSON.stringify(customer),
        JSON.stringify(items),
      ]);
    await t.test(
      "every catalog write is denied to visitors and ordinary users",
      async () => {
        for (const role of ["anon", "authenticated"]) {
          await identity(ordinary, "", role);
          for (const sql of [
            "insert into public.categories(name,slug) values ('attack','attack')",
            "insert into public.site_settings(key,value) values ('attack','attack')",
            "insert into public.product_variants(product_id,sku,price_cents) values ($1,'ATTACK',0)",
            "insert into public.product_images(product_id,url) values ($1,'/assets/test.png')",
            "insert into public.instructional_courses(product_id) values ($1)",
            "insert into public.instructional_modules(product_id,title) values ($1,'attack')",
            "insert into public.instructional_media(module_id,title,resource) values ($1,'attack','attack')",
          ])
            await assert.rejects(
              () => db.query(sql, sql.includes("$1") ? [p] : []),
              /permission denied|row-level security/,
            );
          if (role === "anon")
            await assert.rejects(() =>
              db.query("update public.products set name='hacked' where id=$1", [
                p,
              ]),
            );
          else
            assert.equal(
              (
                await db.query(
                  "update public.products set name='hacked' where id=$1 returning id",
                  [p],
                )
              ).rows.length,
              0,
            );
          await assert.rejects(() =>
            db.query(
              "insert into public.products(name,slug) values ('hacked','hacked')",
            ),
          );
          await assert.rejects(() =>
            db.query("insert into public.admin_users(user_id) values ($1)", [
              ordinary,
            ]),
          );
          await assert.rejects(() =>
            db.query(
              "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
              [p + "/" + crypto.randomUUID() + ".png"],
            ),
          );
          await assert.rejects(() =>
            db.query("select private.create_order_internal($1,$2,$3)", [
              crypto.randomUUID(),
              JSON.stringify(customer),
              "[]",
            ]),
          );
        }
      },
    );
    await t.test(
      "admin session grants access; ban, expiry and logout revoke it",
      async () => {
        await identity(admin, session);
        assert.equal(
          (await db.query("select public.is_admin() ok")).rows[0].ok,
          true,
        );
        for (const statement of [
          "update auth.users set banned_until=now()+interval '1 day'",
          "update auth.sessions set not_after=now()-interval '1 second'",
        ]) {
          await db.exec("reset role");
          await db.exec(statement);
          await db.exec("set role authenticated");
          assert.equal(
            (await db.query("select public.is_admin() ok")).rows[0].ok,
            false,
          );
          await db.exec("reset role");
          await db.exec(
            "update auth.users set banned_until=null; update auth.sessions set not_after=null",
          );
        }
        await db.exec("delete from auth.sessions");
        await db.exec("set role authenticated");
        assert.equal(
          (await db.query("select public.is_admin() ok")).rows[0].ok,
          false,
        );
        await db.exec("reset role");
        await db.query("insert into auth.sessions(id,user_id) values ($1,$2)", [
          session,
          admin,
        ]);
      },
    );
    await t.test(
      "tampered quantities, prices, UUIDs and inactive variants are rejected",
      async () => {
        await identity("", "", "anon");
        for (const quantity of [-1, 0, 100, 1.2])
          await assert.rejects(() =>
            order(undefined, [{ variant_id: v, quantity }]),
          );
        await assert.rejects(() =>
          order(undefined, [{ variant_id: "' OR 1=1--", quantity: 1 }]),
        );
        await assert.rejects(
          () =>
            order(undefined, [
              { variant_id: crypto.randomUUID(), quantity: 1 },
            ]),
          /VARIANT_UNAVAILABLE/,
        );
        await assert.rejects(
          () =>
            order(undefined, [
              { variant_id: v, quantity: 1, expected_price_cents: 1 },
            ]),
          /PRICE_CHANGED/,
        );
        await db.exec("reset role");
        await db.query(
          "update public.product_variants set active=false where id=$1",
          [v],
        );
        await db.exec("set role anon");
        await assert.rejects(() => order(), /VARIANT_UNAVAILABLE/);
        await db.exec("reset role");
        await db.query(
          "update public.product_variants set active=true where id=$1",
          [v],
        );
      },
    );
    await t.test(
      "quotas apply to direct RPC calls and retries do not consume stock twice",
      async () => {
        await identity("", "", "anon");
        const key = crypto.randomUUID();
        const first = (await order(key)).rows[0].receipt;
        assert.equal((await order(key)).rows[0].receipt.id, first.id);
        await order();
        await order();
        await assert.rejects(() => order(), /ORDER_RATE_LIMIT/);
        await assert.rejects(() =>
          db.query("select * from public.orders where id=$1", [first.id]),
        );
        await identity(ordinary, "");
        assert.equal(
          (
            await db.query("select * from public.orders where id=$1", [
              first.id,
            ])
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "audit is append-only for admins and excludes buyer PII",
      async () => {
        await identity(admin, session);
        const rows = (await db.query("select * from public.admin_audit_log"))
          .rows;
        assert.ok(rows.length > 0);
        assert.doesNotMatch(
          JSON.stringify(rows),
          /security@example|0999999999|Security test/,
        );
        await assert.rejects(() =>
          db.query("delete from public.admin_audit_log"),
        );
        await assert.rejects(() =>
          db.query(
            "insert into storage.objects(bucket_id,name) values ('product-images','bad.svg')",
          ),
        );
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
          [p + "/" + crypto.randomUUID() + ".png"],
        );
      },
    );
    await t.test(
      "academy uploads append and only administrators can write",
      async () => {
        await identity(admin, session);
        await db.query(
          "insert into public.academy_photos(url,alt) values ('https://example.com/one.jpg','Primera'),('https://example.com/two.jpg','Segunda')",
        );
        assert.equal(
          (await db.query("select * from public.academy_photos")).rows.length,
          2,
        );
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('academy-images',$1)",
          [crypto.randomUUID() + ".jpg"],
        );
        await assert.rejects(() =>
          db.query(
            "insert into storage.objects(bucket_id,name) values ('academy-images','bad.svg')",
          ),
        );
        await identity(ordinary);
        assert.equal(
          (await db.query("select * from public.academy_photos")).rows.length,
          2,
        );
        await assert.rejects(() =>
          db.query(
            "insert into public.academy_photos(url,alt) values ('x','No permitido')",
          ),
        );
        await assert.rejects(() =>
          db.query(
            "insert into storage.objects(bucket_id,name) values ('academy-images',$1)",
            [crypto.randomUUID() + ".jpg"],
          ),
        );
      },
    );
  } finally {
    await db.close();
  }
});
