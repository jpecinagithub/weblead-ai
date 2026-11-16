"""Borradores LLM Fase F (Bloque 4) WebLead AI: subtítulo hero + párrafo "La empresa"
para las 6 demos restantes del piloto de Logroño.

Auth: credencial registrada custom.top-tools-ai vía dynamic_credentials (mismo
mecanismo que Fase A, B y D). Solo modelo Top-Tools-Ai-Basic (tier gratuito
verificado, 10M tokens/día según el conector). No se llama a Pro/Max (inclusión
en tier gratuito no confirmada) ni a ningún modelo PAYG.
Coste: la API devuelve tokens, no precio -> estimado 0,00 USD, confirmado null.
Los borradores NO son hechos: el generador (website-generator) valida cada campo
contra el expediente y la lista de afirmaciones prohibidas (precios, horarios,
testimonios, servicios no contrastados, años de experiencia, superlativos,
certificaciones). Un borrador rechazado usa el texto determinista y queda registrado.
Datos de empresa SOLO de docs/feasibility-data.csv y
packages/shared/src/data/pilot-leads.json (nada inventado).
Uso: python3 design-drafts-tta.py  (escribe fase-f/llm-design-drafts.json)
"""
import json, time, urllib.request, urllib.error, sys
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response
BASE = "https://top-tools-ai.com/api/v1"
MODEL = "Top-Tools-Ai-Basic"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")

def chat(prompt, max_tokens):
    body = {"model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens}
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

TASKS = [
    ("fontaneria-la-moderna", 4,
     "Escribe en español, para la web de demostración de 'Fontanería la Moderna', "
     "fontanería y climatización en Logroño, dirección C/ Duquesa de la Victoria, 75, 26004 Logroño, "
     "teléfono 941251317, actividad verificada (CONFIRMED, ficha actualizada 25/05/2026, 4,8/5 con 5 reseñas), sin web propia. "
     "Devuelve EXACTAMENTE dos líneas: línea 1 'SUBTITULO: ...' (una frase, máximo 20 palabras, que diga que es fontanería "
     "y climatización en Logroño y que el contacto es directo por teléfono); línea 2 'SOBRE: ...' (2 frases, máximo 45 palabras, "
     "que presenten la empresa solo con esos datos; puedes mencionar la valoración 4,8/5 con 5 reseñas porque es un dato verificado). "
     "PROHIBIDO inventar: precios, horarios, servicios concretos, años de experiencia, testimonios, clientes, certificaciones, "
     "superlativos ('la mejor', 'líder') o urgencias 24h. "
     "Si no puedes escribirlo sin inventar, escribe solo los datos dados.", 300),
    ("fontaneria-chuchi", 7,
     "Escribe en español, para la web de demostración de 'Fontanería Chuchi', "
     "fontanería en Logroño, dirección C/ Manuel de Falla, 47, 5-A, 26007 Logroño, "
     "teléfono 649412049, actividad probable (PROBABLE, solo directorios, sin reseñas ni fecha), sin web propia. "
     "Devuelve EXACTAMENTE dos líneas: línea 1 'SUBTITULO: ...' (una frase, máximo 20 palabras, que diga que es fontanería "
     "en Logroño y que el contacto es directo por teléfono); línea 2 'SOBRE: ...' (2 frases, máximo 45 palabras, "
     "que presenten la empresa solo con esos datos). "
     "PROHIBIDO inventar: precios, horarios, servicios concretos, años de experiencia, testimonios, clientes, certificaciones, "
     "superlativos ('la mejor', 'líder') o urgencias 24h. "
     "Si no puedes escribirlo sin inventar, escribe solo los datos dados.", 300),
    ("avalon-stilistas", 19,
     "Escribe en español, para la web de demostración de 'Avalon Stilistas', "
     "peluquería en Logroño, dirección C/ Lardero, 8, 26002 Logroño, "
     "teléfono 941289846, actividad probable (PROBABLE, solo directorios, sin reseñas ni fecha), sin web propia. "
     "Devuelve EXACTAMENTE dos líneas: línea 1 'SUBTITULO: ...' (una frase, máximo 20 palabras, que diga que es una peluquería "
     "en Logroño y que el contacto es directo por teléfono); línea 2 'SOBRE: ...' (2 frases, máximo 45 palabras, "
     "que presenten la empresa solo con esos datos). "
     "PROHIBIDO inventar: precios, horarios, servicios concretos, años de experiencia, testimonios, clientes, certificaciones, "
     "superlativos ('la mejor', 'líder') o sistemas de reserva. "
     "Si no puedes escribirlo sin inventar, escribe solo los datos dados.", 300),
    ("lumberjack-barbershop", 24,
     "Escribe en español, para la web de demostración de 'Lumberjack Barbershop', "
     "barbería en Logroño, dirección Av. de la Solidaridad, 46, 26003 Logroño, "
     "teléfono 941760684, actividad verificada (CONFIRMED, 335 reseñas, 5,0/5 en Booksy), sin web propia. "
     "Devuelve EXACTAMENTE dos líneas: línea 1 'SUBTITULO: ...' (una frase, máximo 20 palabras, que diga que es una barbería "
     "en Logroño y que el contacto es directo por teléfono); línea 2 'SOBRE: ...' (2 frases, máximo 45 palabras, "
     "que presenten la empresa solo con esos datos; puedes mencionar la valoración 5,0/5 con 335 reseñas porque es un dato verificado). "
     "PROHIBIDO inventar: precios, horarios, servicios concretos, años de experiencia, testimonios, clientes, certificaciones, "
     "superlativos ('la mejor', 'líder') o sistemas de reserva. "
     "Si no puedes escribirlo sin inventar, escribe solo los datos dados.", 300),
    ("star-barber-shop", 25,
     "Escribe en español, para la web de demostración de 'Star Barber Shop', "
     "barbería en Logroño, dirección C/ Padre Marín, 11, 26004 Logroño, "
     "teléfono 641216748, actividad verificada (CONFIRMED, reseñas fechadas en 2026), sin web propia. "
     "Devuelve EXACTAMENTE dos líneas: línea 1 'SUBTITULO: ...' (una frase, máximo 20 palabras, que diga que es una barbería "
     "en Logroño y que el contacto es directo por teléfono); línea 2 'SOBRE: ...' (2 frases, máximo 45 palabras, "
     "que presenten la empresa solo con esos datos). "
     "PROHIBIDO inventar: precios, horarios, servicios concretos, años de experiencia, testimonios, clientes, certificaciones, "
     "superlativos ('la mejor', 'líder') o sistemas de reserva. "
     "Si no puedes escribirlo sin inventar, escribe solo los datos dados.", 300),
    ("peluqueria-nuria", 26,
     "Escribe en español, para la web de demostración de 'Peluquería Nuria', "
     "peluquería en Logroño, dirección C/ Oviedo, 12, bajo 3, 26003 Logroño, "
     "teléfono 941581920, actividad probable (PROBABLE, ficha activa con horarios), sin web propia. "
     "Devuelve EXACTAMENTE dos líneas: línea 1 'SUBTITULO: ...' (una frase, máximo 20 palabras, que diga que es una peluquería "
     "en Logroño y que el contacto es directo por teléfono); línea 2 'SOBRE: ...' (2 frases, máximo 45 palabras, "
     "que presenten la empresa solo con esos datos). "
     "PROHIBIDO inventar: precios, horarios, servicios concretos, años de experiencia, testimonios, clientes, certificaciones, "
     "superlativos ('la mejor', 'líder') o sistemas de reserva. "
     "Si no puedes escribirlo sin inventar, escribe solo los datos dados.", 300),
]

out = []
for slug, pilot_id, prompt, max_tokens in TASKS:
    st, res, secs = chat(prompt, max_tokens)
    usage = res.get("usage", {}) if isinstance(res, dict) else {}
    content = ""
    try:
        content = res["choices"][0]["message"]["content"]
    except Exception:
        content = str(res)[:300]
    out.append({
        "slug": slug, "pilot_id": pilot_id, "agent": "designer", "task": "design-draft",
        "model": MODEL, "provider": "top-tools-ai", "http": st,
        "latency_seconds": round(secs, 2),
        "prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
        "estimated_cost_usd": 0.0, "confirmed_cost_usd": None,
        "response": content,
    })
    print(f"{slug} http={st} latency={secs:.2f}s usage={usage}")
    print("  ->", content[:300].replace("\n", " | "))

with open("llm-design-drafts.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"Wrote llm-design-drafts.json ({len(out)} drafts)")
