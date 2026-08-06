---
name: qa-mcp-vs-pom
description: Guía de decisión para elegir entre explorar con MCP Playwright (browser_*) o leer un POM existente directamente, al empezar a automatizar una pantalla o flujo. Invocar al decidir cómo abordar una HU nueva sobre funcionalidad parcial o totalmente nueva.
---

# ¿Cuándo usar MCP vs leer POMs directamente?

> Guía de decisión: explorar con MCP de navegador vs leer un POM existente, agnóstica del proyecto.

## Usar MCP Exploration (`mcp__playwright__browser_*`) cuando:

✅ **Explorar una pantalla completamente nueva** — no existe POM ni nadie ha mapeado los locators
✅ **Descubrir estados dinámicos** — necesitas interactuar (click, fill) para ver qué elementos aparecen
✅ **Validar comportamiento real** — la HU describe algo pero quieres confirmar cómo funciona en el ambiente
✅ **Mapear elementos visuales complejos** — tablas dinámicas, dropdowns con búsqueda, drag & drop zones

**Ejemplo (genérico)**: al automatizar una pantalla de listado por primera vez, se usa MCP para descubrir el modal de creación, las opciones de un dropdown dinámico, y comportamientos condicionales (botones que se deshabilitan según estado) que la HU no detalla a nivel de DOM.

## Leer POMs directamente (Read tool) cuando:

✅ **El POM ya existe** — antes de agregar cualquier funcionalidad
✅ **Entender flujos implementados** — ver cómo se resolvieron problemas similares
✅ **Identificar métodos/locators reutilizables** — evitar duplicación
✅ **Planear extensiones** — saber qué ya está y qué falta

**Ejemplo (genérico)**: para una HU sobre una pantalla ya cubierta por un POM, PRIMERO leer ese POM completo para ver:
- Qué locators ya existen (constructor)
- Qué métodos atómicos hay (clicks, fills, validaciones)
- Si hay un método de flujo compuesto que cubra parte del caso
- Luego decidir qué agregar vs qué reutilizar

## Flujo híbrido recomendado:

Para una HU nueva sobre funcionalidad parcialmente cubierta:

1. **Leer** el POM existente completo
2. **Identificar** qué cubre y qué falta
3. **Usar MCP** solo para explorar las partes nuevas que no están en el POM
4. **Extender** el POM con los nuevos locators/métodos
5. **Escribir** el spec combinando métodos existentes + nuevos

> 🔗 El **cómo** construir/extender el POM (checklist, regla "extender nunca romper", workflow MCP→snapshot→locators) vive en la skill [`qa-pom-authoring`](../qa-pom-authoring/SKILL.md).
