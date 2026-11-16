# Fase F — Bloque 3: backup diario de Postgres + restauración probada

Fecha de la prueba: **2026-11-16 ~20:24–20:25 UTC** (22:24–22:25 CET).
BD: `weblead_dev`, PostgreSQL 16.15 local (clúster `16 main`, puerto 5432,
usuario `weblead`). Patrón adaptado de LicitaClima (`docs/operations.md` §6:
pg_dump `-Fc` + restore con conteo de filas), contra Postgres local sin
Docker (pg_dump directo).

## 1. Scripts

| Script | Qué hace |
|---|---|
| `scripts/backup-postgres.sh` | `pg_dump -Fc` con nombre `weblead_dev-YYYY-MM-DD_HHMMSS.dump` en `backups/`; retención 7 días (borra dumps más antiguos); verifica el dump con `pg_restore -l`; log en `logs/backup-postgres.log` con fecha y tamaño; exit != 0 si falla (y borra el dump parcial). Idempotente, no interactivo. |
| `scripts/restore-postgres.sh <dump> [bd] [--keep] [--force]` | Recrea la BD destino desde cero y restaura con `pg_restore --exit-on-error`. Destino por defecto: BD scratch `weblead_restore_test`, eliminada al final salvo `--keep`. **Guarda:** restaurar sobre `weblead_dev` exige `--force` Y `ALLOW_OVERWRITE_WEBLEAD_DEV=1`; sin ambas, se niega (verificado, exit 1). |
| `scripts/count-rows.sh [bd]` | Imprime `tabla: N` para cada tabla de `public`, ordenadas. Para comparar origen vs restaurada con `diff`. |

**Credenciales:** ningún script, log ni doc contiene contraseñas.
`DATABASE_URL` se lee de `.env` (o de la variable de entorno si ya está
definida) y viaja solo en memoria como argumento de `pg_dump`/`pg_restore`/
`psql`; nunca se imprime. `backups/` está en `.gitignore` (los dumps NO van
a git). `logs/` ya estaba ignorado.

## 2. Prueba real (2026-11-16)

### 2.1 Backup

```bash
cd ~/workspace/weblead-ai
scripts/backup-postgres.sh
```

Resultado: **exit 0, 0,25 s**.

```
[2026-11-16 20:24:55 UTC] Inicio backup de 'weblead_dev' -> /home/hatch/workspace/weblead-ai/backups/weblead_dev-2026-11-16_202455.dump
[2026-11-16 20:24:56 UTC] OK backup completado: /home/hatch/workspace/weblead-ai/backups/weblead_dev-2026-11-16_202455.dump (76K, 76200 bytes)
[2026-11-16 20:24:56 UTC] Fin backup OK
```

Dump: `backups/weblead_dev-2026-11-16_202455.dump`, **76.200 bytes (76K)**.
Segunda ejecución (20:24:57, para probar retención): exit 0, segundo dump
`weblead_dev-2026-11-16_202457.dump` (76.200 bytes).

### 2.2 Retención (prueba con fichero ficticio)

```bash
touch -d "10 days ago" backups/weblead_dev-2026-11-06_000000.dump
scripts/backup-postgres.sh   # segunda ejecución
```

Resultado: el dump ficticio de 10 días **fue eliminado**; log:
`Retención: eliminados 1 dump(s) con más de 7 días`. Retención de 7 días
verificada.

### 2.3 Guarda anti-sobrescritura (verificada antes del restore)

```bash
scripts/restore-postgres.sh backups/placeholder.dump weblead_dev
# ERROR: restaurar sobre 'weblead_dev' requiere --force Y ALLOW_OVERWRITE_WEBLEAD_DEV=1.
#        Esto solo lo hace el coordinador, a mano, con la API parada.
# exit 1
```

### 2.4 Restore en BD scratch + conteo tabla por tabla

```bash
scripts/count-rows.sh weblead_dev > /tmp/counts-before.txt
scripts/restore-postgres.sh backups/weblead_dev-2026-11-16_202455.dump --keep
# exit 0, 2,8 s; "OK restore completado en 'weblead_restore_test'."
scripts/count-rows.sh weblead_restore_test > /tmp/counts-restored.txt
diff /tmp/counts-before.txt /tmp/counts-restored.txt
# SIN DIFERENCIAS — 32/32 tablas coinciden
```

Conteos antes (origen `weblead_dev`) y después (restaurada
`weblead_restore_test`) — **idénticos en las 32 tablas**:

| Tabla | Origen | Restaurada | Tabla | Origen | Restaurada |
|---|---|---|---|---|---|
| Agent | 2 | 2 | EmailMessage | 0 | 0 |
| AgentExecution | 20 | 20 | EmailThread | 0 | 0 |
| AgentMessage | 0 | 0 | Integration | 0 | 0 |
| Audit | 6 | 6 | OpportunityScore | 10 | 10 |
| AuditFinding | 10 | 10 | PriceConfiguration | 1 | 1 |
| BudgetLimit | 0 | 0 | ResearchReport | 10 | 10 |
| Business | 12 | 12 | Role | 0 | 0 |
| BusinessEvidence | 70 | 70 | SystemSetting | 0 | 0 |
| BusinessSource | 15 | 15 | Task | 0 | 0 |
| CRMActivity | 10 | 10 | TaskLog | 0 | 0 |
| Campaign | 0 | 0 | UsageRecord | 3 | 3 |
| CampaignSector | 0 | 0 | User | 0 | 0 |
| CommercialProposal | 6 | 6 | WebsiteAsset | 16 | 16 |
| ContactPermission | 2 | 2 | WebsiteDeployment | 0 | 0 |
| ContactSuppression | 1 | 1 | WebsiteProject | 6 | 6 |
| EmailDraft | 2 | 2 | _prisma_migrations | 3 | 3 |

Tablas pedidas en el encargo: Business 12/12, WebsiteProject 6/6, Audit
6/6, AuditFinding 10/10, UsageRecord 3/3. **Restauración probada: 32/32.**

### 2.5 Limpieza tras la prueba

- BD scratch eliminada (`DROP DATABASE weblead_restore_test`, verificado:
  solo queda `weblead_dev` en `pg_database`).
- Ruta por defecto del restore (sin `--keep`) re-verificada con el segundo
  dump: exit 0 y la scratch se auto-elimina al final.
- `weblead_dev` intacta tras toda la prueba: Business/Audit/UsageRecord =
  12/6/3 (igual que antes).
- Quedan 2 dumps en `backups/` (20:24:55 y 20:24:57, 76.200 bytes cada
  uno); no van a git.

## 3. Cron — PROPUESTO, NO INSTALADO

Estado del crontab actual (2026-11-16, guardado en
`docs/phase-f/crontab-before.txt`): **sin crontab**. Detalle: en esta VM ni
siquiera existe el binario `crontab` (`crontab: command not found`, sin
paquete `cron` instalado), así que **no se puede instalar ningún cron
desde aquí**; la instalación queda para Jon (ver pasos abajo).

Línea propuesta (diaria, 03:30 hora local del equipo donde corra):

```cron
30 3 * * * mkdir -p /home/hatch/workspace/weblead-ai/logs && /home/hatch/workspace/weblead-ai/scripts/backup-postgres.sh >> /home/hatch/workspace/weblead-ai/logs/backup-postgres-cron.log 2>&1
```

Notas sobre la línea:

- `mkdir -p` del dir de logs antes de redirigir: si el dir no existe, el
  redirect fallaría en silencio (lección de LicitaClima/NEXUS 2026-10-16).
- Rutas absolutas en todo (el entorno de cron es mínimo); el script lee
  `DATABASE_URL` de `<repo>/.env` por sí mismo, no depende del entorno.
- El script ya escribe su propio log en `logs/backup-postgres.log`; la
  redirección de cron es una segunda copia de la salida.
- La hora 03:30 es hora local del equipo: en Oracle (Europe/Madrid) son
  las 03:30 CET; en esta VM (UTC) serían las 03:30 UTC = 04:30 CET.
  Elegir el equipo y la hora con Jon; lo importante es 1×/día.

### Instalación (para Jon — NO ejecutada por el subagente)

El incidente de LicitaClima 2026-11-14 borró un crontab al instalar uno
nuevo; por eso el procedimiento es añadir a lo que ya haya, nunca
reescribir a ciegas:

```bash
# 1. Ver qué crontab hay AHORA (guardar la salida antes de tocar nada):
crontab -l > /tmp/crontab-antes.txt 2>&1 || echo "sin crontab"

# 2. Si en el equipo no existe el comando crontab, instalar cron primero
#    (en esta VM de desarrollo no está instalado):
#    sudo apt-get install -y cron

# 3. Añadir la línea SIN borrar lo existente (crontab -l | ... | crontab -):
(crontab -l 2>/dev/null; echo "30 3 * * * mkdir -p /home/hatch/workspace/weblead-ai/logs && /home/hatch/workspace/weblead-ai/scripts/backup-postgres.sh >> /home/hatch/workspace/weblead-ai/logs/backup-postgres-cron.log 2>&1") | crontab -

# 4. Verificar:
crontab -l
# 5. Al día siguiente, comprobar que hay un dump nuevo en backups/ y una
#    línea OK en logs/backup-postgres.log.
```

## 4. Limitaciones y pendientes

1. **El backup vive en la misma VM que la BD.** Protege contra corrupción
   o borrado accidental de `weblead_dev`, pero NO contra un reemplazo de
   la VM (el motivo original del problema: en Fases C y D se perdió el
   clúster al reiniciar/reemplazar la VM, y `backups/` se perdería igual).
   Pendiente (fuera de este bloque): copia externa de los dumps — p. ej.
   `rsync` diario a Oracle, como LicitaClima ("Guardar FUERA del
   servidor"), o descarga periódica. Sin eso, el RPO real ante reemplazo
   de VM sigue siendo "se pierde todo".
2. **Sin cron instalado en esta VM.** La línea propuesta no se pudo
   instalar ni probar en cron real aquí; la primera ejecución programada
   queda pendiente de la instalación por Jon.
3. **Restauración sobre `weblead_dev` no probada** (por diseño: solo con
   doble confirmación del coordinador y la API parada). El procedimiento
   es el mismo script con `--force` + `ALLOW_OVERWRITE_WEBLEAD_DEV=1`;
   tras restaurar, habría que re-ejecutar `prisma migrate deploy` por si
   el dump es anterior a una migración (runbook de LicitaClima §6).
4. Los dumps restauran solo la BD. No hay ficheros de usuario fuera de la
   BD en WebLead AI (las demos viven en git y en `docs/phase-d/
   screenshots/`), así que no hay equivalente a los "pliegos" de
   LicitaClima que copiar aparte.
5. `fase-f/` (untracked, con `design-drafts-tta.py`, 2026-11-16 20:24) ya
   existía antes de este bloque; no se tocó ni se incluye en el commit.
