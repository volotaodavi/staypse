-- Opção da loja "assumir a taxa do afiliado" (padrão: desligada). Ligada, o afiliado recebe a comissão cheia e a
-- loja paga toda a taxa. O total cobrado e a receita da Staypse não mudam (só a divisão da taxa entre loja e afiliado).
alter table public.producers add column assume_taxa_afiliado boolean not null default false;
-- (sem grant de update por coluna: a loja só muda pela função abaixo)

create or replace function public.salvar_assume_taxa(p_assume boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_antes boolean;
begin
  if p_assume is null then raise exception 'valor_invalido'; end if;
  select id, assume_taxa_afiliado into v_id, v_antes
  from public.producers where user_id = (select auth.uid()) and status_verificacao <> 'suspenso' for update;
  if v_id is null then raise exception 'loja_indisponivel'; end if;
  update public.producers set assume_taxa_afiliado = p_assume where id = v_id;
  perform public.registrar_auditoria('assume_taxa_afiliado_alterado', 'producer', v_id,
    jsonb_build_object('antes', v_antes, 'depois', p_assume));
end; $$;
revoke execute on function public.salvar_assume_taxa(boolean) from public, anon;
grant execute on function public.salvar_assume_taxa(boolean) to authenticated;

-- dados do split: agora com a opção da loja
create or replace function public.dados_split_pedido(p_order uuid, p_provedor text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o record; v_dono uuid; v_produtor text; v_indicador text; v_tipo text := 'nenhum'; v_papel text;
  v_forma text; v_pct numeric; v_pol record;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'pedido_inexistente'; end if;

  select p.user_id, p.parcelas_max, p.parcelas_sem_juros, p.assume_taxa_afiliado into v_pol from public.producers p where p.id = o.producer_id;
  v_dono := v_pol.user_id;
  select r.provedor_id into v_produtor from public.recebedores r
  where r.user_id = v_dono and r.papel = 'produtor' and r.provedor = p_provedor
    and r.status_recebedor = 'aprovado' and r.provedor_id is not null;
  if v_produtor is null then raise exception 'loja_sem_recebedor'; end if;

  if o.revendedor_id is not null then
    if o.vendedor_id is not null then
      select forma_pagamento into v_forma from public.loja_vendedores where id = o.vendedor_id;
      -- vendedor "na folha": a loja paga fora do split; "split_direto": recebe pelo provedor
      v_tipo := case when v_forma = 'split_direto' then 'vendedor_split' else 'vendedor_folha' end;
      v_papel := 'vendedor';
    else
      v_tipo := 'afiliado'; v_papel := 'afiliado';
    end if;
    if v_tipo <> 'vendedor_folha' then
      select r.provedor_id into v_indicador from public.recebedores r
      where r.user_id = o.revendedor_id and r.papel = v_papel and r.provedor = p_provedor
        and r.status_recebedor = 'aprovado' and r.provedor_id is not null;
      if v_indicador is null then raise exception 'indicador_sem_recebedor'; end if;
    end if;
  end if;

  -- um pedido tem uma só comissão (criar_pedido); max() é exata e evita média com arredondamento
  select coalesce(max(oi.comissao_percentual), 0) into v_pct from public.order_items oi where oi.order_id = p_order;

  return jsonb_build_object(
    'total_centavos', o.total_centavos, 'subtotal_centavos', o.subtotal_centavos, 'frete_centavos', o.frete_centavos,
    'descricao', 'Pedido ' || o.codigo,
    'comissao_percentual', v_pct, 'indicador', v_tipo,
    'produtor_provedor_id', v_produtor, 'indicador_provedor_id', v_indicador,
    -- taxa total, custo Lytex, repasse e tarifa mínima EM VIGOR (INTERNO: só o servidor, via service_role)
    'assume_taxa_afiliado', v_pol.assume_taxa_afiliado,
    'taxas', public.taxas_vigentes(),
    'politica', jsonb_build_object('parcelas_max', v_pol.parcelas_max, 'parcelas_sem_juros', v_pol.parcelas_sem_juros));
end; $$;
revoke execute on function public.dados_split_pedido(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_split_pedido(uuid, text) to service_role;

-- catálogo do afiliado: mostra quais lojas pagam a taxa (coluna nova no fim; troca o tipo de retorno)
drop function if exists public.catalogo_afiliados(text);
create or replace function public.catalogo_afiliados(p_ordem text default 'recentes')
returns table (id uuid, slug text, nome text, fotos text[], preco_centavos integer, comissao_percentual numeric,
               tipo text, categoria text, aprovacao_afiliacao text, produtor_nome text, loja_slug text,
               minha_afiliacao_status text, texto_divulgacao text, regras_divulgacao text, loja_paga_taxa boolean)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.fotos, i.preco_centavos, i.comissao_percentual, i.tipo, i.categoria,
         i.aprovacao_afiliacao, coalesce(p.loja_nome, p.razao_social), p.loja_slug, a.status,
         i.texto_divulgacao, i.regras_divulgacao, p.assume_taxa_afiliado
  from public.items i
  join public.producers p on p.id = i.producer_id
  left join public.afiliacoes a on a.item_id = i.id and a.afiliado_id = (select auth.uid())
  left join (
    select oi.item_id, sum(oi.quantidade) as qtd
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where p_ordem = 'vendidos' and o.status = 'pago' and o.pago_em > now() - interval '7 days'
      and oi.status_entrega not in ('cancelado', 'devolvido')
    group by oi.item_id
  ) v on v.item_id = i.id
  where i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado'
  order by coalesce(v.qtd, 0) desc, i.aprovado_em desc nulls last;
$$;
revoke execute on function public.catalogo_afiliados(text) from public, anon;
grant execute on function public.catalogo_afiliados(text) to authenticated;
