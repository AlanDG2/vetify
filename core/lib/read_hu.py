#!/usr/bin/env python3
"""read_hu.py — lee una HU (Markdown) y extrae sus Criterios de Aceptación.

Agnóstico del gestor de tickets: trabaja sobre un archivo HU.md local. Si el
proyecto enchufa un adaptador con fetchStory(), ese adaptador produce el HU.md
antes; esta lib solo lo parsea.

Uso:  python read_hu.py <ruta/HU.md>
Salida: JSON con {id, title, story, criteria[]} a stdout.
"""
import sys
import re
import json
import os

# Forzar UTF-8 en stdout/stderr (Windows usa cp1252 por defecto y rompe acentos/em-dash).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def parse_hu(text):
    """Extrae id, título, historia y criterios de aceptación de un HU.md."""
    lines = text.splitlines()
    result = {"id": None, "title": None, "story": None, "criteria": []}

    # Título: primer heading "# <ID> — <título>" o "# <título>"
    for ln in lines:
        m = re.match(r"^#\s+(.+)", ln)
        if m:
            head = m.group(1).strip()
            # ¿hay un id tipo ABC-123 al inicio?
            mid = re.match(r"^([A-Z][A-Z0-9]*-\d+)\s*[—:-]?\s*(.*)", head)
            if mid:
                result["id"] = mid.group(1)
                result["title"] = mid.group(2).strip() or head
            else:
                result["title"] = head
            break

    # Historia: bloque "Como / Quiero / Para" o sección "Historia de usuario"
    story_match = re.search(
        r"(?:\*\*Como\*\*|Como)\b.*?(?:\*\*Para\*\*|Para)\b[^\n]*", text, re.DOTALL | re.IGNORECASE
    )
    if story_match:
        result["story"] = re.sub(r"\s+", " ", story_match.group(0)).strip()

    # Criterios de aceptación: items bajo una sección "Criterios de aceptación"
    in_ca = False
    for ln in lines:
        if re.match(r"^#{1,4}\s+Criterios? de aceptaci[oó]n", ln, re.IGNORECASE):
            in_ca = True
            continue
        if in_ca:
            if re.match(r"^#{1,4}\s+", ln):  # siguiente sección → fin
                break
            # item: "- CA1: ..." / "1. ..." / "- ..."
            m = re.match(r"^\s*(?:[-*]|\d+\.)\s*(?:CA\d+[:.]?\s*)?(.+)", ln)
            if m and m.group(1).strip():
                result["criteria"].append(m.group(1).strip())

    return result


def main():
    if len(sys.argv) < 2:
        print("Uso: python read_hu.py <ruta/HU.md>", file=sys.stderr)
        sys.exit(1)
    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"ERROR: no existe '{path}'", file=sys.stderr)
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        hu = parse_hu(f.read())
    if not hu["criteria"]:
        print("ADVERTENCIA: no se encontraron criterios de aceptación. ¿Tiene la HU una sección 'Criterios de aceptación'?", file=sys.stderr)
    print(json.dumps(hu, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
