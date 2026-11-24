-- Migração 20261219000001: correções do teste em produção e da auditoria completa (docs/auditoria-completa.md).
--  * índices nas chaves estrangeiras que as telas e as regras (RLS) consultam e que não tinham índice
--  * saque pedido na Lytex ficava "pendente" para sempre (a Lytex não tem consulta de status do saque) e o
--    índice saques_um_pendente_uk travava qualquer novo saque da pessoa: a conciliação diária encerra os antigos

create index if not exists orders_storefront_idx on public.orders (storefront_id) where storefront_id is not null;
create index if not exists atendimentos_user_idx on public.atendimentos (user_id);
create index if not exists atendimentos_pedido_idx on public.atendimentos (pedido_id) where pedido_id is not null;
create index if not exists entregas_proprias_producer_idx on public.entregas_proprias (producer_id);
create index if not exists entregas_proprias_entregador_idx on public.entregas_proprias (entregador_id) where entregador_id is not null;
create index if not exists loja_afiliados_bloqueados_afiliado_idx on public.loja_afiliados_bloqueados (afiliado_id);
create index if not exists clicks_external_link_idx on public.clicks (external_link_id) where external_link_id is not null;

-- Saque "pendente" há mais de 2 dias vira "concluido": a Lytex já aceitou o pedido e valida saldo e conta sozinha.
-- Só o servidor (conciliação) chama.
create or replace function public.encerrar_saques_pendentes(p_dias integer default 2)
returns integer
language sql
security definer
set search_path = ''
as $$
  with a as (
    update public.saques set status = 'concluido'
    where status = 'pendente' and criado_em < now() - make_interval(days => greatest(p_dias, 1))
    returning 1
  )
  select count(*)::integer from a;
$$;
revoke execute on function public.encerrar_saques_pendentes(integer) from public, anon, authenticated;
grant execute on function public.encerrar_saques_pendentes(integer) to service_role;
