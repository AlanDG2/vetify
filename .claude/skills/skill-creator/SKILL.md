---
name: skill-creator
description: Cómo crear una skill nueva del cerebro QA, o adaptar una skill/regla externa (el patrón "tomar lo mejor y ajustarlo"). Cubre cuándo conviene una skill vs una regla en CLAUDE.md, la estructura de un SKILL.md, y cómo integrar algo externo sin duplicar ni romper lo que ya existe. Invocar cuando aparece una necesidad recurrente que no cubre ninguna skill, o cuando querés incorporar una idea de una fuente externa.
---

# skill-creator — crear y adaptar skills del cerebro

Esta es una **meta-skill**: enseña a extender el propio cerebro. Un proyecto que clona el template no se queda con las skills que vienen — puede crear las suyas cuando el trabajo real lo pida, o adaptar lo bueno de fuentes externas (como se hace con un humanizer, un linter, una convención ajena).

## Parte A — ¿Skill nueva o regla en CLAUDE.md?

Antes de crear una skill, decidir dónde va el contenido:

| Va en CLAUDE.md (siempre visible) | Va en una skill (on-demand) |
|---|---|
| Una **regla** de comportamiento que aplica casi siempre (concisión, DoD, data dinámica) | Un **procedimiento multi-paso** que solo se usa en cierto disparador |
| Algo corto y crítico que no puede "esconderse" | Algo largo (checklist, workflow, árbol de decisión) que gasta tokens si se carga siempre |
| Un hecho/convención de arquitectura | Una guía de "cómo hacer X" que se invoca al hacer X |

> Regla práctica: si la pieza es un **workflow que se dispara en un momento concreto** → skill. Si es una **regla que rige cada respuesta** → CLAUDE.md. No trocear de más: pocas skills bien hechas > muchas huecas.

## Parte B — Crear una skill nueva

1. **Carpeta:** `.claude/skills/<nombre-kebab>/SKILL.md`. Nombre claro, con prefijo de familia si aplica (`qa-...`).
2. **Frontmatter obligatorio** (lo único que se precarga en cada sesión — que sea preciso):
   ```yaml
   ---
   name: <nombre-kebab>
   description: <qué hace + CUÁNDO invocarla>. El "cuándo" es lo que dispara la carga automática — sé explícito con el trigger.
   ---
   ```
3. **Cuerpo:** principio primero, luego el procedimiento. Conserva ejemplos que enseñen; si el ejemplo es específico de un proyecto, usá un marcador `<!-- EJEMPLO: qué va aquí -->` para que la skill enseñe el QUÉ sin atar el CÓMO.
4. **Referencias pesadas** → `references/*.md` o `scripts/`, que cargan solo cuando se necesitan (progressive disclosure).
5. **Registrar** en el mapa de skills de `CLAUDE.md` (y en `AGENTS.md` si lleva inventario). El mapa lista SOLO skills que existen como archivo — agregá la fila al crearla, no antes.
6. **Validar** con la skill `skill-doctor` antes de darla por buena.

## Parte C — Adaptar una skill/idea externa (patrón "tomar lo mejor")

Cuando ves algo útil en un repo/skill externa (un humanizer, un linter, una convención de otro equipo), NO lo copies entero. Filtrá:

1. **Leer la fuente real** (no asumir por el nombre). Entender qué hace de verdad.
2. **Quedarte solo con lo que aporta algo que NO tenés.** Si ya está cubierto, descartar — no duplicar.
3. **Quitar lo que choca con tus reglas.** Ej.: una skill externa que comprime texto de forma lossy choca con un DoD que exige texto completo → se descarta esa parte. Una que pide quitar emojis choca con el uso funcional de ✅/⚠️/🔴 → se descarta.
4. **Re-apuntar el acoplamiento.** Si la fuente asume un gestor/stack concreto (ADO, un cliente Jira hardcodeado), re-apuntarlo a tu interfaz/abstracción.
5. **Integrar sin romper.** Si extiende una regla existente, sumá un sub-bloque a esa regla en vez de crear una skill nueva que compita. Marcá el origen.
6. **Registrar la decisión** en `qa-workspace/decision-log.md`: qué se evaluó, qué se tomó, qué se descartó y por qué. Así queda claro y no se re-evalúa lo mismo dos veces.

> Ejemplo del patrón (real): de un "humanizer" externo se tomaron 4 reglas anti-"olor a IA" para prosa human-facing, se descartaron ~26 irrelevantes y las de voice-calibration/anti-emoji que chocaban, y se integraron como sub-bloque de la regla de concisión existente — sin instalar el repo ni crear una skill nueva.

## Reglas duras

- El `description` del frontmatter es lo que más importa: define cuándo se carga. Mal `description` = skill que nunca se invoca o se invoca de más.
- No crear una skill por estética/simetría. Solo si hay una necesidad recurrente real que no cubre nada.
- Cero secretos/credenciales en una skill (van en `.env`/config local).
- Toda skill nueva o adaptada → registrada en el mapa + validada con `skill-doctor` + decisión en el decision-log.
