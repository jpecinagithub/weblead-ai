# @weblead/integrations

"Configuración e integraciones" panel data (§10). One entry per service
(Oracle, Vercel, Gmail, Groq, OpenRouter, Top Tools AI, xAI, CoArena,
Serper, Exa, Vercel AI Gateway, Google AI Studio, Apify, search provider,
image generator, Playwright) with status, function, auth type, known
limits, potential cost and last check date. No credentials here — never show
a full API key in the frontend. Gmail (Fase E): stub not_connected
(packages/integrations/src/gmail.ts, docs/gmail-setup.md); scopes mínimos
gmail.readonly + gmail.compose, sin gmail.send.
