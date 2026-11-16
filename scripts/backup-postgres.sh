#!/usr/bin/env bash
# WebLead AI — Backup diario de PostgreSQL (Fase F, Bloque 3).
#
# Hace un pg_dump en formato custom (-Fc) de la BD de desarrollo weblead_dev
# (Postgres 16 local) y lo guarda en backups/ con nombre fechado.
# Retención por defecto: 7 días (se borran los dumps más antiguos).
#
# Uso:
#   scripts/backup-postgres.sh
#
# Variables de entorno (todas opcionales):
#   DATABASE_URL     Conexión Postgres. Si no está definida, se lee de
#                    <repo>/.env (línea DATABASE_URL=...). NUNCA se imprime
#                    ni se escribe en logs: la contraseña viaja solo en
#                    memoria como parte de la URL de conexión.
#   BACKUP_DIR       Directorio de dumps (defecto: <repo>/backups).
#   RETENTION_DAYS   Días de retención (defecto: 7).
#   LOG_FILE         Fichero de log (defecto: <repo>/logs/backup-postgres.log).
#
# Idempotente y no interactivo: se puede llamar desde cron. Exit code != 0
# si el dump falla o el fichero resultante no es válido.
#
# Patrón adaptado de LicitaClima (docs/operations.md §6): mismo pg_dump -Fc
# + restauración probada con conteo de filas, pero contra Postgres local
# sin Docker (pg_dump directo, sin credenciales en el comando).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
LOG_FILE="${LOG_FILE:-$REPO_ROOT/logs/backup-postgres.log}"

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

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
export DATABASE_URL

# Nombre de la BD (solo para el nombre del fichero y el log; sin contraseña).
DB_NAME="$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgres(ql)?://[^/]+/##; s#[?].*$##; s#/.*$##')"
DB_NAME="${DB_NAME:-weblead_dev}"

TIMESTAMP="$(date '+%Y-%m-%d_%H%M%S')"
DUMP_FILE="$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.dump"

log "Inicio backup de '${DB_NAME}' -> ${DUMP_FILE}"

# --- Dump ------------------------------------------------------------------
# Si pg_dump falla, borrar el fichero parcial para no dejar un dump corrupto.
if ! pg_dump "$DATABASE_URL" -Fc -f "$DUMP_FILE"; then
  rm -f "$DUMP_FILE"
  log "ERROR: pg_dump falló; fichero parcial eliminado"
  exit 1
fi

# --- Verificación rápida de integridad del dump ----------------------------
if [ ! -s "$DUMP_FILE" ]; then
  rm -f "$DUMP_FILE"
  log "ERROR: dump vacío; fichero eliminado"
  exit 1
fi
if ! pg_restore -l "$DUMP_FILE" >/dev/null; then
  rm -f "$DUMP_FILE"
  log "ERROR: pg_restore -l no puede leer el dump; fichero eliminado"
  exit 1
fi

SIZE_HUMAN="$(du -h "$DUMP_FILE" | cut -f1)"
SIZE_BYTES="$(stat -c%s "$DUMP_FILE")"
log "OK backup completado: ${DUMP_FILE} (${SIZE_HUMAN}, ${SIZE_BYTES} bytes)"

# --- Retención ---------------------------------------------------------------
DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.dump" -type f -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
if [ "$DELETED" -gt 0 ]; then
  log "Retención: eliminados ${DELETED} dump(s) con más de ${RETENTION_DAYS} días"
fi

log "Fin backup OK"
exit 0
