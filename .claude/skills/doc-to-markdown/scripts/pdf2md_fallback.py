#!/usr/bin/env python3
"""pdf2md_fallback.py — fallback de conversión PDF→Markdown con pdfplumber.

Usar SOLO si pdftotext no está disponible o si el PDF tiene tablas que
pdftotext -layout corta mal. pdfplumber extrae tablas como markdown.

Uso: python pdf2md_fallback.py <archivo.pdf> [salida.md]
"""
import sys
import os


def main():
    if len(sys.argv) < 2:
        print("Uso: python pdf2md_fallback.py <archivo.pdf> [salida.md]", file=sys.stderr)
        sys.exit(1)

    src = sys.argv[1]
    if not os.path.isfile(src):
        print(f"ERROR: no existe '{src}'", file=sys.stderr)
        sys.exit(1)

    base = os.path.splitext(os.path.basename(src))[0]
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(".cache", "doc2md", base + ".md")
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)

    try:
        import pdfplumber
    except ImportError:
        print("ERROR: pdfplumber no instalado. pip install pdfplumber", file=sys.stderr)
        sys.exit(2)

    parts = []
    with pdfplumber.open(src) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            parts.append(f"\n<!-- Página {i} -->\n")
            text = page.extract_text() or ""
            parts.append(text)
            # Tablas como markdown
            for tbl in page.extract_tables():
                if not tbl:
                    continue
                rows = [[(c or "").replace("\n", " ").strip() for c in row] for row in tbl]
                if rows:
                    parts.append("\n| " + " | ".join(rows[0]) + " |")
                    parts.append("| " + " | ".join("---" for _ in rows[0]) + " |")
                    for r in rows[1:]:
                        parts.append("| " + " | ".join(r) + " |")
                    parts.append("")

    out = "\n".join(parts)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(out)

    chars = len(out)
    print(f"OK → {dst}")
    print(f"  Texto extraído: {chars} chars (~{chars // 4} tokens)")


if __name__ == "__main__":
    main()
