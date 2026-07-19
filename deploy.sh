#!/usr/bin/env bash
# Deploy do SIGF na Cloudflare (Workers + D1 + R2).
#
# Uso:
#   export CLOUDFLARE_API_TOKEN=seu_token_aqui
#   ./deploy.sh
#
# Rode este script no seu computador (nao funciona em ambientes sandbox
# sem acesso de saida para a Cloudflare). Ele e idempotente: pode rodar
# de novo sem duplicar banco/bucket.

set -euo pipefail
cd "$(dirname "$0")"

DB_NAME="sigf-db"
BUCKET_NAME="sigf-arquivos"
WRANGLER_CONFIG="wrangler.jsonc"
SEED_FILE="db/seed/2026-07-18-import-zanatta-vdh.sql"

step() { echo; echo "==> $1"; }

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Erro: defina CLOUDFLARE_API_TOKEN antes de rodar este script."
  echo "  export CLOUDFLARE_API_TOKEN=seu_token_aqui"
  exit 1
fi

step "Instalando dependencias"
npm install

step "Verificando/criando banco D1 '$DB_NAME'"
if npx wrangler d1 list --json 2>/dev/null | grep -q "\"name\": \"$DB_NAME\""; then
  echo "Banco '$DB_NAME' ja existe, pulando criacao."
else
  npx wrangler d1 create "$DB_NAME"
fi

DB_ID=$(npx wrangler d1 list --json 2>/dev/null | node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const db = data.find((d) => d.name === '$DB_NAME');
  if (!db) { process.exit(1); }
  console.log(db.uuid);
")

if [ -z "$DB_ID" ]; then
  echo "Erro: nao consegui encontrar o database_id de '$DB_NAME'. Rode 'npx wrangler d1 list' manualmente e cole o id em $WRANGLER_CONFIG."
  exit 1
fi

step "Configurando database_id em $WRANGLER_CONFIG"
node -e "
  const fs = require('fs');
  const path = '$WRANGLER_CONFIG';
  const dbId = '$DB_ID';
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes('REPLACE_WITH_D1_DATABASE_ID')) {
    content = content.replace('REPLACE_WITH_D1_DATABASE_ID', dbId);
    fs.writeFileSync(path, content);
    console.log('database_id configurado: ' + dbId);
  } else if (content.includes(dbId)) {
    console.log('database_id ja configurado: ' + dbId);
  } else {
    console.log('Aviso: nao encontrei o placeholder nem o id atual em $WRANGLER_CONFIG.');
    console.log('Edite manualmente o campo database_id para: ' + dbId);
  }
"

step "Verificando/criando bucket R2 '$BUCKET_NAME'"
if npx wrangler r2 bucket list --json 2>/dev/null | grep -q "\"name\": \"$BUCKET_NAME\""; then
  echo "Bucket '$BUCKET_NAME' ja existe, pulando criacao."
else
  npx wrangler r2 bucket create "$BUCKET_NAME"
fi

step "Aplicando migrations no banco remoto"
npx wrangler d1 migrations apply "$DB_NAME" --remote

if [ -f "$SEED_FILE" ]; then
  step "Importar a base real de veiculos agora? (78 registros, so na primeira vez)"
  read -r -p "Importar $SEED_FILE? [s/N] " IMPORT_ANSWER
  if [[ "$IMPORT_ANSWER" =~ ^[sS]$ ]]; then
    npx wrangler d1 execute "$DB_NAME" --remote --file="$SEED_FILE"
  else
    echo "Import pulado."
  fi
fi

step "Build + deploy"
npm run deploy

step "Pronto"
echo "Acesse a URL publicada acima + /setup para criar o primeiro administrador."
