#!/usr/bin/env bash
# WebLead AI — Conteos de filas por tabla (Fase F, Bloque 3).
#
# Uso:
#   scripts/count-rows.sh [bd]        # por defecto: weblead_dev
#
# Imprime "tabla: N" para cada tabla del schema public, ordenadas por
# nombre. Sirve para comparar el origen con una BD restaurada:
#   scripts/count-rows.sh weblead_dev > /tmp/origen.txt
#   scripts/count-rows.sh weblead_restore_test > /tmp/restaurada.txt
#   diff /tmp/origen.txt /tmp/restaurada.txt
#
# La contraseña nunca se muestra: viaja solo en memoria en DATABASE_URL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB="${1:-weblead_dev}"

if [ -z "${DATABASE_URL:-}" ]; then
  ENV_FILE="$REPO_ROOT/.env"
  if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: DATABASE_URL no definida y no existe $ENV_FILE" >&2
    exit 1
  fi
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL vacía en $ENV_FILE" >&2
    exit 1
  fi
fi

DB_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#/[^/?]*(\?|$)#/${DB}\1#")"

psql "$DB_URL" -t -A -v ON_ERROR_STOP=1 \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;" \
| while IFS= read -r table; do
    [ -n "$table" ] || continue
    n="$(psql "$DB_URL" -t -A -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM \"${table}\";")"
    echo "${table}: ${n}"
  done
