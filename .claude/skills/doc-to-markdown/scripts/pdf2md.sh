#!/bin/bash
# pdf2md.sh — convierte un PDF a texto/markdown UTF-8 para leerlo barato (menos tokens).
# Motor: pdftotext -layout -enc UTF-8 (nativo, sin instalación, preserva acentos español).
# Uso:   bash pdf2md.sh "ruta/al/archivo.pdf" [salida.md]
# Si no se da salida, escribe junto al PDF con extensión .md.
# Salida a stdout del PATH generado + métricas de ahorro.

set -euo pipefail

SRC="${1:?Uso: pdf2md.sh <archivo.pdf> [salida.md]}"
if [ ! -f "$SRC" ]; then echo "ERROR: no existe '$SRC'" >&2; exit 1; fi

# Destino por defecto: mismo nombre, extensión .md, en .cache/doc2md/ junto al repo
DST="${2:-}"
if [ -z "$DST" ]; then
  base="$(basename "${SRC%.*}")"
  mkdir -p ".cache/doc2md"
  DST=".cache/doc2md/${base}.md"
fi

if ! command -v pdftotext >/dev/null 2>&1; then
  echo "ERROR: pdftotext no está instalado. Instalar poppler-utils." >&2
  echo "Fallback Python (si hay pdfplumber): python '$(dirname "$0")/pdf2md_fallback.py' '$SRC' '$DST'" >&2
  exit 2
fi

# Conversión: -layout preserva columnas/tablas, -enc UTF-8 salva acentos español
pdftotext -layout -enc UTF-8 "$SRC" "$DST"

# Métricas de ahorro
BIN=$(stat -c%s "$SRC" 2>/dev/null || stat -f%z "$SRC")
TXT=$(stat -c%s "$DST" 2>/dev/null || stat -f%z "$DST")
CHARS=$(wc -m < "$DST" | tr -d ' ')
TOK=$((CHARS / 4))

echo "OK → $DST"
echo "  PDF binario:     ${BIN} bytes"
echo "  Texto extraído:  ${TXT} bytes (${CHARS} chars, ~${TOK} tokens)"
echo "  Leé el .md con Read en vez del PDF: ahorro grande de tokens vs render visual del PDF."
