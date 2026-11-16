#!/usr/bin/env bash
# WebLead AI — Restauración de un dump de PostgreSQL (Fase F, Bloque 3).
#
# Restaura un dump -Fc (creado por scripts/backup-postgres.sh) en una BD
# SCRATCH que se crea al efecto. NUNCA toca weblead_dev salvo confirmación
# explícita del coordinador (ver guarda abajo).
#
# Uso:
#   scripts/restore-postgres.sh <dump.dump> [bd-destino]
#   scripts/restore-postgres.sh <dump.dump> --keep   # no borra la BD scratch
#
#   bd-destino por defecto: weblead_restore_test
#   --keep: conserva la BD destino tras restaurar (por defecto se borra
#           al final solo si es la scratch por defecto; ver notas).
#
# Guarda de seguridad:
#   Si bd-destino es weblead_dev (la BD de desarrollo), el script se niega
#   salvo que se pase --force Y esté definida la variable de entorno
#   ALLOW_OVERWRITE_WEBLEAD_DEV=1. Es una doble barrera deliberada: un
#   restore sobre dev solo lo hace el coordinador, a mano, con el dump
#   correcto y la API parada.
#
# La contraseña nunca se escribe en logs ni en la salida: viaja solo en
# memoria dentro de DATABASE_URL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DEV_DB="weblead_dev"
SCRATCH_DB="weblead_restore_test"

usage() {
  echo "Uso: $0 <dump.dump> [bd-destino] [--keep] [--force]" >&2
  echo "  bd-destino por defecto: ${SCRATCH_DB}" >&2
  exit 2
}

[ $# -ge 1 ] || usage
DUMP_FILE="$1"; shift

TARGET_DB="$SCRATCH_DB"
KEEP=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --keep)  KEEP=1 ;;
    --force) FORCE=1 ;;
    *)       TARGET_DB="$arg" ;;
  esac
done

if [ ! -f "$DUMP_FILE" ]; then
  echo "ERROR: no existe el dump: $DUMP_FILE" >&2
  exit 1
fi

# --- Conexión: env o .env (sin mostrar nunca la URL completa) -------------
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

# --- Guarda: jamás sobrescribir weblead_dev sin doble confirmación --------
if [ "$TARGET_DB" = "$DEV_DB" ]; then
  if [ "$FORCE" -ne 1 ] || [ "${ALLOW_OVERWRITE_WEBLEAD_DEV:-}" != "1" ]; then
    echo "ERROR: restaurar sobre '${DEV_DB}' requiere --force Y ALLOW_OVERWRITE_WEBLEAD_DEV=1." >&2
    echo "       Esto solo lo hace el coordinador, a mano, con la API parada." >&2
    exit 1
  fi
  echo "AVISO: restaurando SOBRE '${DEV_DB}' (confirmación explícita dada)."
fi

# URL de mantenimiento (BD 'postgres') derivada de DATABASE_URL: sustituye
# el primer segmento de ruta por /postgres. Sirve para CREATE/DROP DATABASE.
ADMIN_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#/[^/?]*(\?|$)#/postgres\1#')"
TARGET_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#/[^/?]*(\?|$)#/${TARGET_DB}\1#")"

echo "Dump:    $DUMP_FILE"
echo "Destino: ${TARGET_DB}"

# --- Recrear la BD destino desde cero ---------------------------------------
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TARGET_DB}\";"

cleanup() {
  # Si es la scratch por defecto y no se pidió --keep, borrarla al salir
  # (también en caso de fallo, para no dejar restos).
  if [ "$TARGET_DB" = "$SCRATCH_DB" ] && [ "$KEEP" -ne 1 ]; then
    psql "$ADMIN_URL" -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" >/dev/null 2>&1 || true
    echo "BD scratch '${TARGET_DB}' eliminada."
  fi
}

# --- Restaurar ---------------------------------------------------------------
if pg_restore -d "$TARGET_URL" --exit-on-error "$DUMP_FILE"; then
  echo "OK restore completado en '${TARGET_DB}'."
else
  RC=$?
  echo "ERROR: pg_restore falló (exit $RC)." >&2
  cleanup
  exit "$RC"
fi

# --- Verificación de conteos -------------------------------------------------
echo "Conteos en '${TARGET_DB}' (comparar con scripts/count-rows.sh ${DEV_DB}):"
"$SCRIPT_DIR/count-rows.sh" "$TARGET_DB"

cleanup
exit 0
