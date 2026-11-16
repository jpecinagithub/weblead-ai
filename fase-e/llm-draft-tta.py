"""Borrador LLM Fase E WebLead AI: cuerpo del correo comercial para la
empresa de prueba (fixture sintética, nunca una empresa real).

Auth: credencial registrada custom.top-tools-ai vía dynamic_credentials
(mismo mecanismo que Fase D). Solo modelo Top-Tools-Ai-Basic (tier gratuito
verificado). No se llama a Pro/Max ni a ningún modelo PAYG.
Coste: la API devuelve tokens, no precio -> estimado 0,00 USD, confirmado null.
El borrador NO es un envío: el texto se valida contra afirmaciones
prohibidas (precios, horarios, testimonios, servicios no contrastados,
años de experiencia, superlativos, urgencias 24h) y si se rechaza se usa
el texto determinista del Sales Agent. El borrador queda como EmailDraft
LOCAL en Postgres; Gmail sigue sin conectar.
Uso: python3 llm-draft-tta.py  (escribe fase-e/llm-draft-tta.json)
"""
import json, time, urllib.request, urllib.error, sys, re
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

FORBIDDEN = [r"€\s?\d|\d+\s?€", r"24\s?h", r"la mejor|líder", r"años de experiencia",
             r"testimonio|miles de clientes", r"garantiz"]
PROMPT = (
    "Escribe en español el cuerpo de un correo comercial corto (máximo 90 palabras) "
    "de WebLead AI para una empresa ficticia de prueba de fontanería en Logroño, "
    "para presentarle una demo conceptual de su web (propuesta no oficial, pendiente "
    "de su autorización). No inventes: PROHIBIDO precios, horarios, servicios "
    "concretos, años de experiencia, testimonios, clientes, certificaciones, "
    "superlativos ('la mejor', 'líder') o urgencias 24h. Termina ofreciendo la demo "
    "sin compromiso. No incluyas asunto, solo el cuerpo."
)
st, res, secs = chat(PROMPT, 300)
usage = res.get("usage", {}) if isinstance(res, dict) else {}
content = ""
try:
    content = res["choices"][0]["message"]["content"]
except Exception:
    content = str(res)[:300]
violations = [p for p in FORBIDDEN if re.search(p, content, re.I)]
out = [{
    "slug": "verificacion-fase-e-empresa-de-prueba",
    "agent": "sales", "task": "sales-draft",
    "model": MODEL, "provider": "top-tools-ai", "http": st,
    "latency_seconds": round(secs, 2),
    "prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
    "total_tokens": usage.get("total_tokens"),
    "estimated_cost_usd": 0.0, "confirmed_cost_usd": None,
    "response": content,
    "forbidden_violations": violations,
    "accepted": len(violations) == 0,
}]
print(f"http={st} latency={secs:.2f}s usage={usage} violations={violations}")
print("  ->", content[:300].replace("\n", " | "))
with open("/home/hatch/workspace/weblead-ai/fase-e/llm-draft-tta.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("OK, guardado fase-e/llm-draft-tta.json")
