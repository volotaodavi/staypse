-- rls_auto_enable() é um gatilho de evento criado pelo painel do Supabase
-- (liga RLS em tabelas novas). Não deve ser chamável pela API (/rest/v1/rpc).
-- Gatilhos de evento rodam sem precisar de EXECUTE do papel que fez o DDL.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
