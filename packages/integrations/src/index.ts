/**
 * Integrations — "Configuración e integraciones" panel (§10).
 * One entry per external service/integration, with the fields the admin
 * panel must show: status, function, auth type, known limits, potential
 * cost, last check date. NEVER an API key here or in the frontend.
 *
 * Initial states are honest, from what is verified (Fase A 2026-11-16,
 * MEMORY): nothing is claimed connected/operational without evidence.
 */
export type IntegrationId =
  | 'oracle'
  | 'vercel'
  | 'gmail'
  | 'groq'
  | 'openrouter'
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
    status: 'no conectado',
    function: 'Borradores comerciales, lectura de respuestas, seguimiento CRM',
    authType: 'OAuth (permisos mínimos, Fase E)',
    knownLimits: 'Sin envío automático; aprobación humana + base legal (LSSI) siempre',
    potentialCost: '0 €',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'groq',
    name: 'Groq',
    status: 'pendiente de credencial',
    function: 'Primer proveedor candidato de inferencia (§3)',
    authType: 'API key (env GROQ_API_KEY, vacía)',
    knownLimits: 'Sin clave asumida: solo queda la clave "Audio to Text" en NEXUS; comprobar en Fase B',
    potentialCost: 'A verificar en Fase B (límites free tier por modelo)',
    lastCheckedAt: '2026-11-16',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    status: 'sin claves (eliminadas 2026-11-14)',
    function: 'Proveedor alternativo, selección dinámica por tarea (§3)',
    authType: 'API key (env OPENROUTER_API_KEY, vacía)',
    knownLimits: 'Las 4 claves fueron eliminadas 2026-11-14; queda saldo 1,09 USD sin clave utilizable',
    potentialCost: 'A verificar en Fase B; priorizar modelos gratuitos o de bajo coste',
    lastCheckedAt: '2026-11-14',
  },
  {
    id: 'apify',
    name: 'Apify',
    status: 'pendiente de evaluar',
    function: 'Proveedor de búsqueda candidato (Fase C): actores de scraping bajo demanda',
    authType: 'API key (env APIFY_API_KEY, vacía; sin llamadas en Fase 0)',
    knownLimits: 'Google Maps Scraper 4 USD/1.000 lugares en plan Free (+2 detalles/contactos); ~120 listados máx. por consulta de Maps; crédito no usado no se acumula',
    potentialCost: '5 USD de crédito disponible (caducidad desconocida — pregunta abierta para Jon); sin consumo hasta que la Fase C lo apruebe y con límite efectivo cero',
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
