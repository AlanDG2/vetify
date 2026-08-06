---
name: qa-testcase-auditor
description: Audita la calidad y cobertura de los CPs de un tests.md antes de cargarlos al gestor de tickets — detecta gaps, duplicados, casos genéricos, negativos sin oráculo de error y evidencias faltantes; emite veredicto GO / GO CON OBSERVACIONES / NO GO. Invocar como gate de calidad ANTES de la carga, o al revisar un tests.md generado.
---

# Auditor de Calidad de Test Cases

> **Agnóstico del gestor de tickets.** Audita un `tests.md` (CPs `CP01..CPNN`) contra la HU **antes** de cargarlo a un gestor (si lo hay). La carga la hace la lógica de pipeline (`core/lib`) vía la **interfaz de adaptador** (`importTests`), nunca esta skill. Checklist y reglas GO/NO-GO universales.

Es un gate de calidad que complementa el **pre-flight de Tests previos** (verificar si la HU ya tiene tests vinculados vía `listLinkedTests` del adaptador antes de cargar — re-cargar duplica).

> ⚠️ **No carga nada desde esta skill.** Solo audita y lista hallazgos. La carga la hace el pipeline tras tu OK explícito. Con adaptador `none`, no hay carga: el `tests.md` queda local.

## Inputs

| Input | Default | Uso |
|---|---|---|
| `hu_path` | requerido | `HU.md` — la HU con CAs (contrato esperado). |
| `testcase_path` | requerido | `tests.md` — los CPs a auditar. |
| `focus` | vacío | CA o endpoint puntual si se audita solo una parte. |
| `output_path` | opcional | Markdown de auditoría si se pide materializar; si no, responder inline. |
| `approval_target` | `carga al gestor de tickets` | Artefacto que recibirá GO/NO-GO. |

## Workflow

1. **Resolver fuentes y alcance** — leer `HU.md` + `tests.md`; filtrar por `focus` si se indica.
2. **Inventariar contrato esperado** — de la HU + comentarios del ticket: CAs, endpoints/pantallas, payloads, params, status codes, errores, reglas de negocio, BD, eventos, seguridad. Usar el checklist abajo.
3. **Inventariar cobertura real** — parsear cada CP: título, pasos, esperado, evidencia. Validar formato (título con verbo + tabla 3 columnas, CP consecutivos, pasos Dado/Cuando/Entonces, esperado verificable).
4. **Cruzar contrato vs cobertura** — marcar cada item `covered`/`partial`/`missing`/`not_applicable`; clasificar gaps por severidad `blocker`/`warning`/`observation`; detectar duplicados, casos genéricos, esperado no observable, negativos sin oráculo de error.
5. **Emitir veredicto** — aplicar reglas GO/NO-GO abajo.
6. **Reportar** — si `output_path`, escribir el reporte; si no, responder con resumen + tabla de gaps + decisión.

## Checklist de auditoría

**1. Formato y trazabilidad**
- Existe `tests.md` para la HU/endpoint del alcance.
- Solo título + tabla de 3 columnas (`Título`, `Pasos`, `Resultado Esperado`).
- CPs `CP01..CPNN` consecutivos sin saltos ni duplicados.
- Cada título inicia con `Validar`/`Verificar`/`Comprobar` y describe objetivo verificable.
- Pasos `Dado/Cuando/Entonces` en una sola celda.
- Esperado con oráculo observable: status, schema/body, BD, auditoría, evento, métrica o error contractual.

**2. Cobertura funcional**
- Happy path principal.
- Variantes positivas por estado, filtro, payload, paginación o transición.
- Negativos por recurso inexistente, path/query/body inválido y reglas de negocio.
- Errores contractuales con código/status cuando la HU/contrato los define.
- Datos seed/bootstrap requeridos.
- Casos de borde que cambian comportamiento (no variaciones cosméticas).

**3. Seguridad y headers** (capa API)
- Autenticación `401` en endpoints protegidos; autorización `403` en escritura/admin.
- Headers obligatorios del schema; actor obligatorio en mutaciones.
- Trazabilidad (`x-request-id`, `x-correlation-id`) cuando el contrato la exige.

**4. Persistencia, auditoría y eventos** (mutaciones)
- Documento vigente en BD con versión/estado esperado.
- `audit_logs` con operation/eventType/oldData/newData/changedFields/executorUser.
- Evento de dominio con envelope/metadata; orden persistencia+auditoría antes de evento; rollback si falla; sin side effects en errores.
- *Lecturas*: consistencia contra BD; sin auditoría, sin eventos, sin cambio de versión.

**5. Idempotencia y no-op**
- Cubrir no-op cuando el contrato lo define; `200`/status esperado; sin nuevo audit_log/versión/evento; separar no-op de error de negocio.

**6. Observabilidad y performance ligera**
- Logs/trazas/métricas si son contractuales; performance solo si hay SLA/threshold/riesgo.

**7. Calidad de casos**
- Sin duplicados por intención; sin casos genéricos sin datos/esperado; sin placeholders (`pendiente`, `según aplique`, `etc.`); sin mezclar endpoints sin necesidad; sin validar fuera del contrato.

## Reglas GO / NO-GO

**Veredicto GO — dar solo cuando:**
1. Todos los CAs/endpoints del alcance tienen CP.
2. No hay gaps `blocker`.
3. Cada item crítico del contrato está `covered` o justificado `not_applicable`.
4. Mutaciones cubren BD/auditoría/eventos/rollback cuando aplica.
5. Lecturas cubren consistencia y cero side effects.
6. Negativos clave tienen status/error code verificable.
7. El formato es consumible para handoff a automatización **o carga al gestor de tickets** (vía el adaptador).

**GO CON OBSERVACIONES — cuando:** sin blockers pero con warnings menores; cobertura completa pero falta mejorar redacción/granularidad/evidencia secundaria; observabilidad/performance opcional pendiente; supuestos documentados aceptables temporalmente.

**NO GO — si ocurre cualquiera:** falta un endpoint/CA del alcance; falta happy path o negativo crítico; falta BD/auditoría/evento en una mutación que los exige; falta idempotencia/no-op contractual; errores contractuales sin cubrir o con códigos incorrectos; numeración `CPxx` rota; esperados genéricos no verificables; drift contra la HU/comentarios aprobados.

**Severidad:**
| Severidad | Uso | ¿Bloquea GO? |
|---|---|---|
| `blocker` | Falta o contradice contrato crítico. | Sí |
| `warning` | Cobertura parcial o mejora necesaria sin romper aprobación. | No (puede llevar a GO CON OBSERVACIONES) |
| `observation` | Nota de calidad o recomendación menor. | No |

**Criterio por evidencia:** si el contrato dice `debe`/`obligatorio`/`required`/`siempre`/`solo después`/`rollback`/`idempotente` → posible blocker. Si dice `opcional`/`cuando aplique`/`futuro` → warning u observation.

## Output Contract (respuesta inline cuando no se escribe archivo)

```markdown
# Auditoría de Calidad de Test Cases: [HU/feature]

**Veredicto:** GO | GO CON OBSERVACIONES | NO GO
**Alcance:** [CAs/endpoints auditados]
**Fuentes:** [HU.md, tests.md, comentarios del ticket]

## Resumen
- [decisión y riesgo principal]

## Hallazgos bloqueantes
| ID | CA/Endpoint | Gap | Evidencia | Acción requerida |

## Observaciones
| ID | CA/Endpoint | Observación | Recomendación |

## Matriz de cobertura
| CA/Endpoint | Positivos | Negativos | Seguridad | BD/Auditoría | Eventos | Estado |

## Decisión
[GO/NO GO explicado en 2-4 bullets]
```

## Reglas duras

- No asumir cobertura correcta: contrastar siempre HU + comentarios del ticket + CPs.
- No inventar endpoints, códigos, eventos, tablas, headers ni datos esperados.
- No reescribir CPs salvo que el usuario lo pida; por defecto auditar y listar cambios (si se modifican y ya estaban cargados al gestor, registrar el delta en un changelog y NO re-cargar — re-cargar duplica).
- No cargar al gestor de tickets desde esta skill.
- Citar archivo y sección/línea cuando se pida evidencia exacta.
