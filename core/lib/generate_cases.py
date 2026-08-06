#!/usr/bin/env python3
"""generate_cases.py — genera el esqueleto de tests.md desde una HU parseada.

Agnóstico del gestor de tickets. Toma el JSON de read_hu.py y produce un
tests.md con un caso por criterio de aceptación (CP01..CPNN), siguiendo la
convención de naming (CP## - Verbo + objetivo) y la estructura de pasos
(Acción + Datos + Resultado Esperado).

Esto es un ANDAMIO: produce un caso base por CA. El diseño real por riesgo
(cuántos casos, negativos, edge) lo guía la skill qa-risk-test-design, y el
refinamiento lo hace el QA. NO inventa datos ni resultados — deja marcadores
para rellenar.

Uso:  python read_hu.py HU.md | python generate_cases.py
      o:  python generate_cases.py <hu.json>
Salida: tests.md a stdout.
"""
import sys
import json

# Forzar UTF-8 en stdin/stdout/stderr (Windows usa cp1252 por defecto y rompe
# acentos/em-dash; stdin importa porque esta lib se usa en pipe: read_hu | generate_cases).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")


VERBOS = ["Validar", "Verificar", "Comprobar"]


def generate(hu):
    hid = hu.get("id") or "HU"
    title = hu.get("title") or ""
    criteria = hu.get("criteria") or []

    out = []
    out.append(f"# {hid} — Casos de prueba")
    if title:
        out.append(f"\n> HU: {title}")
    out.append("\n## Casos de Prueba\n")

    if not criteria:
        out.append("<!-- No se detectaron criterios de aceptación en la HU. "
                    "Revisar que la HU tenga una sección 'Criterios de aceptación', "
                    "o diseñar los casos a mano con la skill qa-risk-test-design. -->")
        return "\n".join(out)

    for i, ca in enumerate(criteria, 1):
        verbo = VERBOS[(i - 1) % len(VERBOS)]
        # Título: CP## - Verbo + (resumen del CA, recortado)
        resumen = ca[:70].rstrip(" .,:;")
        out.append(f"[CP{i:02d}]")
        out.append(f"[titulo]: {verbo} {resumen}")
        out.append(f"[Criterios de Aceptación Cubiertos]:")
        out.append(f"- CA{i}: {ca}")
        out.append(f"[Datos de Prueba]: <!-- EJEMPLO: la data concreta que necesita este caso (generada dinámicamente, no seed fijo) -->")
        out.append("")
        out.append(f"[Paso 1]:")
        out.append(f"[Accion]: <!-- EJEMPLO: la acción exacta del usuario/sistema -->")
        out.append(f"[Datos]: <!-- EJEMPLO: los valores de entrada -->")
        out.append(f"[Resultado Esperado]: <!-- EJEMPLO: el resultado observable y verificable (texto exacto del mensaje, status code, estado de BD) -->")
        out.append("")

    out.append("<!-- ANDAMIO generado: 1 caso base por CA. Antes de cargar: -->")
    out.append("<!-- 1. Aplicar qa-risk-test-design (¿faltan negativos/edge por riesgo?). -->")
    out.append("<!-- 2. Rellenar los marcadores EJEMPLO con datos/resultados reales. -->")
    out.append("<!-- 3. Auditar con qa-testcase-auditor (gate GO/NO-GO) antes de cargar. -->")
    return "\n".join(out)


def main():
    if len(sys.argv) >= 2:
        with open(sys.argv[1], encoding="utf-8") as f:
            hu = json.load(f)
    else:
        hu = json.load(sys.stdin)
    print(generate(hu))


if __name__ == "__main__":
    main()
