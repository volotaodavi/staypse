-- Migração 20261218000001 — Área financeira de lojas, afiliados e vendedores
--  * extrato do próprio usuário (sem expor o snapshot do split, que não é legível por usuários);
--  * tabela saques: pedidos de saque da subconta Lytex de cada um (a Staypse nunca guarda o dinheiro).
-- Cada um vê só os próprios saques; o admin vê todos (somente leitura). Escrita só pelo servidor.

-- 1. Extrato: uma linha por pedido do período, com os valores do split registrados na venda
create or replace function public.meu_extrato_financeiro(p_papel text, p_inicio timestamptz, p_fim timestamptz)
returns table (pedido_id uuid, codigo text, data timestamptz, situacao text,
               vendido_centavos bigint, taxa_centavos bigint, recebe_centavos bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_eu uuid := (select auth.uid());
begin
  if v_eu is null then raise exception 'nao_autenticado'; end if;
  if p_papel not in ('produtor', 'afiliado', 'vendedor') then raise exception 'papel_invalido'; end if;
  return query
  select o.id, o.codigo, o.criado_em, public.situacao_comissao(o.status, o.arrependimento_ate),
         o.total_centavos::bigint,
         public.fin_snapshot_valor(o.split_snapshot, case p_papel when 'produtor' then 'taxaLojaCentavos' else 'taxaAfiliadoCentavos' end),
         public.fin_snapshot_valor(o.split_snapshot, case p_papel when 'produtor' then 'produtorCentavos' else 'indicadorCentavos' end)
  from public.orders o
  where o.split_snapshot is not null
    and o.criado_em >= p_inicio and o.criado_em < p_fim
    and o.status in ('pago', 'em_reembolso', 'reembolsado', 'chargeback')
    and case p_papel
          when 'produtor' then o.producer_id in (select p.id from public.producers p where p.user_id = v_eu)
          when 'afiliado' then o.revendedor_id = v_eu and o.vendedor_id is null
          else o.revendedor_id = v_eu and exists (
                 select 1 from public.loja_vendedores lv where lv.id = o.vendedor_id and lv.forma_pagamento = 'split_direto')
        end
  order by o.criado_em desc
  limit 2000;
end; $$;
revoke execute on function public.meu_extrato_financeiro(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.meu_extrato_financeiro(text, timestamptz, timestamptz) to authenticated;

-- 2. Saques
create table public.saques (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  papel              text not null check (papel in ('produtor', 'afiliado', 'vendedor')),
  valor_centavos     integer not null check (valor_centavos > 0),
  custo_centavos     integer not null default 0 check (custo_centavos >= 0),
  status             text not null default 'pendente' check (status in ('pendente', 'concluido', 'falhou')),
  provedor           text not null check (provedor in ('mock', 'lytex')),
  provedor_id        text,
  -- idempotência: o mesmo formulário enviado duas vezes não cria dois saques
  chave_idempotencia text not null check (char_length(chave_idempotencia) between 8 and 80),
  erro               text check (char_length(erro) <= 200),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  unique (user_id, chave_idempotencia)
);
-- no máximo 1 saque pendente por pessoa
create unique index saques_um_pendente_uk on public.saques (user_id) where status = 'pendente';
create index saques_user_idx on public.saques (user_id, criado_em desc);
create trigger saques_atualizado_em before update on public.saques
  for each row execute function public.set_atualizado_em();

alter table public.saques enable row level security;
revoke all on public.saques from anon, authenticated;
grant select on public.saques to authenticated;
grant select, insert, update on public.saques to service_role;
create policy "saques: o próprio ou admin" on public.saques
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
comment on table public.saques is
  'Pedidos de saque da subconta Lytex de cada usuário. Só registro: o dinheiro nunca passa pela Staypse. Escrita só pelo servidor.';

-- 3. Tipo de notificação novo
alter table public.notificacoes drop constraint notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'venda_paga', 'pedido_sem_nf', 'desistencia', 'reembolso', 'chargeback',
  'afiliacao_pedida', 'atendimento_novo',
  'afiliacao_aprovada', 'afiliacao_recusada', 'afiliacao_bloqueada',
  'venda_atribuida', 'comissao_estornada',
  'recebedor_aprovado', 'recebedor_recusado', 'recebedor_suspenso',
  'denuncia_nova', 'loja_curadoria', 'saque_staypse',
  'taxas_novas', 'pagamento_tardio', 'pagamento_divergente', 'saque_usuario'));
