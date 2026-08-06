#!/usr/bin/env python3
"""format_bug.py — formatea un hallazgo en un bug report estructurado (Markdown).

Agnóstico del gestor de tickets. Produce el .md del bug siguiendo la estructura
universal de la skill qa-bug-report. El registro en un gestor (createDefect) lo
hace el adaptador activo; con `none`, el .md queda en docs/bugs/ y nada más.

Uso:  python format_bug.py <bug.json>
  donde bug.json = {prefix, symptom, screen, severity, category, hu, steps[],
                    expected, actual, notes}
Salida: el bug en Markdown a stdout.
"""
import sys
import json

# Forzar UTF-8 en stdout/stderr (Windows usa cp1252 por defecto y rompe acentos/em-dash).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def format_bug(b):
    prefix = b.get("prefix", "DEFECT")  # DEFECT | BUG
    symptom = b.get("symptom", "<síntoma>")
    screen = b.get("screen", "<pantalla/componente>")
    titulo = f"{prefix} | {symptom} en {screen}"[:80]

    out = []
    out.append(f"# {titulo}\n")
    out.append(f"**Severidad:** {b.get('severity', '<Alto/Medio/Bajo>')} — {b.get('severity_reason', '<justificación 1 línea>')}")
    out.append(f"**Categoría:** {b.get('category', '<Typo/Divergencia/Validación/Flujo/Performance/Accesibilidad/Backend>')}")
    out.append(f"**HU relacionada:** {b.get('hu', 'N/A')}")
    out.append("")
    out.append("## Información del entorno")
    env = b.get("env", {})
    out.append(f"- SO: {env.get('os', '<SO>')}")
    out.append(f"- Navegador/App: {env.get('browser', '<navegador>')}")
    out.append(f"- Ambiente: {env.get('url', '<ambiente-URL>')}")
    out.append(f"- Usuario: {env.get('user', '<rol o fixture, SIN password>')}")
    out.append(f"- Versión: {env.get('version', '<fecha>')}")
    out.append(f"- Adjuntos: {env.get('attachments', '<snapshot / screenshot / video>')}")
    out.append("")
    out.append("## Descripción")
    out.append(b.get("description", "<qué se observa / por qué es defecto / impacto>"))
    out.append("")
    out.append("## Pasos para reproducir")
    steps = b.get("steps") or ["<paso 1>"]
    for i, s in enumerate(steps[:6], 1):
        out.append(f"{i}. {s}")
    out.append("")
    out.append(f"**Resultado esperado:** {b.get('expected', '<según la HU>')}")
    out.append(f"**Resultado actual:** {b.get('actual', '<lo observado, texto exacto si es UI>')}")
    out.append("")
    # Tabla CP de evidencia (si el bug viene de un spec)
    cp = b.get("cp_evidence")
    if cp:
        out.append("## Evidencia (CP)")
        out.append("| CP | Condición | Esperado | Recibido |")
        out.append("| --- | --- | --- | --- |")
        for row in cp:
            out.append(f"| {row.get('cp','')} | {row.get('cond','')} | {row.get('exp','')} | {row.get('got','')} |")
        if b.get("spec_ref"):
            out.append(f"\n_Spec: {b['spec_ref']}_")
        out.append("")
    if b.get("notes"):
        out.append("## Notas adicionales")
        out.append(b["notes"])
    return "\n".join(out)


def main():
    if len(sys.argv) < 2:
        print("Uso: python format_bug.py <bug.json>", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        bug = json.load(f)
    print(format_bug(bug))


if __name__ == "__main__":
    main()
