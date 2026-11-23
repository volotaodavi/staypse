-- =========================================================================
-- Taxas por modalidade (docs/precificacao.md)
--  * taxa_total_<modalidade>: o que a LOJA paga (percentual + fixo em centavos); já embute o custo Lytex.
--  * custo_lytex_<modalidade> e custo_lytex_split: INTERNOS (contrato Lytex); só admin lê/edita.
--  * o comprador nunca paga nem vê taxa. A receita da Staypse = taxa total - custo Lytex estimado.
-- Padrões = valores recomendados; custo Lytex = contrato Tier 01 (taxa incentivo, vale até 17/04/2027).
-- =========================================================================

create or replace function public.configuracao_valida(p_chave text, p_valor jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select case
    when p_chave in ('taxa_staypse_percentual', 'comissao_min_percentual', 'comissao_max_percentual') then
      case when jsonb_typeof(p_valor) = 'number' then (p_valor #>> '{}')::numeric between 0 and 100 else false end
    -- e-mail do ÚNICO admin geral (preenchido só pelo servidor, a partir da variável ADMIN_EMAIL)
    when p_chave = 'admin_email' then
      case when jsonb_typeof(p_valor) = 'string' then
        (p_valor #>> '{}') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and (p_valor #>> '{}') = lower(p_valor #>> '{}')
      else false end
    when p_chave = 'prazo_nf_dias' then
      case when jsonb_typeof(p_valor) = 'number' then
        (p_valor #>> '{}')::numeric between 1 and 60 and (p_valor #>> '{}')::numeric = trunc((p_valor #>> '{}')::numeric)
      else false end
    when p_chave = 'palavras_proibidas' then
      case when jsonb_typeof(p_valor) = 'array' then
        jsonb_array_length(p_valor) <= 500
        and not exists (select 1 from jsonb_array_elements(p_valor) e
                        where jsonb_typeof(e) <> 'string' or char_length(trim(e #>> '{}')) not between 2 and 60)
      else false end
    when p_chave = 'meios_pagamento' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 3
        and jsonb_typeof(p_valor -> 'pix') = 'boolean'
        and jsonb_typeof(p_valor -> 'cartao') = 'boolean'
        and jsonb_typeof(p_valor -> 'boleto') = 'boolean'
      else false end
    -- taxa total (cobrada da loja) e custo Lytex por modalidade: percentual (até 2 casas) + fixo em centavos
    when p_chave ~ '^(taxa_total|custo_lytex)_(pix|boleto|cartao_1x|cartao_2a6|cartao_7a12)$' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 2
        and jsonb_typeof(p_valor -> 'percentual') = 'number' and jsonb_typeof(p_valor -> 'fixo_centavos') = 'number'
        and (p_valor ->> 'percentual')::numeric between 0 and 30
        and (p_valor ->> 'percentual')::numeric * 100 = trunc((p_valor ->> 'percentual')::numeric * 100)
        and (p_valor ->> 'fixo_centavos')::numeric between 0 and 2000
        and (p_valor ->> 'fixo_centavos')::numeric = trunc((p_valor ->> 'fixo_centavos')::numeric)
      else false end
    -- cobrança da Lytex por valor repassado: % com mínimo e máximo, em centavos
    when p_chave = 'custo_lytex_split' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 3
        and jsonb_typeof(p_valor -> 'percentual') = 'number'
        and jsonb_typeof(p_valor -> 'minimo_centavos') = 'number' and jsonb_typeof(p_valor -> 'maximo_centavos') = 'number'
        and (p_valor ->> 'percentual')::numeric between 0 and 10
        and (p_valor ->> 'percentual')::numeric * 100 = trunc((p_valor ->> 'percentual')::numeric * 100)
        and (p_valor ->> 'minimo_centavos')::numeric between 0 and 1000
        and (p_valor ->> 'minimo_centavos')::numeric = trunc((p_valor ->> 'minimo_centavos')::numeric)
        and (p_valor ->> 'maximo_centavos')::numeric between (p_valor ->> 'minimo_centavos')::numeric and 5000
        and (p_valor ->> 'maximo_centavos')::numeric = trunc((p_valor ->> 'maximo_centavos')::numeric)
      else false end
    else false end;
$$;


-- valores padrão (não sobrescreve o que o admin já ajustou)
insert into public.configuracoes (chave, valor) values
  ('taxa_total_pix',         '{"percentual": 1.5, "fixo_centavos": 200}'),
  ('taxa_total_boleto',      '{"percentual": 1.5, "fixo_centavos": 230}'),
  ('taxa_total_cartao_1x',   '{"percentual": 4.9, "fixo_centavos": 50}'),
  ('taxa_total_cartao_2a6',  '{"percentual": 5.5, "fixo_centavos": 50}'),
  ('taxa_total_cartao_7a12', '{"percentual": 6.1, "fixo_centavos": 50}'),
  ('custo_lytex_pix',         '{"percentual": 0, "fixo_centavos": 185}'),
  ('custo_lytex_boleto',      '{"percentual": 0, "fixo_centavos": 185}'),
  ('custo_lytex_cartao_1x',   '{"percentual": 3.39, "fixo_centavos": 0}'),
  ('custo_lytex_cartao_2a6',  '{"percentual": 3.89, "fixo_centavos": 0}'),
  ('custo_lytex_cartao_7a12', '{"percentual": 4.29, "fixo_centavos": 0}'),
  ('custo_lytex_split',       '{"percentual": 1, "minimo_centavos": 10, "maximo_centavos": 100}')
on conflict (chave) do nothing;

-- coerência: taxa total >= custo Lytex da mesma modalidade (percentual e fixo)
create or replace function public.configuracoes_taxas_coerentes()
returns void language plpgsql stable security definer set search_path = '' as $$
declare m text;
begin
  foreach m in array array['pix', 'boleto', 'cartao_1x', 'cartao_2a6', 'cartao_7a12'] loop
    if exists (
      select 1 from public.configuracoes t join public.configuracoes c on c.chave = 'custo_lytex_' || m
      where t.chave = 'taxa_total_' || m
        and ((t.valor ->> 'percentual')::numeric < (c.valor ->> 'percentual')::numeric
             or (t.valor ->> 'fixo_centavos')::numeric < (c.valor ->> 'fixo_centavos')::numeric)
    ) then raise exception 'taxa_total_menor_que_custo_lytex: %', m; end if;
  end loop;
end; $$;
revoke execute on function public.configuracoes_taxas_coerentes() from public, anon, authenticated;

create or replace function public.admin_salvar_configuracoes(p_valores jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_chave text;
  v_valor jsonb;
  v_antes jsonb;
  v_min numeric;
  v_max numeric;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if jsonb_typeof(p_valores) <> 'object' then raise exception 'configuracao_invalida'; end if;

  for v_chave, v_valor in select key, value from jsonb_each(p_valores) loop
    if not public.configuracao_valida(v_chave, v_valor) then
      raise exception 'configuracao_invalida: %', v_chave;
    end if;
  end loop;

  -- faixa coerente: mínimo não pode passar do máximo (usa o valor novo ou o já salvo)
  select coalesce(p_valores -> 'comissao_min_percentual', (select valor from public.configuracoes where chave = 'comissao_min_percentual')),
         coalesce(p_valores -> 'comissao_max_percentual', (select valor from public.configuracoes where chave = 'comissao_max_percentual'))
  into v_antes, v_valor;
  v_min := (v_antes #>> '{}')::numeric;
  v_max := (v_valor #>> '{}')::numeric;
  if v_min > v_max then raise exception 'comissao_min_maior_que_max'; end if;

  for v_chave, v_valor in select key, value from jsonb_each(p_valores) loop
    select valor into v_antes from public.configuracoes where chave = v_chave;
    if v_antes is not distinct from v_valor then continue; end if;

    insert into public.configuracoes (chave, valor, atualizado_por, atualizado_em)
    values (v_chave, v_valor, (select auth.uid()), now())
    on conflict (chave) do update
      set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = excluded.atualizado_em;

    -- a lista de palavras que marca itens para revisão é a tabela palavras_proibidas
    if v_chave = 'palavras_proibidas' then
      delete from public.palavras_proibidas
      where termo <> all (select lower(trim(t)) from jsonb_array_elements_text(v_valor) t);
      insert into public.palavras_proibidas (termo, categoria)
      select distinct lower(trim(t)), 'Definida no admin' from jsonb_array_elements_text(v_valor) t
      on conflict (termo) do nothing;
    end if;

    -- uma entrada no log por chave alterada (id estável por chave)
    perform public.registrar_auditoria('configuracao_alterada', 'configuracao', md5('configuracao:' || v_chave)::uuid,
      jsonb_build_object('chave', v_chave, 'antes', v_antes, 'depois', v_valor));
  end loop;

  -- a taxa total de cada modalidade nunca fica abaixo do custo Lytex dela (nem em percentual, nem no fixo)
  perform public.configuracoes_taxas_coerentes();
end;
$$;
revoke execute on function public.admin_salvar_configuracoes(jsonb) from public, anon;
grant execute on function public.admin_salvar_configuracoes(jsonb) to authenticated;

-- dados do split passam a trazer as taxas por modalidade (no lugar da taxa única)
create or replace function public.dados_split_pedido(p_order uuid, p_provedor text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o record; v_dono uuid; v_produtor text; v_indicador text; v_tipo text := 'nenhum'; v_papel text;
  v_forma text; v_pct numeric; v_taxas jsonb;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'pedido_inexistente'; end if;

  select p.user_id into v_dono from public.producers p where p.id = o.producer_id;
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
  -- taxa total, custo Lytex e custo de repasse por modalidade (INTERNO: só o servidor, via service_role)
  select coalesce(jsonb_object_agg(c.chave, c.valor), '{}'::jsonb) into v_taxas from public.configuracoes c
  where left(c.chave, 11) = 'taxa_total_' or left(c.chave, 12) = 'custo_lytex_';

  return jsonb_build_object(
    'total_centavos', o.total_centavos, 'subtotal_centavos', o.subtotal_centavos, 'frete_centavos', o.frete_centavos,
    'descricao', 'Pedido ' || o.codigo,
    'comissao_percentual', v_pct, 'indicador', v_tipo,
    'produtor_provedor_id', v_produtor, 'indicador_provedor_id', v_indicador,
    'taxas', v_taxas);
end; $$;
revoke execute on function public.dados_split_pedido(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_split_pedido(uuid, text) to service_role;

-- financeiro do admin: taxa total, custo Lytex (estimado) e receita por pedido
create or replace function public.admin_fin_resumo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  select jsonb_build_object(
    'pedidos', count(*) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')),
    'gmv_centavos', coalesce(sum(o.total_centavos) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'staypse_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'staypseCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'taxa_total_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'taxaTotalCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'taxa_meio_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'custoLytexCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'taxa_meio_informada_pedidos', count(*) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and (o.split_snapshot ->> 'taxaMeioInformada') = 'true'),
    'comissao_afiliados_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'comissaoDevidaCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and o.revendedor_id is not null and o.vendedor_id is null), 0),
    'comissao_vendedores_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'comissaoDevidaCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and o.vendedor_id is not null), 0),
    'liquido_lojas_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'produtorCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'sem_split', count(*) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and o.split_snapshot is null),
    'reembolsos_qtd', count(*) filter (where o.status = 'reembolsado' and o.reembolsado_em >= p_inicio and o.reembolsado_em < p_fim),
    'reembolsos_centavos', coalesce(sum(o.total_centavos) filter (where o.status = 'reembolsado' and o.reembolsado_em >= p_inicio and o.reembolsado_em < p_fim), 0),
    'chargebacks_qtd', count(*) filter (where o.status = 'chargeback' and o.chargeback_em >= p_inicio and o.chargeback_em < p_fim),
    'chargebacks_centavos', coalesce(sum(o.total_centavos) filter (where o.status = 'chargeback' and o.chargeback_em >= p_inicio and o.chargeback_em < p_fim), 0)
  ) into r
  from public.orders o
  where (o.pago_em >= p_inicio and o.pago_em < p_fim)
     or (o.reembolsado_em >= p_inicio and o.reembolsado_em < p_fim)
     or (o.chargeback_em >= p_inicio and o.chargeback_em < p_fim);
  return r;
end; $$;
revoke execute on function public.admin_fin_resumo(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_fin_resumo(timestamptz, timestamptz) to authenticated;

-- taxa total, custo Lytex e receita Staypse por modalidade (só admin)
create or replace function public.admin_fin_por_modalidade(p_inicio timestamptz, p_fim timestamptz)
returns table (modalidade text, pedidos bigint, gmv_centavos bigint, taxa_total_centavos bigint,
               custo_lytex_centavos bigint, receita_staypse_centavos bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return query
  select coalesce(o.split_snapshot -> 'taxas' ->> 'modalidade', 'sem_modalidade'), count(*),
         sum(o.total_centavos)::bigint,
         sum(coalesce((o.split_snapshot -> 'taxas' ->> 'taxa_total_centavos')::bigint, 0))::bigint,
         sum(coalesce((o.split_snapshot -> 'taxas' ->> 'custo_lytex_centavos')::bigint, 0))::bigint,
         sum(public.fin_snapshot_valor(o.split_snapshot, 'staypseCentavos'))::bigint
  from public.orders o
  where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')
  group by 1 order by 1;
end; $$;
revoke execute on function public.admin_fin_por_modalidade(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_fin_por_modalidade(timestamptz, timestamptz) to authenticated;
