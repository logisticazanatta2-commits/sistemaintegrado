# SIGF - Sistema Integrado de Gestao de Frota

Base do sistema: cadastro de veiculos/equipamentos/particulares, rodando em
Next.js + Cloudflare (Pages/Workers, D1 e R2).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Cloudflare Workers via `@opennextjs/cloudflare`
- Banco: Cloudflare D1 (binding `DB`)
- Arquivos: Cloudflare R2 (binding `BUCKET`, ainda sem uso nesta etapa)

## Rodando localmente

```bash
npm install
npm run db:migrate:local   # cria/atualiza o banco D1 local
npm run dev                # http://localhost:3000
```

O `next.config.ts` chama `initOpenNextCloudflareForDev()`, entao os bindings
(`DB`, `BUCKET`) ficam disponiveis mesmo em `next dev`, sem precisar do
`wrangler dev`.

## Deploy no Cloudflare (primeira vez)

1. Login na Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Criar o banco D1 real:

   ```bash
   npx wrangler d1 create sigf-db
   ```

   Copie o `database_id` retornado e cole em `wrangler.jsonc`, no lugar de
   `REPLACE_WITH_D1_DATABASE_ID`.

3. Criar o bucket R2:

   ```bash
   npx wrangler r2 bucket create sigf-arquivos
   ```

4. Aplicar as migrations no banco remoto:

   ```bash
   npm run db:migrate:remote
   ```

5. Deploy:

   ```bash
   npm run deploy
   ```

   Isso builda com o OpenNext adapter e publica o Worker (`sigf-gestao-frota`
   em `wrangler.jsonc`). A URL fica disponivel no output do comando, ou em
   `*.workers.dev` / dominio customizado configurado no painel Cloudflare.

## Deploys seguintes

Depois do setup inicial, qualquer mudanca:

```bash
npm run db:migrate:remote   # se houve mudanca de schema
npm run deploy
```

## Estrutura

- `app/veiculos` — UI de cadastro (lista, criar, editar, excluir, filtro,
  busca).
- `app/api/vehicles` — API REST do cadastro.
- `lib/vehicles.ts` — tipos e validacao compartilhados entre API e UI.
- `db/migrations` — migrations do D1 (numeradas, aplicadas via
  `wrangler d1 migrations apply`).

## Proximos modulos (roadmap)

Ver documentacao completa de analise do sistema para o roteiro de evolucao
(movimentacao por QR Code, manutencao/OS, abastecimento, multas,
indicadores FIPE). Este cadastro de veiculos e a base sobre a qual os
demais modulos serao plugados.
