-- =========================================================================
-- Frete: o produtor escolhe quem paga + afiliado/vendedor vê o básico da venda
-- =========================================================================
-- 1. producers.frete_quem_paga: 'comprador' (padrão: frete fixo, grátis acima de X
--    opcional) ou 'loja' (a loja assume o frete: o comprador paga 0 em qualquer valor).
--    Lojas existentes ficam 'comprador': comportamento inalterado.
-- 2. minhas_comissoes passa a devolver o NOME do comprador e o VALOR PAGO do pedido.
--    Nada além disso (sem e-mail, telefone, CPF, endereço ou código de acesso).

alter table public.producers
  add column frete_quem_paga text not null default 'comprador'
    check (frete_quem_paga in ('comprador', 'loja'));

-- -------------------------------------------------------------------------
-- 1. salvar_frete: ganha p_quem_paga (validado aqui, no servidor)
-- -------------------------------------------------------------------------
drop function public.salvar_frete(integer, integer, integer);
create or replace function public.salvar_frete(p_fixo integer, p_gratis_acima integer, p_prazo integer,
                                               p_quem_paga text default 'comprador')
returns void language plpgsql security definer set search_path = '' as $$
declare v_fixo integer := p_fixo; v_gratis integer := p_gratis_acima; v_quem text := coalesce(p_quem_paga, 'comprador');
begin
  if v_quem not in ('comprador', 'loja') then raise exception 'quem_paga_invalido'; end if;
  if v_fixo is null then
    -- sem envio: não há frete para dividir
    v_gratis := null; v_quem := 'comprador';
  elsif v_quem = 'loja' then
    -- a loja assume: o comprador nunca paga frete (valor fixo 0, sem "grátis acima de")
    v_fixo := 0; v_gratis := null;
  end if;
  update public.producers
  set frete_fixo_centavos = v_fixo, frete_gratis_acima_centavos = v_gratis, frete_prazo_dias = p_prazo,
      frete_quem_paga = v_quem
  where user_id = (select auth.uid()) and status_verificacao <> 'suspenso';
  if not found then raise exception 'loja_indisponivel'; end if;
end; $$;
revoke execute on function public.salvar_frete(integer, integer, integer, text) from public, anon;
grant execute on function public.salvar_frete(integer, integer, integer, text) to authenticated;

-- -------------------------------------------------------------------------
-- 2. cotar_pedido: frete 0 quando a loja assume (criar_pedido usa esta cotação)
-- -------------------------------------------------------------------------
create or replace function public.cotar_pedido(p_item uuid, p_quantidade integer, p_modo text)
returns table (item_id uuid, nome text, tipo text, preco_unitario_centavos integer, quantidade integer,
               subtotal_centavos integer, frete_centavos integer, total_centavos integer,
               prazo_postagem_dias integer, prazo_entrega_dias integer, producer_id uuid,
               loja_slug text, loja_nome text, razao_social text, cnpj text)
language plpgsql stable security definer set search_path = '' as $$
declare i record; v_sub integer; v_frete integer := 0;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 99 then raise exception 'quantidade_invalida'; end if;
  select it.id, it.nome, it.tipo, it.preco_centavos, it.estoque, it.retirada_local, it.prazo_postagem_dias,
         p.id as pid, p.loja_slug, coalesce(p.loja_nome, p.razao_social) as loja_nome, p.razao_social, p.cnpj,
         p.frete_fixo_centavos, p.frete_gratis_acima_centavos, p.frete_prazo_dias, p.frete_quem_paga
  into i
  from public.items it join public.producers p on p.id = it.producer_id
  where it.id = p_item and it.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if i.id is null then raise exception 'item_indisponivel'; end if;

  if i.tipo = 'fisico' and i.estoque is not null and i.estoque < p_quantidade then raise exception 'sem_estoque'; end if;
  v_sub := i.preco_centavos * p_quantidade;

  if i.tipo = 'digital' then
    if p_modo <> 'digital' then raise exception 'entrega_invalida'; end if;
  elsif p_modo = 'retirada' then
    if not i.retirada_local then raise exception 'entrega_invalida'; end if;
  elsif p_modo = 'envio' then
    if i.frete_fixo_centavos is null then raise exception 'frete_nao_configurado'; end if;
    v_frete := case when i.frete_quem_paga = 'loja' then 0   -- a loja assume o frete
                    when i.frete_gratis_acima_centavos is not null and v_sub >= i.frete_gratis_acima_centavos then 0
                    else i.frete_fixo_centavos end;
  else
    raise exception 'entrega_invalida';
  end if;

  return query select i.id, i.nome, i.tipo, i.preco_centavos, p_quantidade, v_sub, v_frete, v_sub + v_frete,
                      i.prazo_postagem_dias, case when p_modo = 'envio' then i.frete_prazo_dias end,
                      i.pid, i.loja_slug, i.loja_nome, i.razao_social, i.cnpj;
end; $$;
revoke execute on function public.cotar_pedido(uuid, integer, text) from public;
grant execute on function public.cotar_pedido(uuid, integer, text) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 3. entregas_do_item: devolve quem paga; com 'loja' o frete aparece como 0 e sem "grátis acima"
-- -------------------------------------------------------------------------
drop function public.entregas_do_item(uuid);
create or replace function public.entregas_do_item(p_item uuid)
returns table (envio boolean, retirada boolean, digital boolean, frete_fixo_centavos integer,
               frete_gratis_acima_centavos integer, frete_prazo_dias integer, frete_quem_paga text)
language sql stable security definer set search_path = '' as $$
  select it.tipo = 'fisico' and p.frete_fixo_centavos is not null,
         it.tipo = 'fisico' and it.retirada_local,
         it.tipo = 'digital',
         case when p.frete_quem_paga = 'loja' and p.frete_fixo_centavos is not null then 0 else p.frete_fixo_centavos end,
         case when p.frete_quem_paga = 'loja' then null else p.frete_gratis_acima_centavos end,
         p.frete_prazo_dias, p.frete_quem_paga
  from public.items it join public.producers p on p.id = it.producer_id
  where it.id = p_item and it.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.entregas_do_item(uuid) from public;
grant execute on function public.entregas_do_item(uuid) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 4. "Minhas vendas" do afiliado/vendedor: o BÁSICO do comprador (nome e valor pago)
--    O afiliado/vendedor continua SEM acesso a orders (RLS); esta função SECURITY DEFINER
--    é a única via e devolve só estes dois campos do comprador. Nunca e-mail, telefone,
--    CPF, endereço ou código de acesso. Valor pago = total do pedido (com frete), só
--    depois que o pagamento foi confirmado.
-- -------------------------------------------------------------------------
drop function public.minhas_comissoes(text, timestamptz, timestamptz);
create or replace function public.minhas_comissoes(p_papel text, p_inicio timestamptz, p_fim timestamptz)
returns table (pedido_id uuid, data timestamptz, produto text, quantidade integer, loja text,
               valor_centavos bigint, comissao_centavos bigint, status_pedido text, situacao text,
               previsao timestamptz, origem_atribuicao text,
               comprador_nome text, valor_pago_centavos bigint)
language sql stable security definer set search_path = '' as $$
  select o.id, o.criado_em, oi.nome_item, oi.quantidade, coalesce(p.loja_nome, p.razao_social),
         (oi.quantidade * oi.preco_unitario_centavos)::bigint,
         floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)::bigint,
         o.status, public.situacao_comissao(o.status, o.arrependimento_ate),
         case when o.status = 'pago' then o.arrependimento_ate end,
         o.atribuicao_origem,
         o.comprador_nome,
         case when o.status in ('pago', 'em_reembolso', 'reembolsado', 'chargeback') then o.total_centavos::bigint end
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.producers p on p.id = o.producer_id
  where o.revendedor_id = (select auth.uid())
    and ((p_papel = 'vendedor' and o.vendedor_id is not null) or (p_papel = 'afiliado' and o.vendedor_id is null))
    and o.criado_em >= p_inicio and o.criado_em < p_fim
  order by o.criado_em desc;
$$;
revoke execute on function public.minhas_comissoes(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.minhas_comissoes(text, timestamptz, timestamptz) to authenticated;
