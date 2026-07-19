# SIGF - Sistema Integrado de Gestao de Frota

Cadastro de veiculos/equipamentos/particulares com acesso multiusuario
(login + permissoes), rodando em Next.js + Cloudflare (Pages/Workers, D1 e
R2).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Cloudflare Workers via `@opennextjs/cloudflare`
- Banco: Cloudflare D1 (binding `DB`)
- Arquivos: Cloudflare R2 (binding `BUCKET`, ainda sem uso nesta etapa)
- Autenticacao propria: sessao por cookie httpOnly, senha com PBKDF2-SHA256
  (100k iteracoes), bloqueio apos 5 tentativas erradas

## Rodando localmente

```bash
npm install
npm run db:migrate:local   # cria/atualiza o banco D1 local
npm run dev                # http://localhost:3000
```

O `next.config.ts` chama `initOpenNextCloudflareForDev()`, entao os bindings
(`DB`, `BUCKET`) ficam disponiveis mesmo em `next dev`, sem precisar do
`wrangler dev`.

## Deploy automatico (GitHub Actions)

A partir da primeira configuracao (abaixo), todo `git push` para a branch
`claude/teste-campn8` builda e publica sozinho — sem terminal, sem risco do
bug de build no Windows, ja que roda em runner Linux do GitHub.

**Configuracao unica:**

1. No GitHub, va em `Settings > Secrets and variables > Actions` do
   repositorio.
2. Clique em **New repository secret**.
3. Nome: `CLOUDFLARE_API_TOKEN`. Valor: seu API Token da Cloudflare (o mesmo
   usado nos passos manuais abaixo, com permissao de Workers, D1 e R2).
4. Salve.

Pronto — o workflow em `.github/workflows/deploy.yml` cuida do resto
automaticamente a cada push. Para forcar um deploy sem push novo, va na aba
**Actions** do repositorio, escolha "Deploy SIGF na Cloudflare" e clique em
**Run workflow**.

## Aplicar dados de seed (importacoes) no banco de producao

O GitHub Actions so aplica **migrations de schema** automaticamente — arquivos
de dados (`db/seed/*.sql`) precisam ser aplicados manualmente uma vez, pois
representam importacoes pontuais, nao mudancas de estrutura. Depois que o
schema estiver publicado (deploy automatico ja rodou), execute:

```bash
export CLOUDFLARE_API_TOKEN=seu_token_aqui
npx wrangler d1 execute sigf-db --remote --file=db/seed/2026-07-19-veiculos-descontinuados.sql
npx wrangler d1 execute sigf-db --remote --file=db/seed/2026-07-19-import-manutencao-historico.sql
```

O primeiro cadastra 4 veiculos que ja sairam da frota (vendidos/baixados) mas
tem historico de manutencao real. O segundo importa 528 ordens de servico do
historico real da planilha `Frota_ZANATTA_VDH`, com IDs a partir de 100001
(nunca colidem com OS criadas manualmente pelo sistema, que comecam do 1).
Ambos sao seguros de rodar apenas uma vez — rodar de novo duplicaria os
registros, pois nao ha checagem de idempotencia nesses arquivos de dados
(diferente das migrations de schema).

## Deploy manual (primeira vez / sem GitHub Actions)

### Caminho rapido: script unico

Se voce ja tem um [API Token](https://dash.cloudflare.com/profile/api-tokens)
com permissao de Workers, D1 e R2, o script abaixo faz tudo (cria D1, cria
R2, aplica migrations, pergunta se quer importar a frota real, builda e
publica):

```bash
export CLOUDFLARE_API_TOKEN=seu_token_aqui
./deploy.sh
```

E idempotente — pode rodar de novo sem duplicar banco ou bucket. Depois que
terminar, acesse a URL publicada + `/setup` (passo 6 abaixo).

### Passo a passo manual

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

4. Aplicar as migrations no banco remoto (cria as tabelas de veiculos e de
   usuarios/sessoes):

   ```bash
   npm run db:migrate:remote
   ```

4.1. (Opcional) Importar a base real de veiculos a partir de uma planilha
   exportada do SIGF (mesmo formato de `db/seed/2026-07-18-import-zanatta-vdh.sql`):

   ```bash
   python3 scripts/import-vehicles-xlsx.py caminho/para/planilha.xlsx > db/seed/import.sql
   npx wrangler d1 execute sigf-db --remote --file=db/seed/import.sql
   ```

5. Deploy:

   ```bash
   npm run deploy
   ```

   Isso builda com o OpenNext adapter e publica o Worker (`sigf-gestao-frota`
   em `wrangler.jsonc`). A URL fica disponivel no output do comando, ou em
   `*.workers.dev` / dominio customizado configurado no painel Cloudflare.

6. **Criar o primeiro administrador.** Abra a URL publicada e va em
   `/setup` (ex: `https://sigf-gestao-frota.SEU-SUBDOMINIO.workers.dev/setup`).
   Essa tela so funciona uma vez — enquanto nao existir nenhum usuario
   cadastrado. Depois de criar o admin, ela passa a mostrar "sistema ja
   configurado" e redireciona para `/login`.

   A partir dai, esse admin entra em `/admin/usuarios` para cadastrar as
   demais pessoas que vao usar o sistema, escolhendo o papel de cada uma:

   - **Administrador** — cadastra, edita e exclui veiculos, e gerencia
     outros usuarios.
   - **Visualizador** — so consulta a frota, sem editar nada.

   Nao e possivel remover o proprio acesso de administrador nem ficar sem
   nenhum admin ativo no sistema — a API bloqueia essas duas situacoes.

## Deploys seguintes

Depois do setup inicial, qualquer mudanca:

```bash
npm run db:migrate:remote   # se houve mudanca de schema
npm run deploy
```

### Atencao ao rodar `npm run deploy` no Windows

O build do OpenNext (`opennextjs-cloudflare build`, chamado por `npm run deploy`)
tem um bug conhecido quando roda no Windows nativo (cmd, PowerShell ou Git
Bash sem WSL): paginas ficam com erro `TypeError:
components.ComponentMod.handler is not a function` em producao, mesmo com o
build "terminando sem erro" no terminal.

Duas opcoes:

- **Preferida:** rode `npm run deploy` de dentro do **WSL** (Windows
  Subsystem for Linux), nao no cmd/PowerShell/Git Bash direto.
- **Alternativa:** builde em qualquer ambiente Linux/Mac (`npx
  opennextjs-cloudflare build`), copie a pasta `.open-next` gerada para o
  Windows substituindo a existente, e rode so `npx wrangler deploy` (sem
  rebuildar) no Windows.

## Estrutura

- `app/veiculos` — UI de cadastro (lista, criar, editar, excluir, filtro,
  busca), visivel para qualquer usuario logado; edicao restrita a admin.
- `app/admin/usuarios` — gestao de usuarios e permissoes (somente admin).
- `app/login`, `app/setup` — autenticacao e configuracao inicial.
- `app/api/vehicles` — API REST do cadastro (GET p/ qualquer logado,
  escrita restrita a admin).
- `app/api/auth`, `app/api/users` — login/logout/setup e gestao de usuarios.
- `lib/vehicles.ts` — tipos e validacao do cadastro.
- `lib/auth.ts` — hashing de senha, sessao, helpers de autorizacao.
- `db/migrations` — migrations do D1 (numeradas, aplicadas via
  `wrangler d1 migrations apply`).

## Proximos modulos (roadmap)

Ver documentacao completa de analise do sistema para o roteiro de evolucao
(movimentacao por QR Code, manutencao/OS, abastecimento, multas,
indicadores FIPE). Este cadastro de veiculos com login e permissoes e a
base sobre a qual os demais modulos serao plugados.
