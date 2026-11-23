# Próximos passos (retomada)

Estado em 23/11/2026. Tudo publicado na `main`, exceto o que está "em andamento".

## Em andamento (commits WIP na branch claude/tender-goodall-40gh7c)
1. Notificações no app + e-mail (Resend) + página de configurações por papel. Migração `20261208000001_notificacoes.sql`, ainda não aplicada em produção.
2. LytexProvider real, só sandbox, seguindo `docs/lytex/openapi-v2-sandbox.json`. As credenciais de sandbox ficam só no `.env.local` (fora do git).

Ao retomar: rodar tsc, eslint, `npm run test:db`, `npm run test:unit`, build e os E2E do scratchpad. Depois aplicar a migração nova em produção e publicar.

## Fila
3. Correções de segurança (`docs/seguranca-auditoria.md`):
   - Altas: `simuladorAtivo()` exige flag explícita; webhook de pagamento confere valor e moeda.
   - Médias: limite em `recuperarLink`, suspensão aplicada no banco (RLS), validação de host em links externos.
4. Correções de qualidade (`docs/qualidade-auditoria.md`):
   - reservar estoque no `criar_pedido`;
   - cancelar a cobrança ao cancelar o pedido e estornar pagamento tardio;
   - `round`/`floor` no relatório da folha;
   - índices faltantes;
   - corte de 500 pedidos sem aviso;
   - código morto.
5. Integrações (`docs/integracoes.md`, fase MVP): webhooks de saída com HMAC, API pública por loja (nota fiscal), Melhor Envio, entrega digital por evento.
6. Avaliações só de compradores reais.
7. Relatório final ✅/❌, prints em 5 tamanhos de tela e Lighthouse.

## Depende do dono
- Vercel: `CRON_SECRET`, `STAYPSE_RECEBEDOR_ID` e as credenciais da Lytex (gerar novas, porque as atuais apareceram no chat).
- Dados da empresa: e-mail, WhatsApp, encarregado (DPO) e endereço.
- Chave do Resend.
- Apagar o bucket vazio `documentos-produtores` no Supabase.
- Revisão de advogado (`docs/conformidade-juridica.md`).
- Taxa da Staypse (hoje 5%, valor provisório).
