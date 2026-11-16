"""Verificación Fase C WebLead AI: resumen LLM de 3 expedientes reales con
Top Tools AI (Top-Tools-Ai-Basic), el único proveedor operativo (Fase B).

Auth: credencial registrada custom.top-tools-ai vía dynamic_credentials
(mismo mecanismo que la medición de Fase A y Fase B). No hay claves en
este archivo. Solo se llama al modelo Basic: Pro/Max aparecen en la
lista de modelos pero su inclusión en el tier gratuito NO está confirmada
(duda de pago), así que NO se llaman. No se llama a ningún modelo PAYG.
Coste: el modelo Basic es el tier gratuito del proveedor (10M tokens/día
según el conector); la API no devuelve precio, solo usage en tokens →
coste estimado 0,00 USD, confirmado null.

Los resúmenes LLM son solo texto de presentación: los hechos (score,
actividad, estado) los decide el Researcher determinista y ya están
persistidos en Postgres. El resumen LLM se guarda después en
ResearchReport.llmSummary con `pnpm --filter @weblead/api
apply:llm-summaries` y su consumo en UsageRecord (estimado 0, confirmado
null). Uso: python3 verify-dossiers-tta.py (escribe llm-summaries-tta.json)
"""
import json
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

BASE = "https://top-tools-ai.com/api/v1"
MODEL = "Top-Tools-Ai-Basic"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")


def chat(prompt, max_tokens):
    body = {"model": MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens}
    data = json.dumps(body).encode()
    r = urllib.request.Request(BASE + "/chat/completions", data=data, method="POST")
    r.add_header("Content-Type", "application/json")
    add_surrogate_to_request(r, "custom.top-tools-ai", allowed_hosts=["top-tools-ai.com"])
    t0 = time.monotonic()
    try:
        with urllib.request.build_opener(NoRedirect()).open(r, timeout=120) as resp:
            res = read_json_response(resp)
            return resp.status, res, time.monotonic() - t0
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode(errors="replace")[:500]}, time.monotonic() - t0


DOSSIERS = [
    (6, "Santiago Ferrer Fontanería en General SL",
     "Resume en 3 frases el siguiente expediente para una agencia web que vende webs a negocios locales. "
     "Negocio: Santiago Ferrer Fontanería en General SL, fontanería en Logroño. Sin web propia (verificado 2026-11-16). "
     "Teléfono 941227157, email sanfefo@terra.com. Actividad CONFIRMED (ficha eInforma consultada 14/10/2026; SL, 10 empleados, constituida 1994). "
     "Score 100/100. Recomendación: crear web propia.", 200),
    (8, "Hidrorioja SC",
     "Resume en 3 frases el siguiente expediente para una agencia web que vende webs a negocios locales. "
     "Negocio: Hidrorioja SC, fontanería/climatización en Logroño. Sin web propia (verificado 2026-11-16). "
     "Teléfono 941255266, email hidrorioja@telefonica.net. Actividad CONFIRMED (Cylex actualizado 03/07/2026; 3 reseñas, 3,7/5). "
     "Score 90/100. Recomendación: crear web propia.", 200),
    (1, "Fontanería Godoy",
     "Resume en 3 frases el siguiente expediente para una agencia web que vende webs a negocios locales. "
     "Negocio: Fontanería Godoy, fontanería en Logroño. CON web propia activa (fontaneria-godoy.com), teléfono 941212833, email info@fontaneria-godoy.com. "
     "Actividad PROBABLE; 51 reseñas, 4,3/5. Score 45/100, por debajo del umbral 70: RECHAZADA como lead, no es candidata a web nueva. "
     "Explica brevemente por qué no cualifica.", 200),
]

out = []
for pilot_id, name, prompt, max_tokens in DOSSIERS:
    st, res, secs = chat(prompt, max_tokens)
    usage = res.get("usage", {}) if isinstance(res, dict) else {}
    content = ""
    try:
        content = res["choices"][0]["message"]["content"]
    except Exception:
        content = str(res)[:300]
    out.append({
        "pilotId": pilot_id,
        "business": name,
        "provider": "top-tools-ai",
        "model": MODEL,
        "http": st,
        "latency_seconds": round(secs, 2),
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
        "estimated_cost_usd": 0.0,
        "confirmed_cost_usd": None,
        "summary": content,
    })
    print(f"pilot {pilot_id} {name} http={st} latency={secs:.2f}s usage={usage}")
    print("  ->", content[:240].replace("\n", " "))
with open("/home/hatch/workspace/weblead-ai/fase-c/llm-summaries-tta.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("OK, guardado fase-c/llm-summaries-tta.json")
