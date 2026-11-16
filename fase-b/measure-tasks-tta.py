"""Medición Fase B WebLead AI: calidad y consumo por tarea de agente con Top Tools AI (Top-Tools-Ai-Basic).
Auth: credencial registrada custom.top-tools-ai vía dynamic_credentials (mismo mecanismo que el helper
y que la medición de Fase A). No hay claves en este archivo.
Solo se llama al modelo Basic: Pro/Max aparecen en la lista de modelos pero su inclusión en el tier
gratuito NO está confirmada (duda de pago), así que NO se llaman. No se llama a ningún modelo PAYG.
Coste: el modelo Basic es el tier gratuito del proveedor (10M tokens/día según el conector); la API
no devuelve precio, solo usage en tokens → coste estimado 0,00 USD, confirmado null.
Uso: python3 measure-tasks-tta.py  (escribe resultados en measurements-tta.json)"""
import json, time, urllib.request, urllib.error, sys
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

TASKS = [
    ("researcher", "resumen-expediente",
     "Resume en 3 frases el siguiente expediente para una agencia web que vende webs a negocios locales. "
     "Negocio: Fontanería la Moderna, Logroño. Sin web propia (verificado 2026-11-16). Teléfono 941251317. "
     "Valoración 4,8/5 con 5 reseñas. Score 85/100. Recomendación: crear web propia.", 200),
    ("designer", "generacion-seccion-web",
     "Genera solo el HTML de una sección 'hero' (título, subtítulo y botón de llamada) para la web de "
     "'Fontanería la Moderna', fontanería en Logroño con 4,8/5 en reseñas, sin inventar servicios, "
     "testimonios ni datos de contacto que no sean el teléfono 941251317. Máximo 25 líneas de HTML.", 400),
    ("auditor", "revision-contenido",
     "Revisa este texto de una web de fontanería y devuelve una lista corta de problemas concretos "
     "(errores, afirmaciones sin respaldo, incoherencias). Texto: 'Somos la mejor fontanería de España, "
     "con 50 años de experiencia y miles de clientes satisfechos. Llámanos al 941251317. Precios desde 10 €.' "
     "Responde solo con la lista, sin reescribir el texto.", 250),
    ("sales", "borrador-comercial-corto",
     "Escribe un borrador corto (máximo 80 palabras) de email comercial en español para Fontanería la Moderna "
     "(Logroño, sin web propia, 4,8/5 en reseñas), ofreciendo una web propia. Tono profesional y breve, sin "
     "prometer precios ni plazos concretos. No es un envío, solo un borrador.", 200),
]

out = []
for agent, task, prompt, max_tokens in TASKS:
    st, res, secs = chat(prompt, max_tokens)
    usage = res.get("usage", {}) if isinstance(res, dict) else {}
    content = ""
    try:
        content = res["choices"][0]["message"]["content"]
    except Exception:
        content = str(res)[:300]
    out.append({
        "agent": agent, "task": task, "model": MODEL, "provider": "top-tools-ai",
        "http": st, "latency_seconds": round(secs, 2),
        "prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
        "estimated_cost_usd": 0.0, "confirmed_cost_usd": None,
        "response": content,
    })
    print(f"{agent}/{task} http={st} latency={secs:.2f}s usage={usage}")
    print("  ->", content[:240].replace("\n", " "))
with open("/home/hatch/workspace/weblead-ai/fase-b/measurements-tta.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("OK, guardado fase-b/measurements-tta.json")
