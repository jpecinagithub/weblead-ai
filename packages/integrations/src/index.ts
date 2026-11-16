/**
 * Integrations — "Configuración e integraciones" panel (§10).
 * One entry per external service/integration, with the fields the admin
 * panel must show: status, function, auth type, known limits, potential
 * cost, last check date. NEVER an API key here or in the frontend.
 *
 * Initial states are honest, from what is verified (Fase A 2026-11-16,
 * MEMORY): nothing is claimed connected/operational without evidence.
 */
export * from './gmail.js';

export type IntegrationId =
  | 'oracle'
  | 'vercel'
  | 'gmail'
  | 'groq'
  | 'openrouter'
  | 'top-tools-ai'
  | 'xai'
  | 'coarena'
  | 'serper'
  | 'exa'
  | 'vercel-ai-gateway'
  | 'google-ai-studio'
  | 'apify'
  | 'search-provider'
  | 'image-generator'
  | 'playwright';

export type IntegrationStatus = {
  id: IntegrationId;
  name: string;
  status: string;
  function: string;
  authType: string;
  knownLimits: string;
  potentialCost: string;
  lastCheckedAt: string;
};

export const INTEGRATIONS: IntegrationStatus[] = [
  {
    id: 'oracle',
    name: 'Oracle Cloud',
    status: 'no desplegado',
    function: 'Backend Node + Express, workers de agentes, PostgreSQL',
    authType: 'SSH / Tailscale (servidor propio)',
    knownLimits: 'Instancia existente de Jon; sin despliegue en Fase 0',
    potentialCost: '0 € (infraestructura existente)',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    status: 'no importado',
    function: 'Dashboard administrativo y plataforma de demos',
    authType: 'Conexión oficial de Muse (sin escritura en el equipo jpecina-gmailcoms-projects)',
    knownLimits: 'Plan Hobby: máx. 12 Serverless Functions (por eso la API va en Oracle, no en Vercel)',
    potentialCost: '0 € (Hobby); el usuario importa los proyectos en el dashboard',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    status: 'no conectado (stub Fase E)',
    function: 'Borradores comerciales, lectura de respuestas, seguimiento CRM',
    authType: 'OAuth (permisos mínimos: gmail.readonly + gmail.compose para borradores; SIN gmail.send)',
    knownLimits: 'Sin cuenta real conectada y sin credenciales: ver docs/gmail-setup.md. Sin envío automático; aprobación humana + base legal (LSSI) siempre. Los borradores son locales (Postgres) hasta conectar.',
    potentialCost: '0 €',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'groq',
    name: 'Groq',
    status: 'pendiente de credencial',
    function: 'Primer proveedor candidato de inferencia (§3)',
    authType: 'API key (env GROQ_API_KEY, vacía)',
    knownLimits: 'Fase B 2026-11-16: no existe clave de inferencia — en NEXUS solo queda la clave "Audio to Text - Text to Audio" y no hay conector/helper de Groq. Pendiente de Jon.',
    potentialCost: 'Sin clave no hay coste ni uso; verificar free tier cuando Jon aporte la credencial',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    status: 'sin claves (eliminadas 2026-11-14) · saldo 0,91/10 USD (casi agotado)',
    function: 'Proveedor alternativo, selección dinámica por tarea (§3)',
    authType: 'API key (env OPENROUTER_API_KEY, vacía)',
    knownLimits: 'Fase B 2026-11-16: sigue sin claves; saldo 0,91/10 USD según NEXUS (2026-11-16, usados 9,09) — casi agotado, no fiable como proveedor principal — y sin clave utilizable ni conector/helper. Pendiente de Jon.',
    potentialCost: 'Sin clave no hay coste ni uso; priorizar modelos gratuitos o de bajo coste cuando la haya',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'top-tools-ai',
    name: 'Top Tools AI',
    status: 'operativo (Basic verificado)',
    function: 'Proveedor de inferencia por defecto (§3): resúmenes, generación de secciones web, revisión de contenido, borradores comerciales',
    authType: 'API key registrada (env TOP_TOOLS_API_KEY)',
    knownLimits: 'Modelos vigentes: Top-Tools-Ai-Basic / Pro / Max (lista verificada 2026-11-16). Basic medido: 949 tokens / 4 tareas Fase B, 0,00 USD. Pro/Max: inclusión en tier gratuito NO confirmada — no se usan. Discrepancia de seguimiento (2026-11-16): NEXUS muestra Free 10M/10M + Welcome 10M/10M con 0 usados (filas manuales, no sincronizadas), pero la Fase A ya gastó 805 tokens reales por otra vía: los 10M no se presentan como intactos.',
    potentialCost: '0 € con Basic (tier gratuito, 10M tokens/día según el conector); nunca llamar a modelos PAYG (gpt-5.6-sol, claude-opus-5)',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    status: 'sin crédito ($0.00, uso $5.78, 7.088.187 tokens, 798 requests, verificado 2026-11-16)',
    function: 'Proveedor de inferencia (agente xAI, crédito NEXUS)',
    authType: 'API key registrada (env XAI_API_KEY)',
    knownLimits: 'Saldo de cuenta $0.00 (captura console.x.ai 2026-11-16 21:04, vista 30 días). 3 claves: hermes (xai-...8jb0) $4.84/30d, último uso hace 57 min, proyecto no identificado; NEXUS (xai-...IGKt) $0.15/30d, último uso hace 6 días — EXISTE y está activa; nexus-credits (xai-...4mXW) sin gasto, management key (Billing: Read). La credencial registrada aquí (400 Incorrect API key) NO es la clave NEXUS. DISCREPANCIA: NEXUS dice 4,09/4,21 USD (usados 0,12) pero la consola dice $0,00 y uso $5,78 — manda la consola; la fila NEXUS está desactualizada (corregir en el hilo NEXUS, no desde WebLead). Decisión de Jon 2026-11-16 21:27: SIN recarga; grok fuera definitivamente hasta nuevo aviso. El fallback solo encadena operativos (Top Tools AI Basic), así que grok nunca bloquea el flujo.',
    potentialCost: 'recarga de pago solo con aprobación expresa de Jon',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'coarena',
    name: 'CoArena Model API',
    status: 'no operativo — clave revocada',
    function: 'Proveedor de inferencia alternativo (5 USD/día gratis)',
    authType: 'API key registrada (env COARENA_API_KEY)',
    knownLimits: 'Fase B 2026-11-16: re-verificado, sigue 401 en una lectura de límites (clave revocada). Sin uso hasta reconectar con una clave nueva.',
    potentialCost: '0 € (sin uso: la clave es rechazada antes de generar nada)',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'serper',
    name: 'Serper (búsqueda Google)',
    status: 'candidato principal Researcher · saldo 2.382/2.500 créditos (2026-11-16)',
    function: 'API de búsqueda Google: discovery + verificación del Researcher',
    authType: 'API key (en el servidor, laptop-radar/NEXUS, según Jon; no se copia aquí)',
    knownLimits: 'Saldo NEXUS 2026-11-16: 2.382/2.500 (usados 118). Sin medición aún: pendiente medir el coste por empresa (trabajo futuro). Sin llamadas desde WebLead AI todavía.',
    potentialCost: '0 € hasta agotar los 2.382 créditos; medir coste/empresa antes de escalar',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'exa',
    name: 'Exa (búsqueda + Places)',
    status: 'candidato discovery · saldo 19,013/20 USD (2026-11-16)',
    function: 'Búsqueda web + Places para discovery del Researcher',
    authType: 'API key (env EXA_API_KEY, vacía en este repo)',
    knownLimits: 'Saldo NEXUS 2026-11-16: 19,013/20 USD (usados 0,987). Ya se usó Exa Places en Fase A como fuente.',
    potentialCost: 'Dentro del saldo existente; sin llamadas nuevas sin medir coste/empresa',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'vercel-ai-gateway',
    name: 'Vercel AI Gateway',
    status: 'candidato LLM alternativo · saldo 4,999/5 USD (2026-11-16)',
    function: 'Proveedor LLM alternativo viable (gateway multi-modelo)',
    authType: 'API key (sin configurar en este repo)',
    knownLimits: 'Saldo NEXUS 2026-11-16: 4,999/5 USD (usados 0,001), ciclo mensual gratuito. Sin probar desde WebLead AI.',
    potentialCost: '0 € dentro del ciclo gratuito mensual; verificar modelos y límites antes de usar',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'google-ai-studio',
    name: 'Google AI Studio (Gemini)',
    status: 'pendiente (fecha desconocida)',
    function: 'Proveedor LLM alternativo (Gemini, free tier)',
    authType: 'API key (sin configurar en este repo)',
    knownLimits: 'Saldo NEXUS: "Pendiente", fecha desconocida (2026-11-16). Free tier a verificar.',
    potentialCost: '0 € si el free tier lo cubre; verificar antes de usar',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'apify',
    name: 'Apify',
    status: 'pendiente de evaluar',
    function: 'Proveedor de búsqueda candidato (Fase C): actores de scraping bajo demanda',
    authType: 'API key (env APIFY_API_KEY, vacía; sin llamadas en Fase 0)',
    knownLimits: 'Google Maps Scraper 4 USD/1.000 lugares en plan Free (+2 detalles/contactos); ~120 listados máx. por consulta de Maps; crédito no usado no se acumula',
    potentialCost: '5 USD de crédito disponible (NO caduca, confirmado por Jon 2026-11-16 21:27); sin consumo hasta que la Fase C lo apruebe y con límite efectivo cero',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'search-provider',
    name: 'Proveedor de búsqueda',
    status: 'provisional: búsqueda web',
    function: 'Discovery de empresas (Researcher, Fase C)',
    authType: 'Ninguna (búsqueda web) / API key si se usa Exa o Places',
    knownLimits: 'Overpass inaccesible desde esta VM; Google Places API sin probar (requiere clave + ToS)',
    potentialCost: '0 € provisional; Places: 1.000 llamadas gratis/mes, luego 35 USD/1.000',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'image-generator',
    name: 'Generador de imágenes',
    status: 'pendiente',
    function: 'Imágenes para las webs generadas (Fase D)',
    authType: 'Por decidir en Fase D',
    knownLimits: 'Solo recursos con licencia compatible; nada de pago sin autorización',
    potentialCost: '0 € mientras sea free tier; si requiere pago, detener y pedir autorización',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    status: 'pendiente de instalar/verificar',
    function: 'Auditoría independiente de webs (Fase D)',
    authType: 'Ninguna (herramienta local)',
    knownLimits: 'No instalado en esta VM en Fase 0',
    potentialCost: '0 € (open source)',
    lastCheckedAt: '2026-11-16',
  },
];
