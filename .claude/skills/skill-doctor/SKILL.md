---
name: skill-doctor
description: Audita la calidad de las skills del cerebro — frontmatter válido, description que dispara bien, cuerpo que enseña (no hueco), 0 punteros rotos, registrada en el mapa. Emite PASS / NEEDS_ATTENTION / CRITICAL por skill. Invocar tras crear o adaptar una skill, o al revisar la salud del cerebro completo.
---

# skill-doctor — linter de skills del cerebro

Audita una skill (o todas) contra un checklist de calidad y emite un veredicto. Complementa a `skill-creator`: creás con una, validás con la otra.

## Qué audita (checklist)

### 1. Frontmatter
- [ ] Tiene bloque `---` con `name` y `description`.
- [ ] `name` coincide con el nombre de la carpeta (kebab-case).
- [ ] `description` dice **qué hace + CUÁNDO invocarla** (el trigger). Una `description` sin "cuándo" = la skill no se autoinvoca bien.
- [ ] `description` no es genérica ("ayuda con tests") — específica al disparador real.

### 2. Cuerpo (que enseñe, no hueco)
- [ ] Tiene principio + procedimiento, no solo un título.
- [ ] Si vació ejemplos de un proyecto, dejó **marcadores `<!-- EJEMPLO: ... -->`** que enseñan qué va ahí (no borró el ejemplo dejando el hueco).
- [ ] Los pasos/checklists están completos (no "TODO" sueltos sin contexto).

### 3. Referencias y punteros
- [ ] Los links a otras skills (`../otra/SKILL.md`) resuelven a archivos que existen.
- [ ] Los `references/*.md` o `scripts/` que menciona existen.
- [ ] No referencia archivos/secciones que se movieron o no están en este template.

### 4. Registro
- [ ] La skill está listada en el mapa de `CLAUDE.md`.
- [ ] No hay skills en `.claude/skills/` que falten en el mapa (huérfanas), ni filas en el mapa sin skill (punteros rotos).

### 5. Higiene
- [ ] Cero secretos/credenciales/URLs reales en el SKILL.md.
- [ ] No duplica el contenido de otra skill (si se solapan, una referencia a la otra, no copia).
- [ ] Stack-agnóstica si es del cerebro universal; si es stack-specific, está claro a qué stack aplica.

## Veredicto

Por cada skill auditada, emitir:
- **✅ PASS** — cumple todo el checklist.
- **⚠️ NEEDS_ATTENTION** — fallas menores (description mejorable, ejemplo sin marcador, falta una fila en el mapa). Usable pero conviene arreglar.
- **🔴 CRITICAL** — fallas que rompen: frontmatter inválido, puntero roto, skill huérfana del mapa, secreto filtrado, cuerpo hueco que no enseña.

## Cómo correrlo

**Una skill:** leer su SKILL.md + cruzar contra el checklist + reportar veredicto.

**Todo el cerebro (barrido):**
```bash
# skills en disco vs mapa de CLAUDE.md → detectar huérfanas / punteros rotos
ls .claude/skills/
grep -oE '`[a-z-]+`' CLAUDE.md   # las que el mapa menciona
# punteros entre skills rotos
grep -rn "\.\./.*SKILL.md" .claude/skills/   # verificar que cada destino exista
# secretos
grep -rniE "password|api.?token|secret|https?://[a-z0-9.-]+\.(com|net|io)" .claude/skills/ | grep -viE "process.env|ejemplo|placeholder|<.*>|tu-"
```

## Reglas duras

- Un veredicto **CRITICAL** bloquea: no dar por buena una skill con frontmatter inválido, puntero roto o secreto filtrado.
- No inflar el veredicto: si una skill quedó hueca tras vaciarla, es CRITICAL (no enseña), no PASS.
- Tras adaptar una skill externa, correr skill-doctor antes de registrarla en el mapa.
