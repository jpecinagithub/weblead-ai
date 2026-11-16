# WebLead AI — Fase F: notas de escalabilidad (10 → 100 empresas)

Qué se rompería primero al pasar del piloto (10 leads, 12 negocios en BD
con 2 fixtures de Fase E) a 100 empresas. Medido donde hay número real;
el resto es lectura del código, no una prueba de carga (no se hizo
load test: fuera de alcance y sin entorno de staging).

## 1. Lo primero que se rompe: la plataforma de demos

- **Hoy:** `apps/demo-platform/src/data/generated-demos.ts` (86 KB con
  6 demos en curso, Bloque 4) embebe TODAS las demos en un único
  módulo que Vite mete en el bundle JS. `dist` actual: 168 KB JS
  (1,2 MB con imágenes de archivo) para 6 demos.
- **A 100 demos:** el fichero crece ~14× (≈ 1,2 MB de fuente) y el
  bundle JS lo mismo: primera carga lenta en móvil y cada demo nueva
  obliga a reconstruir y redesplegar toda la plataforma.
- **Arreglo (no hecho en Fase F):** servir cada demo como JSON estático
  (`/demos/{slug}.json`, generado en build) y cargar solo la pedida;
  o paginar el índice. Sin esto, 100 demos son el techo práctico.

## 2. Dashboard sin paginación

- `GET /api/businesses` devuelve todas las filas en una sola
  respuesta y el dashboard las pinta todas (`apps/dashboard/src/App.tsx`).
  A 100 empresas funciona (respuesta de decenas de KB); a 1.000 la
  tabla es ilegible y la respuesta pesada.
- `GET /api/costs/summary` agrega en memoria sobre todos los
  UsageRecords: barato hasta miles de filas; a decenas de miles
  conviene agregar en SQL (GROUP BY) en vez de en JS.
- **Arreglo:** paginación server-side (`?limit&offset`) en
  /api/businesses y /api/crm/pipeline + agregación SQL en el resumen
  de costes. No hecho en Fase F: el piloto es de 10.

## 3. Costes: el discovery manda, el LLM no

Medido en `docs/phase-f/provider-comparison.md` (12 búsquedas / 10
empresas = 1,2 por empresa; resumen LLM 201 tokens/expediente):

| Empresas | Serper (créditos) | Exa Lite (USD) | LLM Top Tools (USD) |
|---|---|---|---|
| 10 | 12 | $0,048 | 0,00 |
| 100 | 120 | $0,48 | 0,00 |
| 1.000 | 1.200 | $4,80 | 0,00 |

- El saldo gratis de Serper (2.382 créditos) cubre ~1.985 empresas;
  después, top-up mínimo $50. El saldo Exa (19,013 USD) no es el
  límite. El LLM (201 tokens/expediente) es despreciable en ambos.
- **El cuello real es operativo, no de coste:** el discovery de Fase A
  fue manual (29 búsquedas). A 100 empresas hace falta el Researcher
  con Serper integrado (no construido: la evidencia llega estructurada)
  y una cola de trabajos con reintentos; hoy un run recorre los boards
  en orden hasta el tope sin persistir el progreso.

## 4. Auditorías Playwright: tiempo lineal

- Una auditoría = 2 cargas de página (desktop 1280 + móvil 390) +
  2 capturas. Medido en Fase D: segundos por demo.
- A 100 demos, auditar todo en serie son decenas de minutos; en
  paralelo, el Chromium local de esta VM (1,5 CPU compartida) se
  satura. **Arreglo:** paralelizar con límite (2–4 workers) o auditar
  solo las demos cambiadas (hash del contenido).

## 5. Postgres y API

- Postgres 16 local, BD `weblead_dev`, 32 tablas. Con 100 empresas
  las tablas son pequeñas (cientos de filas); nada que tocar.
- La API es un único proceso Express sin clustering ni rate limit en
  las lecturas; a 100 empresas y un solo operador no es problema.
  El backup diario (Bloque 3, `scripts/backup-postgres.sh`) tarda
  0,25 s con los datos actuales; a 100 empresas seguirá en segundos.
- **Pendiente conocido:** el backup vive en la misma VM (no protege
  contra reemplazo de la VM); la copia externa (rsync a Oracle, como
  LicitaClima) no está hecha.

## 6. Lo que NO se rompe a 100

- El state machine (18 estados) y el CRM (13 estados) son por
  empresa; no hay contadores globales que se desborden.
- El control de costes con límite 0 € (spend gate) es por llamada;
  escala sin cambios una vez persistido (Bloque 1).
- Vercel Hobby: el dashboard y la demo-platform son estáticos; el
  límite de 12 funciones no aplica (la API vive en Oracle).

## Resumen: orden de rotura

1. **Demo-platform** (bundle único con todas las demos) — primero.
2. **Dashboard sin paginación** (a partir de ~100–200 filas).
3. **Discovery manual / sin cola** (operativo, no técnico).
4. Auditorías Playwright en serie (tiempo, no corrección).
5. Postgres/API: sin cambios hasta miles de empresas.
