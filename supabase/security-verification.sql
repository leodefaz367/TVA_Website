-- Read-only verification; no customer records or session tokens are returned.
select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' or (schemaname='storage' and tablename='objects') order by schemaname,tablename,policyname;
select n.nspname,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') order by n.nspname,p.proname;
select has_function_privilege('anon','private.create_order_internal(uuid,jsonb,jsonb)','execute') as must_be_false;
select id,public,file_size_limit,allowed_mime_types from storage.buckets;
