"""Medición Fase A WebLead AI: 4 expedientes reales con Top Tools AI (modelo Top-Tools-Ai-Basic).
Auth: credencial registrada custom.top-tools-ai vía dynamic_credentials (mismo mecanismo que el helper).
No hay claves en este archivo. Coste: el modelo Basic es el tier gratuito del proveedor (10M tokens/día
según la documentación del conector); la API no devuelve precio, solo usage en tokens.
Uso: python3 cost-measure-taa.py  (escribe resultados en cost-measure-tta.json)"""
import json, sys, urllib.request, urllib.error
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response
BASE = "https://top-tools-ai.com/api/v1"
MODEL = "Top-Tools-Ai-Basic"
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise RuntimeError("redirect refused")
def chat(prompt):
    body = {"model": MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 200}
    data = json.dumps(body).encode()
    r = urllib.request.Request(BASE + "/chat/completions", data=data, method="POST")
    r.add_header("Content-Type", "application/json")
    add_surrogate_to_request(r, "custom.top-tools-ai", allowed_hosts=["top-tools-ai.com"])
    try:
        with urllib.request.build_opener(NoRedirect()).open(r, timeout=90) as resp:
            return resp.status, read_json_response(resp)
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode(errors="replace")[:500]}
EXPEDIENTES = [
 ("Fontanería la Moderna", "Logroño. Sin web propia (verificado 2026-11-16). Teléfono 941251317. Valoración 4,8/5 con 5 reseñas. Score 85/100."),
 ("Santiago Ferrer Fontanería en General SL", "Logroño. Sin web propia (verificado 2026-11-16). Teléfono 941227157, email sanfefo@terra.com. 10 empleados, constituida 1994. Score 100/100."),
 ("Lumberjack Barbershop", "Logroño. Sin web propia; solo Instagram y reservas en Booksy/Yeasy (verificado 2026-11-16). Teléfono 941760684. 335 reseñas en Booksy, 5,0/5. Score 85/100."),
 ("Star Barber Shop", "Logroño. Sin web propia (verificado 2026-11-16). Teléfono 641216748. Reseñas fechadas 2026-01-20 y 2025-11-20. Score 90/100."),
]
out = []
for name, facts in EXPEDIENTES:
    prompt = ("Resume en 3 frases el siguiente expediente para una agencia web que vende webs a negocios locales. "
              f"Negocio: {name}. {facts} Recomendación: crear web propia.")
    st, res = chat(prompt)
    usage = res.get("usage", {}) if isinstance(res, dict) else {}
    content = ""
    try:
        content = res["choices"][0]["message"]["content"]
    except Exception:
        content = str(res)[:300]
    out.append({"negocio": name, "modelo": MODEL, "http": st,
                "prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"), "resumen": content})
    print(name, "http=", st, "usage=", usage)
    print("  ->", content[:220].replace("\n", " "))
with open("/home/hatch/workspace/weblead-ai/fase-a/cost-measure-tta.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("OK, guardado cost-measure-tta.json")
