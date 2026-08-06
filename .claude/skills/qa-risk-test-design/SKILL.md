---
name: qa-risk-test-design
description: Playbook de diseño de casos de prueba basado en riesgo (impacto×probabilidad), cobertura mínima por nivel de riesgo, selección combinatoria pairwise/3-way sin explosión, estructura obligatoria del caso (Dado/Cuando/Entonces + datos concretos + oráculo de error) y checklist de salida. Basado en NIST combinatorial testing + ISTQB. Invocar al planear cuántos y qué casos de prueba diseñar para una HU/CA, antes de escribir tests.md.
---

# QA CoE — Diseño de casos de prueba basado en riesgo

> **Origen**: metodología tool-agnóstica basada en NIST combinatorial testing + ISTQB. Define el diseño de casos basado en riesgo, independiente del gestor de tickets o del pipeline de carga.

Método repetible para diseñar casos de prueba desde una HU, reducir escapes de defectos y evitar la explosión de permutaciones. **No genera los TCs** (eso lo hace el generador de casos de tu pipeline de carga, si lo tenés); esta skill define **cuántos y de qué tipo** diseñar.

## 1) Principio base

- Todo parte de la HU: criterios de aceptación + contrato + comentarios técnicos.
- Si la HU está incompleta → generar advertencias y reducir alcance (no inventar).

## 2) Riesgo práctico por HU

`riesgo = impacto × probabilidad`

- **Impacto**: 1 bajo, 2 medio, 3 alto.
- **Probabilidad**: 1 baja, 2 media, 3 alta.
- **Clasificación**: 1-2 = **bajo**; 3-4 = **medio**; 6-9 = **alto**.

Señales de scoring:
- **Impacto alto**: afecta dinero, estado de negocio, datos persistidos, integraciones críticas, compliance.
- **Probabilidad alta**: cambio reciente, lógica condicional compleja, historial de defectos, múltiples parámetros.

## 3) Cobertura mínima por nivel de riesgo

- **Bajo**: 1 feliz + 1 borde/negativo (si el contrato lo permite).
- **Medio**: 1 feliz + 2 negativos/borde.
- **Alto**: 1 feliz + 3 o más (incluyendo validaciones de integración/evento/BD).

## 4) Combinaciones (sin explosión)

- NO producto cartesiano completo.
- Selección combinatoria por riesgo:
  - Base: **pairwise (2-way)** para parámetros relevantes.
  - Escalar a **3-way solo** para riesgo alto o incidentes previos.
- Límite inicial recomendado: **2-3 combinaciones positivas por HU + negativos críticos.**

## 5) Reglas de selección de escenarios

- Siempre incluir: happy path contractual; campo requerido ausente; formato/rango/enum inválido.
- En APIs con eventos/persistencia: validar **status + schema + evento + BD**.
- Seguridad en este flujo: smoke only (input inválido obvio, rechazo correcto); la seguridad profunda va en un flujo especializado.

## 6) Estructura obligatoria del caso

- **Título**: `CP## - Verbo + objetivo verificable` (verbos: Validar/Verificar/Comprobar — ver naming policy en `references/`).
- **Trazabilidad obligatoria**: referencia al criterio de aceptación (`AC-1`, `AC-2`, …) + referencia a la fuente técnica usada (comentario Jira, tabla de contrato, schema).
- **3 pasos**: `Dado` (precondición + datos) / `Cuando` (acción exacta) / `Entonces` (resultado de negocio).
- **Datos de prueba concretos**: definir payload/inputs de ejemplo por caso; evitar "datos válidos" ambiguos sin valores.
- **Esperado técnico**: status code; response body/schema; evento (si aplica); persistencia BD (si aplica).
- **Para negativos, oráculo de error mínimo**: `error_code` (si está en contrato); `message`/texto equivalente; `field` afectado cuando aplique.
- **Criterio de verificación binario**: Evento → `debe existir`/`no debe existir`; BD → `debe existir`/`no debe existir`.

## 7) Ejemplo aplicado (HU periodicidad)

Parámetros relevantes: `timeUnit` (SECONDS/MINUTES/HOURS/DAYS/MONTHS), `status` (ACTIVE/INACTIVE o default), `description` (opcional). Selección recomendada (no exhaustiva):
- **Positivo 1**: `timeUnit=SECONDS`, `status` omitido (default), `description` presente.
- **Positivo 2**: `timeUnit=MINUTES`, `status=INACTIVE`, `description` omitido.
- **Negativo 1**: falta `name` (requerido).
- **Negativo 2**: `expression` inválida (regex/cron).

## 8) Checklist de salida antes de publicar

- ¿Cada caso tiene Dado/Cuando/Entonces?
- ¿Contradicciones semánticas entre pasos y expected?
- ¿Se usó contrato/comentarios cuando existen?
- ¿Al menos 1 feliz y 1 negativo/borde?
- ¿Duplicados por intención?
- ¿Cada caso tiene datos de prueba concretos?
- ¿Cada caso tiene trazabilidad a AC y contrato?
- ¿Los negativos tienen oráculo de error estructurado?
- ¿Evento/BD se validan en términos binarios (existe/no existe)?
- ¿Se pidió aprobación explícita al usuario? (vista previa + OK antes de cargar los casos al gestor de tickets, si el proyecto lo usa)

## Referencias base

- NIST combinatorial testing overview + NIST ACTS + NIST interactions-in-failures.
- ISTQB CTFL Syllabus v4.0.1.
- Convención de nombres de TC: `references/naming-policy.json` (CP## + verbos Validar/Verificar/Comprobar, scope per-HU).
