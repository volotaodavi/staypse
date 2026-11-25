-- Pendências finais: relatório mensal com floor e funções SECURITY DEFINER recusam usuário suspenso.

-- 1. Relatório mensal de comissões: floor, igual ao split e aos painéis
create or replace function public.relatorio_comissoes(p_mes date)
returns table (nome text, email text, arroba text, forma_pagamento text, comissao_percentual numeric,
               status text, cliques bigint, pedidos bigint, vendido_centavos bigint, comissao_centavos bigint)
language sql stable security definer set search_path = '' as $$
  with periodo as (
    select (date_trunc('month', p_mes::timestamp) at time zone 'America/Sao_Paulo') as ini,
           ((date_trunc('month', p_mes::timestamp) + interval '1 month') at time zone 'America/Sao_Paulo') as fim
  )
  select pr.nome, v.email, s.slug,
         -- valores que valiam no fim do mês (pelo histórico), não os de hoje
         coalesce((select h.valor_novo from public.loja_vendedores_historico h, periodo
                   where h.vendedor_id = v.id and h.campo = 'forma_pagamento' and h.alterado_em < periodo.fim
                   order by h.alterado_em desc limit 1), v.forma_pagamento),
         coalesce((select h.valor_novo::numeric from public.loja_vendedores_historico h, periodo
                   where h.vendedor_id = v.id and h.campo = 'comissao_percentual' and h.alterado_em < periodo.fim
                   order by h.alterado_em desc limit 1), v.comissao_percentual),
         coalesce((select h.valor_novo from public.loja_vendedores_historico h, periodo
                   where h.vendedor_id = v.id and h.campo = 'status' and h.alterado_em < periodo.fim
                   order by h.alterado_em desc limit 1), v.status),
         (select count(*) from public.clicks c join public.items i on i.id = c.item_id, periodo
          where c.storefront_id = s.id and i.producer_id = v.producer_id
            and c.criado_em >= periodo.ini and c.criado_em < periodo.fim),
         coalesce(vd.pedidos, 0), coalesce(vd.vendido, 0), coalesce(vd.comissao, 0)
  from public.loja_vendedores v
  left join public.profiles pr on pr.id = v.user_id
  left join public.storefronts s on s.revendedor_id = v.user_id
  left join lateral (
    select count(distinct o.id) as pedidos,
           sum(oi.preco_unitario_centavos * oi.quantidade)::bigint as vendido,
           sum(floor(oi.preco_unitario_centavos * oi.quantidade * oi.comissao_percentual / 100))::bigint as comissao
    from public.orders o join public.order_items oi on oi.order_id = o.id, periodo
    where o.producer_id = v.producer_id and o.revendedor_id = v.user_id and o.status = 'pago'
      and o.pago_em >= periodo.ini and o.pago_em < periodo.fim
  ) vd on true
  where v.producer_id = public.minha_loja_id() and v.status <> 'convidado'
  order by pr.nome;
$$;

-- 2. Cada função vira "base" (sem acesso direto) e ganha uma casca que recusa quem está suspenso
do $$
declare r record; cham text; corpo text;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) args, pg_get_function_result(p.oid) res,
           p.proretset, coalesce((select string_agg(n, ', ' order by o) from unnest(p.proargnames) with ordinality u(n, o)
                      where p.proargmodes is null or p.proargmodes[o] in ('i', 'b')), '') nomes
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('minhas_comissoes', 'painel_indicador', 'painel_loja_resumo', 'painel_loja_produtos',
                        'painel_loja_afiliados', 'painel_loja_vendedores', 'painel_loja_taxas',
                        'loja_valores_pedidos', 'afiliado_valores_pedidos', 'relatorio_comissoes')
  loop
    execute format('alter function public.%I(%s) rename to %I', r.proname, r.args, r.proname || '_base');
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated', r.proname || '_base', r.args);
    corpo := case when r.proretset then format('return query select * from public.%I(%s);', r.proname || '_base', r.nomes)
                  else format('return public.%I(%s);', r.proname || '_base', r.nomes) end;
    execute format($f$create function public.%I(%s) returns %s language plpgsql stable security definer set search_path = '' as $b$
      begin
        if public.usuario_suspenso() then raise exception 'conta_suspensa'; end if;
        %s
      end; $b$ $f$, r.proname, r.args, r.res, corpo);
    execute format('revoke execute on function public.%I(%s) from public, anon', r.proname, r.args);
    execute format('grant execute on function public.%I(%s) to authenticated', r.proname, r.args);
  end loop;
end $$;
