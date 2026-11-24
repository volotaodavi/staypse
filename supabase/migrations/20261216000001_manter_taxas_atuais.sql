-- Decisão do dono (24/11/2026): manter a tabela atual, mais acessível, e cancelar o aumento
-- agendado com aviso prévio. Pedido mínimo de R$ 10 fica (protege a margem em vendas pequenas);
-- tarifa mínima por pedido sai.
update public.configuracoes set valor = v.valor
from (values
  ('taxa_total_pix',         '{"percentual": 1.5, "fixo_centavos": 200}'::jsonb),
  ('taxa_total_boleto',      '{"percentual": 1.5, "fixo_centavos": 230}'::jsonb),
  ('taxa_total_cartao_1x',   '{"percentual": 4.9, "fixo_centavos": 50}'::jsonb),
  ('taxa_total_cartao_2a6',  '{"percentual": 5.5, "fixo_centavos": 50}'::jsonb),
  ('taxa_total_cartao_7a12', '{"percentual": 6.1, "fixo_centavos": 50}'::jsonb),
  ('taxa_minima_centavos',   '0'::jsonb)
) as v(chave, valor)
where configuracoes.chave = v.chave;

-- sem mudança agendada: some o aviso "novas taxas a partir de"
delete from public.configuracoes where chave in ('taxas_vigencia_em', 'taxas_anteriores');
