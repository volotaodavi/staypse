# Supabase: como ligar e como consultar (uns 10 minutos)

## 1. Criar o projeto
1. Entre em supabase.com e crie uma conta (pode ser com o GitHub).
2. **New project**. Nome: `staypse`. Região: **South America (São Paulo)**.
3. Crie uma senha forte para o banco e guarde num lugar seguro. Ela não vai no site.

## 2. Criar as tabelas
1. Menu lateral → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.

## 3. Pegar as chaves
**Project Settings** → **API**. Copie:
- **Project URL** (ex.: `https://abcdefgh.supabase.co`)
- **anon public key** (texto longo que começa com `eyJ`)

**Não use** a chave `service_role`: ela dá acesso total e nunca pode ir para o site.

## 4. Colar no site
Preencha `js/config.js`, ou mande as duas informações para o Claude colar.

## 5. Testar
Abra a página, faça um cadastro de cada tipo e veja se aparecem nas listas abaixo.

---

## Onde consultar (Table Editor)

### Cadastros
| Tabela | O que mostra |
|---|---|
| `lista_afiliados` | afiliados, do mais novo para o mais antigo |
| `lista_fornecedores` | fábricas e lojas |
| `lista_entregadores` | entregadores |
| `cadastros` | tudo junto, com todas as colunas (dados brutos) |

Para baixar: abra a tabela → **Export** → **CSV**. Abre no Excel ou no Google Planilhas.

### Medição
| Tabela | O que mostra |
|---|---|
| `metricas_resumo` | uma linha com tudo: visitas, visitantes, cadastros por tipo, cliques no link de entregador e as taxas |
| `metricas_cliques` | cliques em cada botão |
| `metricas_por_dia` | visitas e cadastros por dia |
| `metricas_por_origem` | visitas e cadastros por origem (UTM) |
| `metricas_canais` | onde os afiliados vendem |

**Para decidir a entrega local (Fase 3):** em `metricas_resumo`, olhe `visitantes_clicaram_entregador`, `interesse_entregador_pct` e `cadastros_entregadores`. Em `lista_entregadores`, veja de quais cidades e bairros eles vêm.

### Nomes dos botões em `metricas_cliques`
| Nome | Botão |
|---|---|
| `topo_entrar_lista` | Topo → Entrar na lista |
| `topo_fornecedor` | Topo → Tenho uma fábrica ou loja |
| `como_funciona_entrar_lista` | Como funciona → Entrar na lista |
| `duas_partes_cadastrar_fornecedor` | Uma venda. Duas partes. → Cadastrar minha fábrica ou loja |
| `agora_escolher_produtos` | Por que entrar agora → Quero escolher os produtos |
| `faq_cadastrar_fornecedor` | Perguntas → link "cadastro" |
| `aba_afiliado` / `aba_fornecedor` | Abas do formulário |
| `enviar_afiliado` / `enviar_fornecedor` / `enviar_entregador` | Botão de enviar (conta tentativas, inclusive com erro) |
| `rodape_instagram` / `rodape_privacidade` / `rodape_entregador` | Links do rodapé |

## Como usar UTM nos links
Coloque no fim do link que você divulga:
`?utm_source=instagram&utm_medium=bio&utm_campaign=lista_espera`

A origem fica guardada durante a visita toda e vai junto com o cadastro.
Para mandar fábricas direto para a aba delas, termine o link com `#fornecedor`.

## Por que é seguro deixar a chave anon no site
As regras do `schema.sql` deixam a página só **gravar**. Com essa chave, ninguém consegue ler, editar nem apagar cadastros, nem abrir as listas e métricas. Só você vê os dados, logado no painel.
