#!/usr/bin/env bash
# Testa a migração num Postgres local descartável (imitando o Supabase).
# Uso: bash supabase/tests/rodar.sh
# Requer: Postgres 15+ instalado (initdb/pg_ctl). Nada é enviado ao Supabase.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
PASTA="$(mktemp -d)"
PORTA=54329

# O Postgres não roda como root; se for root, usa o usuário "postgres".
EXEC=()
if [ "$(id -u)" = "0" ]; then
  chown postgres "$PASTA"
  EXEC=(runuser -u postgres --)
fi

parar() { "${EXEC[@]}" "$PGBIN/pg_ctl" -D "$PASTA/dados" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PASTA"; }
trap parar EXIT

"${EXEC[@]}" "$PGBIN/initdb" -D "$PASTA/dados" -U postgres --locale=C.UTF-8 >/dev/null
"${EXEC[@]}" "$PGBIN/pg_ctl" -D "$PASTA/dados" -o "-p $PORTA -k $PASTA -c listen_addresses=''" -l "$PASTA/log" -w start >/dev/null

PSQL=("${EXEC[@]}" "$PGBIN/psql" -h "$PASTA" -p "$PORTA" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

echo ">>> Preparando ambiente que imita o Supabase"
"${PSQL[@]}" -f "$RAIZ/supabase/tests/stub_supabase.sql"

for m in "$RAIZ"/supabase/migrations/*.sql; do
  echo ">>> Aplicando $(basename "$m")"
  "${PSQL[@]}" -f "$m"
done

echo ">>> Rodando testes"
"${PSQL[@]}" -f "$RAIZ/supabase/tests/rls_test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
