---
name: qa-troubleshooting
description: Qué hacer cuando algo falla durante automatización QA — árbol de decisión completo (auto-healing de locators → protocolo de bloqueo → ciclo de impedimentos IMP-XXX). Invocar cuando un test falla, un locator no resuelve, un flujo no funciona como la HU describe, o aparece un bloqueo estructural.
---

# QA Troubleshooting — algo falló durante la automatización

> **Convención de troubleshooting del proyecto** (§Protocolo de Auto-Healing, §Protocolo de Bloqueo, §Ciclo de vida de impedimentos).

## Árbol de decisión (cómo usar esta skill)

```
Algo falló
   │
   ├─ ¿Es SOLO un locator que cambió? (timeout/0 elements/not visible)
   │     └─ SÍ → Sección 1 (AUTO-HEALING): intentar auto-reparación
   │
   ├─ ¿Es un bloqueo puntual? (flujo, credenciales, datos, ambigüedad de CA,
   │   método del POM que no hace lo que dice)
   │     └─ SÍ → Sección 2 (PROTOCOLO DE BLOQUEO): detener + preguntar
   │
   └─ ¿Es estructural? (afecta 2+ tests / no accionable por QA / setup-teardown
       / feature no implementado / no se resuelve en la sesión)
             └─ SÍ → Sección 3 (CICLO DE IMPEDIMENTOS): registrar IMP-XXX
```

> ✅ **Fuente única del criterio "estructural vs puntual"**: la **Sección 3** ("Criterio: cuándo registrar un IMP", 4 puntos). La Sección 2 (paso 7) la **referencia** en vez de duplicarla.

---

# SECCIÓN 1 — Protocolo de Auto-Healing para Mantenimiento de Tests

Cuando un test falla durante mantenimiento/regresión, existe la posibilidad de **auto-reparación automática** si el fallo es SOLO por cambio de locator.

## Flujo de detección y corrección

### 1. Ejecutar test y capturar error

```bash
npx playwright test <spec-file> --headed
```

**Errores que califican para auto-heal**:
- `Timeout waiting for locator`
- `Locator resolved to 0 elements`
- `Element is not visible`
- `No element matches selector`

**Errores que NO califican**:
- Assertion failures (valores incorrectos) → Ver `conocimiento-sistema.md` para validar si la regla de negocio cambió
- Network errors (API cambió)
- Redirect inesperado (flujo cambió)
- Múltiples tests fallan (refactor grande)

### 2. Identificar el locator que falló

**Información necesaria**:
- Línea del POM donde está el locator
- Método que usa ese locator
- Qué debería hacer ese elemento (del nombre del método)

**Ejemplo**:
```
Error: Timeout 15000ms exceeded waiting for locator
File: pages/ListPage.ts:22
Locator: this.agregarButton = page.getByRole('button', { name: 'Agregar' });
```
<!-- EJEMPLO: el error real de tu runner — archivo:línea del POM + el locator concreto que falló -->


### 3. Usar MCP para encontrar el nuevo locator

**Pasos**:
1. Navegar a la página donde falló (usar la misma ruta que el test)
2. `mcp__playwright__browser_snapshot` → obtener árbol de accesibilidad
3. Buscar elemento por:
   - Texto similar al original (ej: "Agregar" → "Agregar nuevo")
   - Función similar (botón que abre modal, link que navega, etc.)
   - Posición en la página (cerca de dónde estaba antes)
4. Identificar el nuevo `[ref=eXX]` del elemento

### 4. Validar que es el candidato correcto

**Checklist**:
- [ ] El elemento tiene la misma función (botón, input, link)
- [ ] Está en la misma sección de la página
- [ ] El texto es igual o muy similar
- [ ] Solo hay 1 candidato claro (no hay ambigüedad)
- [ ] No cambió el flujo (los pasos antes/después son los mismos)

**Si alguno falla** → NO hacer auto-heal, pedir ayuda.

### 5. Proponer cambio al usuario

Usar `AskUserQuestion`:

```typescript
// Ejemplo de pregunta
"El test 'CA5: <descripción del CA>' falló en XPage.ts:19

LOCATOR ANTERIOR:
page.getByRole('button', { name: 'Agregar' })

ELEMENTO NO ENCONTRADO. Hice snapshot de la página y encontré:

NUEVO LOCATOR SUGERIDO:
page.getByRole('button', { name: 'Agregar nuevo' })

[Mostrar snapshot o screenshot si ayuda]

¿Actualizar el POM con este nuevo locator?"

Opciones:
1. "Sí, actualizar" → Proceder con auto-heal
2. "No, investigar más" → Detenerme y pedir más contexto
3. "El elemento ya no existe" → Documentar que la funcionalidad cambió
```

### 6. Actualizar POM (si el usuario aprueba)

```typescript
// ANTES
this.agregarButton = page.getByRole('button', { name: 'Agregar' });

// DESPUÉS (con comentario de cambio)
// Actualizado YYYY-MM-DD: Cambió texto de botón "Agregar" → "Agregar nuevo"
this.agregarButton = page.getByRole('button', { name: 'Agregar nuevo' });
```

**IMPORTANTE**: Agregar comentario en el POM indicando:
- Fecha del cambio
- Qué cambió (locator anterior → nuevo)
- Por qué (mantenimiento, UI cambió)

### 7. Documentar en lecciones-aprendidas.md y conocimiento-sistema.md

**A) Agregar entrada en `lecciones-aprendidas.md`**:

```markdown
### [YYYY-MM-DD] Cambio de texto en botón "Agregar"

**HU relacionada**: N/A (mantenimiento)
**Categoría**: Locators

**Contexto**:
Test <ID> falló en XPage.agregarButton

**Problema**:
El botón "Agregar" cambió su texto a "Agregar nuevo"

**Solución**:
Actualizado locator en XPage.ts:47
Antes: page.getByRole('button', { name: 'Agregar' })
Después: page.getByRole('button', { name: 'Agregar nuevo' })

**Aprendizaje/Regla**:
Cambio cosmético de UI. El elemento y funcionalidad siguen siendo los mismos.

**Actualización requerida**:
- [x] XPage.ts
- [x] lecciones-aprendidas.md
- [x] conocimiento-sistema.md (si el cambio es significativo)
```

**B) Actualizar `conocimiento-sistema.md` si aplica**:

Si el cambio afecta la documentación funcional (ej: texto de botón, mensaje de validación, flujo de navegación):

```markdown
## Módulo: <Nombre del módulo>
### Página: <Nombre de la pantalla>

**Funcionalidades disponibles**:
1. **<Sección>**:
   - Botón "Agregar nuevo" (actualizado YYYY-MM-DD, antes "Agregar") ✅ ACTUALIZADO
   ...

**Última actualización**: YYYY-MM-DD (mantenimiento - cambio de UI)
```

**NO actualizar conocimiento-sistema.md** si:
- Es solo un cambio de clase CSS sin impacto funcional
- El texto/funcionalidad sigue siendo equivalente y no afecta la comprensión del sistema

### 8. Re-ejecutar test

```bash
npx playwright test <spec-file> --headed
```

**Resultado esperado**: Test pasa ✅

**Si falla de nuevo**:
- NO era solo un cambio de locator
- Hay cambios en el flujo o reglas de negocio
- DETENER auto-heal
- Investigar a fondo
- Preguntar al usuario qué cambió en el sistema

## Casos especiales de auto-heal

### Caso 1: Elemento movido a otra parte del DOM

**Síntoma**: Locator por jerarquía falla
```typescript
// ANTES (locator frágil)
this.submitBtn = page.locator('div.form > div.actions > button').first();

// DESPUÉS (locator robusto)
this.submitBtn = page.getByRole('button', { name: 'Enviar' });
```

**Acción**: Aprovechar para mejorar el locator (usar role/label en vez de CSS)

### Caso 2: data-testid cambió

**Síntoma**: `[data-testid="old-id"]` no existe
```typescript
// ANTES
this.createBtn = page.locator('[data-testid="create-entity-btn"]');

// NUEVO (encontrado en snapshot)
this.createBtn = page.locator('[data-testid="btn-create-entity"]');
```

**Acción**: Actualizar y documentar. Considerar abrir issue si los data-testid cambian frecuentemente.

### Caso 3: Texto cambió ligeramente

**Síntoma**: getByRole con texto exacto falla
```typescript
// ANTES
page.getByRole('button', { name: 'Continuar' })

// NUEVO (texto cambió a "Siguiente paso")
page.getByRole('button', { name: 'Siguiente paso' })
```

**Acción**: Actualizar. Si el cambio afecta múltiples tests, documentar como cambio de UX.

## Límites del auto-healing

**NO intentar auto-heal si**:

1. **>3 locators fallan** en el mismo spec → Refactor grande, requiere análisis manual
2. **Tests de diferentes módulos fallan** → Cambio global de UI/framework
3. **El snapshot no muestra ningún candidato** → Funcionalidad removida
4. **Hay 2+ candidatos posibles** → Ambigüedad, requiere decisión del usuario
5. **El test falla en assertion, no en locator** → Cambio de reglas de negocio
6. **Cambió la ruta/URL de la página** → Cambio de arquitectura

En estos casos: **Documentar el problema, preguntar al usuario, NO adivinar.**

## Checklist de auto-heal exitoso

Después de aplicar auto-heal, verificar:

```
[ ] Test pasa con el nuevo locator
[ ] El elemento hace la misma acción (click, fill, etc.)
[ ] No cambió el flujo (pasos antes/después iguales)
[ ] Comentario agregado en el POM
[ ] Entrada creada en lecciones-aprendidas.md
[ ] Si es patrón recurrente (3+ veces), actualizar conocimiento-sistema.md
[ ] Re-ejecutar suite completa del módulo para validar que no rompí nada
```

## Beneficios del auto-healing

✅ **Mantenimiento más rápido**: Cambios cosméticos de UI se arreglan en minutos
✅ **Menos interrupciones**: No necesitas intervenir en cada cambio de CSS/texto
✅ **Documentación automática**: Cada cambio queda registrado
✅ **Aprendizaje continuo**: Patrones de cambios se documentan
✅ **Tests más robustos**: Aprovechar para mejorar locators frágiles

---

# SECCIÓN 2 — Protocolo de Bloqueo Durante Automatización

Si en **CUALQUIER momento** encuentro:

- ❌ Un locator que no existe o cambió
- ❌ Un flujo que no funciona como se describió
- ❌ Credenciales que no funcionan
- ❌ Datos de test que no cumplen validaciones
- ❌ Timeouts o errores inesperados
- ❌ Ambigüedad en los criterios de aceptación
- ❌ Diferencias entre lo esperado y lo real (snapshots, comportamiento UI)
- ❌ Un método del POM que NO hace lo que su nombre sugiere

## DEBO:

1. **DETENER** la automatización inmediatamente
2. **NO adivinar**, NO inventar soluciones, NO skipear validaciones
3. **DOCUMENTAR** el bloqueo:
   - Qué esperaba según la HU
   - Qué encontré en la realidad (código, UI, respuesta API)
   - En qué paso del proceso estoy
4. **USAR `AskUserQuestion`** con:
   - Descripción clara del problema
   - Contexto (URL, paso del flujo, elemento específico, línea de código)
   - Captura/snapshot si es relevante
   - Pregunta específica sobre cómo proceder
5. **ESPERAR** respuesta antes de continuar
6. **DESPUÉS DE RESOLVER**: Documentar en `docs/lecciones-aprendidas.md`:
   - Usar la plantilla del documento
   - Categorizar correctamente
   - Incluir la solución completa
   - Marcar qué documentos necesitan actualizarse
   - Actualizar estadísticas al final del documento
7. **SI EL BLOQUEO ES ESTRUCTURAL** → escalar a impedimento (`IMP-XXX`).
   - **Cuándo es estructural vs puntual**: aplicar el "Criterio: cuándo registrar un IMP" de la **Sección 3** (fuente única, 4 puntos). No se repite aquí para no duplicar.
   - Si cae en un `IMP-XXX` existente → actualizar ese IMP (Sección 3 → "Al descubrir impedimento").
   - Si es nuevo → crear `IMP-XXX+1` y marcar el `test.skip` con `// SKIP [IMP-XXX]: razón resumida` (Sección 3).
   - Diferencia con `lecciones-aprendidas.md`: lecciones = histórico de aprendizajes técnicos; impedimentos = lo que BLOQUEA tests HOY.

## Ejemplos de bloqueos comunes:

<!-- EJEMPLO: bloqueos reales de tu dominio. Reemplazá estos tres por casos concretos del proyecto cuando aparezcan -->

**Bloqueo 1** (método del POM que no hace lo que la HU pide): "El método `xPage.flujoCompleto()` hace click en 'Guardar' al final, pero la HU dice que debo validar que el botón esté deshabilitado si falta un campo. ¿Debo crear un método nuevo para este caso o modificar el existente?"

**Bloqueo 2** (texto UI no coincide con la HU): "La HU dice 'toast rojo: <texto esperado en la HU>', pero en el ambiente QA veo '<texto real observado>'. ¿Cuál es el texto correcto?"

**Bloqueo 3** (datos/usuario insuficiente): "El spec usa el usuario `<usuario>`, pero ese usuario no tiene <entidad> en el estado requerido en QA. ¿Qué usuario debo usar?"

---

# SECCIÓN 3 — Ciclo de vida de impedimentos (docs/impedimentos-bloqueos-qa.md)

El documento `docs/impedimentos-bloqueos-qa.md` es **vivo**: se actualiza con cada HU automatizada y con cada impedimento resuelto. Refleja lo que BLOQUEA tests HOY, no histórico.

## Criterio: cuándo registrar un IMP

Un bloqueo califica como impedimento (`IMP-XXX`) si cumple **alguno**:

1. Afecta a **2+ tests** (o tiene alta probabilidad de hacerlo en HUs futuras del mismo módulo).
2. **No es accionable por QA directamente** — depende de dev frontend, backend o DevOps.
3. Es **estructural** (setup/teardown, datos seed, feature no implementado), no un bug puntual en el POM o en un asserter.
4. **No se resolverá en la misma sesión** — requiere planificación o acción externa.

Si es bloqueo de 1 test, corregible en el momento, que NO se repetirá → solo lecciones-aprendidas.

## Al descubrir impedimento (durante automatización)

1. Buscar en `docs/impedimentos-bloqueos-qa.md` palabras clave del bloqueo.
2. **Si cae en `IMP-XXX` existente**: añadir los specs/tests nuevos a la tabla "Tests bloqueados" del IMP. Actualizar conteo.
3. **Si es nuevo**: copiar plantilla, asignar siguiente ID libre, completar todos los campos. Actualizar el "Índice de impedimentos abiertos".
4. **En el `test.skip`**: el comentario empieza con `// SKIP [IMP-XXX]: razón resumida.`

## Al resolver un impedimento

1. Confirmar que todos los tests del IMP pasan sin `.skip`.
2. Remover `.skip` y tag `[IMP-XXX]` de los comentarios.
3. Mover la sección del IMP al `## Histórico de resueltos` del documento:
   - Cambiar `🔴 Abierto` → `🟢 Resuelto`.
   - Añadir `**Resuelto**: YYYY-MM-DD`.
   - Añadir sub-sección `### Cómo se resolvió` con nota breve.
4. Quitar el IMP del "Índice de impedimentos abiertos" (actualizar tabla y conteo).
5. **IDs NUNCA se reusan** — si `IMP-003` se resolvió, el próximo IMP nuevo es `IMP-009`, no `IMP-003`.
6. Si la solución introdujo patrón reusable → documentar en `lecciones-aprendidas.md`.
7. Actualizar `coverage-register.md` con nuevos estados (pasa/skip por spec).

## Cómo se ve un test skip con referencia a IMP

```typescript
test.skip('CA17: <descripción del CA bloqueado>', async () => {
  // SKIP [IMP-002]: <razón resumida: acción que dispara efecto real sin teardown,
  // dependencia externa, feature no implementado…>. Ver docs/impedimentos-bloqueos-qa.md.
});
```

Así, cualquier QA que vea el test sabe inmediatamente a qué IMP referirse y qué se necesita.
