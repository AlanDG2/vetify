---
name: qa-continuous-learning
description: Ciclo de aprendizaje acumulativo del proyecto QA — cuándo documentar en lecciones-aprendidas.md, qué SÍ y qué NO documentar, y cuándo un patrón recurrente (3+ veces) se promueve a regla en CLAUDE.md / guía / POMs. Invocar al cerrar una automatización, al resolver un bloqueo que tomó tiempo, o al notar un patrón que se repite entre HUs.
---

# Sistema de Aprendizaje Continuo

> Ciclo de aprendizaje acumulativo del proyecto QA. Define qué documentar y cuándo un patrón recurrente se promueve a regla.

Este proyecto implementa un **ciclo de aprendizaje acumulativo** para mejorar la eficiencia con cada HU automatizada.

## Flujo de conocimiento:

```
HU nueva
  ↓
Leer lecciones-aprendidas.md (buscar problemas similares)
  ↓
Automatizar (aplicando aprendizajes previos)
  ↓
¿Encontré bloqueo/patrón nuevo?
  ↓ SÍ
Documentar en lecciones-aprendidas.md
  ↓
¿Es patrón recurrente? (3+ veces)
  ↓ SÍ
Actualizar CLAUDE.md o guia-casos-automatizacion.md
  ↓
Siguiente HU (más eficiente que la anterior)
```

## Qué documentar en `docs/lecciones-aprendidas.md`:

**✅ Documentar SIEMPRE**:
- Bloqueos que tomaron >15 min resolver
- Preguntas que se repiten en 2+ HUs
- Errores no obvios (comportamiento inesperado de UI/API)
- Workarounds para limitaciones de ambiente/herramientas
- Descubrimientos importantes de código existente (ej: método complejo ya implementado)

**❌ NO documentar**:
- Errores de sintaxis/typos obvios
- Problemas puntuales de red/conectividad
- Casos únicos sin patrón generalizable

## Cuándo actualizar otros documentos desde lecciones aprendidas:

**Si encuentro 3+ entradas similares en lecciones-aprendidas.md**:
1. Extraer el patrón común
2. Convertirlo en regla general
3. Agregarlo a:
   - `CLAUDE.md` → si es proceso/convención técnica
   - `guia-casos-automatizacion.md` → si es estrategia de testing
   - `docs/environments.md` → si es configuración de ambiente
   - POMs → si es patrón de código reutilizable
4. Marcar en lecciones-aprendidas.md que ya fue convertido en regla

## Beneficios del sistema:

✅ **Eficiencia creciente**: Cada HU es más rápida que la anterior
✅ **Menos preguntas repetidas**: Consulto la base de conocimiento primero
✅ **Onboarding más rápido**: Nuevos devs leen lecciones-aprendidas.md
✅ **Mejora continua del proceso**: Los patrones se vuelven reglas formales
✅ **Documentación viva**: Crece orgánicamente con uso real
