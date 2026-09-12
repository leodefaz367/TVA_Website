-- SOLO LECTURA: no genera pedidos ni modifica cuentas/objetos.
select c.relname as tabla,c.relrowsecurity as rls,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as politicas
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;

select id,public,file_size_limit,allowed_mime_types from storage.buckets;
select conrelid::regclass as tabla,conname,convalidated
from pg_constraint where connamespace='public'::regnamespace order by conrelid::regclass::text,conname;

select n.nspname,p.proname,p.prosecdef,p.proconfig,
  has_function_privilege('anon',p.oid,'execute') as anon_execute,
  has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prosecdef order by n.nspname,p.proname;

select count(*) as administradores_sin_mfa from public.admin_users a
where not exists(select 1 from auth.mfa_factors f where f.user_id=a.user_id and f.status='verified');
