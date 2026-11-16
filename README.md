# Staypse

Plataforma brasileira de afiliados para produtos físicos e digitais.
Produtores cadastram produtos e definem a comissão; revendedores indicam pela
própria vitrine (`staypse.com.br/nome`); no pagamento, a Lytex faz o split
automático entre produtor, revendedor e Staypse.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 · Supabase
(São Paulo) · Lytex (pagamentos, a partir da Etapa 6) · Vercel.

---

## Estrutura

```
src/
  config/empresa.ts       ← dados do rodapé (nome, CNPJ, endereço, contatos) e versão dos termos
  proxy.ts                ← renova a sessão e protege /painel e /admin
  lib/papeis.ts           ← quem está logado, papéis e para onde cada um vai
  lib/supabase/           ← conexão com o Supabase
  components/             ← Logo, Cabeçalho, Rodapé, peças de formulário
  app/
    page.tsx              ← página inicial (provisória)
    entrar/  cadastro/    ← login (senha ou link mágico) e cadastro
    auth/confirmar/       ← destino dos links enviados por e-mail
    sair/                 ← logout (POST)
    painel/               ← /painel (distribui), /painel/produtor, /painel/revendedor
    admin/                ← painel do admin
    termos/ privacidade/  ← textos legais (provisórios) + canal LGPD
supabase/
  migrations/             ← banco: tabelas, RLS, permissões, buckets
  tests/                  ← testes das regras do banco
  config.toml             ← Supabase local (desenvolvimento)
public/brand/             ← SVGs OFICIAIS da logo (nunca redesenhar)
legado/                   ← site antigo, só para consulta
```

## Regras de conformidade e onde estão no código

| Regra | Onde |
|---|---|
| 1. Staypse nunca guarda dinheiro | `payment_refs` só guarda referências (id da cobrança, status, % do split). Nenhuma coluna de saldo/carteira/repasse — há teste que garante isso. |
| 2. Produtor com CNPJ ativo + documento; nota fiscal por venda | Constraint `producers_aprovacao_exige_cnpj_e_documento`; `order_items_entrega_exige_nota` impede marcar envio sem NF. |
| 3. Rodapé legal | `src/components/Rodape.tsx` lendo `src/config/empresa.ts`, presente no layout raiz. |
| 4. Resumo antes de pagar | `orders.resumo_aceito_em` obrigatório (tela vem na etapa de checkout). |
| 5. Arrependimento de 7 dias | `orders.arrependimento_ate` (lógica vem na etapa de pedidos). |
| 6. Revendedor ganha só sobre as próprias vendas | Comissão só via `orders.revendedor_id`; não existe tabela de indicação nem taxa de adesão. |
| 7. Aceite com data e versão; canal LGPD | `terms_acceptances` (imutável, data do servidor); `/privacidade#canal-lgpd`. |

---

## Rodar no seu computador

Requisitos: Node 20+ e Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe Supabase local e aplica as migrações
cp .env.example .env.local  # preencha com a URL e a "Publishable key" que o comando acima mostrou
npm run dev                 # abre em http://localhost:3000
```

E-mails de teste (confirmação e link mágico) chegam em http://127.0.0.1:54324.

### Testes

```bash
bash supabase/tests/rodar.sh   # 78 testes das regras do banco (RLS, permissões, conformidade)
npm run build                  # checa tipos e compila
```

---

## Subir no Supabase de verdade (projeto "staypse", São Paulo)

1. **Criar o projeto:** supabase.com → New project → nome `staypse`,
   região **South America (São Paulo)**. Guarde a senha do banco.
2. **Criar o banco:** SQL Editor → cole o arquivo
   `supabase/migrations/20261116000001_fundacao.sql` → Run.
   (ou: `npx supabase link --project-ref SEU_ID && npx supabase db push`)
3. **Autenticação** (Authentication → URL Configuration):
   - Site URL: `https://staypse.com.br` (enquanto não tiver domínio, a URL da Vercel)
   - Redirect URLs: `https://staypse.com.br/**`, `http://localhost:3000/**`
   - Em Authentication → Providers → Email: deixe **Confirm email** ligado e
     senha mínima de **8** caracteres.
4. **Variáveis:** Project Settings → API → copie a URL e a *Publishable key* para
   o `.env.local` (e depois para a Vercel).
5. **Tornar-se admin:** crie sua conta pelo site e rode no SQL Editor:
   ```sql
   insert into public.user_roles (user_id, papel)
   select id, 'admin' from auth.users where email = 'SEU-EMAIL';
   ```
6. **(Recomendado) E-mails em português:** Authentication → Email Templates.
   Para o link funcionar mesmo se aberto em outro navegador/celular, use no
   botão dos templates *Confirm signup* e *Magic Link*:
   `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email&proximo=/painel`
7. **SMTP próprio:** o e-mail padrão do Supabase tem limite baixo de envios por
   hora. Antes de abrir para o público, configure um SMTP (Authentication → SMTP).
