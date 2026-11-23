-- =========================================================================
-- Revisão jurídica (Marco Civil, Lei 12.965/2014, art. 15)
-- Registros de acesso à aplicação: IP, data e hora (com fuso) do login, do
-- cadastro e da criação de pedido, guardados por 6 meses e depois apagados.
-- O IP aqui é o endereço puro (o hash não serve para atender uma ordem
-- judicial), por isso: só o servidor grava, só o admin lê e a retenção é curta.
-- Os aceites de termos/contrato e o consentimento da lista de espera (versão
-- + data) já são gravados por migrações anteriores.
-- =========================================================================
create table public.registros_acesso (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  evento     text not null check (evento in ('login', 'cadastro', 'link_email', 'pedido')),
  user_id    uuid,
  ip         text not null check (char_length(ip) between 1 and 64)
);
create index registros_acesso_criado_idx on public.registros_acesso (criado_em);
create index registros_acesso_user_idx on public.registros_acesso (user_id);
alter table public.registros_acesso enable row level security;
revoke all on public.registros_acesso from anon, authenticated;
grant select on public.registros_acesso to authenticated;
grant insert on public.registros_acesso to service_role;
create policy "registros_acesso: só admin vê" on public.registros_acesso for select to authenticated using (public.is_admin());

-- retenção: 6 meses (Marco Civil, art. 15), junto da limpeza diária já agendada
create or replace function public.apagar_dados_vencidos()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.clicks where criado_em < now() - interval '24 months';
  delete from public.erros_app where criado_em < now() - interval '90 days';
  delete from public.registros_acesso where criado_em < now() - interval '6 months';
  -- atendimento: 5 anos (prazo do CDC para reclamar de danos, art. 27)
  delete from public.atendimentos where criado_em < now() - interval '5 years';
  perform public.expirar_pedidos();
end; $$;
revoke execute on function public.apagar_dados_vencidos() from public, anon, authenticated;
