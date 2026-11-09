# Como ligar os formulários ao Supabase (uns 10 minutos)

## 1. Criar o projeto
1. Entre em supabase.com e crie uma conta (pode ser com o GitHub).
2. Clique em **New project**. Nome: `staypse`. Região: **South America (São Paulo)**.
3. Crie uma senha forte para o banco e guarde num lugar seguro. Ela não vai no site.
4. Espere o projeto terminar de ser criado (1 a 2 minutos).

## 2. Criar as tabelas
1. No menu lateral, abra **SQL Editor** → **New query**.
2. Copie todo o conteúdo de `supabase/schema.sql`, cole e clique em **Run**.
3. Em **Table Editor** devem aparecer as tabelas `afiliados` e `fabricas`.

## 3. Pegar as chaves
1. Vá em **Project Settings** → **API**.
2. Copie:
   - **Project URL** (ex.: `https://abcdefgh.supabase.co`)
   - **anon public key** (um texto longo que começa com `eyJ`)
3. **Não use** a chave `service_role`. Ela dá acesso total ao banco e nunca pode ir para o site.

## 4. Colar no site
Abra `js/config.js` e preencha:

```js
window.STAYPSE_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'eyJ...'
};
```

Ou mande essas duas informações para o Claude colar.

## 5. Testar
1. Abra a página, preencha o formulário de afiliado e envie.
2. No Supabase, em **Table Editor** → `afiliados`, a linha deve aparecer.
3. Repita com o formulário de fábrica.

## Por que é seguro deixar a chave anon no site
As regras em `supabase/schema.sql` só permitem **cadastrar**. Quem tiver a chave não consegue ler, editar nem apagar nenhum cadastro. Só você vê os dados, logado no painel.

## Como ver e exportar a lista
**Table Editor** → escolha a tabela → **Export** → **CSV**. O arquivo abre no Excel ou no Google Planilhas.
