---
name: doc-to-markdown
description: Convierte un PDF (HU, spec, documento) a texto/Markdown UTF-8 ANTES de leerlo, para gastar muchos menos tokens que leyendo el PDF directo. Invocar cuando vayas a leer un .pdf — especialmente las HUs en docs/user-stories/*.pdf. Usa pdftotext (nativo, preserva acentos español); fallback pdfplumber para tablas.
---

# doc-to-markdown — leer PDFs barato

> **Por qué existe**: leer un `.pdf` directo con la tool Read lo procesa como documento renderizado (costoso en tokens — cada página ≈ 1500-3000 tokens visuales). Convertirlo antes a texto plano cuesta una fracción. Medido en el repo: `LIST.1.2 Agregar columna de puntaje.pdf` = 540 KB binarios → **7.6 KB de texto (~1900 tokens)**, totalmente legible y con acentos correctos.

## Cuándo invocar

- Vas a leer cualquier `.pdf` — sobre todo las **HUs en `docs/user-stories/*.pdf`** (hay 29).
- Necesitás el contenido textual de un PDF (HU, spec, documento de diseño) para razonar sobre él, NO su layout visual exacto.

**Cuándo NO**: si necesitás ver el PDF como imagen (diagramas, capturas, evidencia visual donde el layout importa) → leelo con Read directo. Esta skill es para **contenido textual**.

## Cómo usar

### 1. Convertir (motor principal: pdftotext, ya instalado)

```bash
bash .claude/skills/doc-to-markdown/scripts/pdf2md.sh "docs/user-stories/LIST.1.2. Agregar columna de puntaje.pdf"
```

Esto escribe el `.md` en `.cache/doc2md/<nombre>.md` y reporta el ahorro. El flag clave es `-enc UTF-8` (preserva `á é í ó ú ñ` — sin él los acentos salen rotos, crítico para HUs en español). `-layout` preserva columnas/tablas.

Pasar un destino explícito si querés:
```bash
bash .claude/skills/doc-to-markdown/scripts/pdf2md.sh "ruta/al.pdf" "salida.md"
```

### 2. Leer el .md generado (no el PDF)

```
Read .cache/doc2md/<nombre>.md
```

### 3. Fallback para tablas complejas

Si `pdftotext -layout` corta mal una tabla (columnas desalineadas), usar pdfplumber:
```bash
python .claude/skills/doc-to-markdown/scripts/pdf2md_fallback.py "ruta/al.pdf"
```
(Requiere `pdfplumber` — ya disponible en el entorno del repo.)

## Reglas

- **Siempre `-enc UTF-8`** — el script ya lo hace. No usar `pdftotext` crudo sin ese flag en HUs en español.
- El `.md` generado va a `.cache/doc2md/` (gitignored — es artefacto derivado, no fuente). NO commitearlo.
- El PDF original es la fuente de verdad; el `.md` es una vista para leer barato. Si dudás de algo, volver al PDF.
- No borrar el PDF original.

## Notas de entorno

- `pdftotext` viene de `poppler-utils`. En este entorno (`/mingw64/bin/pdftotext`) ya está.
- `markitdown` y `pandoc` NO están instalados — por eso el motor es pdftotext, que cubre el caso (texto de HUs) sin instalar nada.
- Para `.docx` (ej. notas de demo): pandoc sería ideal pero no está; alternativa = abrir con la skill `anthropic-skills:docx` del harness si el contenido textual es lo que importa.
