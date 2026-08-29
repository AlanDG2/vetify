# IMAS-4408 — Ocultar credenciales y restringir operatoria para planes Inactivos o Dados de baja

**Tipo:** Tarea
**Estado (Jira, al 2026-08-27):** In Validation
**Reporter:** Liliana Picinotti
**Assignee:** alan david gonzalez guzman (yo)
**Prioridad:** High
**Creado:** 2026-08-24 · **Actualizado:** 2026-08-27
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-4408
**Sprint:** `2026-Q3-S5-Mascotas` — mencionada como sprint goal explícito: "6- Limitar solicitud de servicios a planes dados de baja en QA"
**Issuelinks:** 0 — sin bugs vinculados todavía.

## ⚠️ Nota de intake — corrección propia, error de herramienta

En la primera pasada de este intake reporté "descripción vacía". **Estaba mal** — el contenido real vive en un **campo custom de Jira (`customfield_11620`)**, no en el campo estándar `description` que mi tooling lee por default. El usuario me corrigió pegando el texto completo. Confirmado también que **`IMAS-4356`** (otra Tarea de esta misma sesión) tiene el mismo problema — ver nota técnica al final de este documento. `IMAS-3610` (tipo Historia) no lo tiene — su contenido real siempre estuvo en el campo estándar.

## Descripción (texto completo, campo `customfield_11620`)

Actualmente, cuando un usuario posee un plan que pasa a estado **Inactivo** o **Dado de baja** en SISE/Engage, puede continuar ingresando a la WebApp. El acceso a la WebApp debe mantenerse, ya que un mismo usuario puede tener más de un plan asociado y alguno de ellos podría continuar activo.

Sin embargo, la credencial correspondiente al plan Inactivo o Dado de baja continúa visible y disponible para operar, permitiendo al usuario acceder a funcionalidades asociadas a un plan que ya no se encuentra habilitado.

### Estados posibles del plan

- **Activo**: plan vigente y habilitado para operar.
- **Inactivo**: plan que se encuentra inactivo **por falta de pago durante tres meses**.
- **Dado de baja**: plan que ha sido dado de baja definitivamente.

Regla funcional esperada:
- ACTIVO → muestra credencial y permite operar.
- INACTIVO → NO muestra credencial y NO permite operar.
- DADO DE BAJA → NO muestra credencial y NO permite operar.

### Ambiente
Producción (el ticket original describe el problema visto en Prod).

### Comportamiento actual (el bug/gap original)
- El usuario puede seguir ingresando a la WebApp.
- La credencial sigue visible.
- El plan sigue apareciendo en la sección Planes.
- La credencial puede seguir seleccionándose en Videollamadas.

### Comportamiento esperado
El acceso a la WebApp se mantiene siempre, independientemente del estado de los planes. Pero cualquier plan Inactivo o Dado de baja debe:
1. Ocultar la credencial en el Home.
2. Ocultar la credencial en la sección Mascotas.
3. Ocultar el plan de la sección Planes.
4. No permitir seleccionar la credencial en Videollamadas.
5. No permitir seleccionar la credencial en Reintegros.
6. Impedir cualquier operación que requiera esa credencial.

Solo las credenciales de planes **Activos** deben visualizarse y operar.

### Escenarios a contemplar (texto literal de la HU)

**Escenario 1 — Usuario con múltiples planes y diferentes estados.** Ejemplo: Plan A ACTIVO, Plan B INACTIVO, Plan C DADO DE BAJA.
- ✅ Ingresa a la WebApp. ✅ Visualiza y opera con la credencial del Plan A.
- ❌ No visualiza ni opera con B ni C. ❌ B y C no aparecen en Planes. ❌ B y C no seleccionables en Videollamadas ni Reintegros.

**Escenario 2 — Usuario cuyo único plan está Inactivo** (por falta de pago). Debe poder seguir ingresando a la WebApp, pero: sin credenciales visibles, sin el plan en la sección Planes, sin poder seleccionar nada en Videollamadas/Reintegros, sin poder operar.

**Escenario 3 — Usuario cuyo único plan fue Dado de baja.** Comportamiento equivalente al Escenario 2.

### Criterios de aceptación (12, texto literal — Dado/Cuando/Entonces donde aplica)

1. Dado un plan Activo en SISE, cuando el usuario ingrese a la WebApp, entonces visualiza su credencial y puede operar normalmente.
2. Dado un plan que pasa a Inactivo en SISE, cuando el usuario ingrese o actualice la info de la WebApp, entonces su credencial deja de visualizarse y no puede usarse.
3. Dado un plan que pasa a Dado de baja en SISE, cuando el usuario ingrese o actualice la info, entonces su credencial deja de visualizarse y no puede usarse.
4. Los planes Inactivos o Dados de baja no deben visualizarse en la sección Planes.
5. Las credenciales de planes Inactivos o Dados de baja no deben visualizarse en Home ni en Mascotas.
6. No deben estar disponibles para seleccionar en el flujo de Videollamadas.
7. No deben estar disponibles para seleccionar en el flujo de Reintegros.
8. Dado un usuario con múltiples planes en distintos estados, cuando acceda a la WebApp, entonces solo visualiza/opera con los Activos.
9. Dado un usuario cuyo único plan está Inactivo o Dado de baja, cuando acceda a la WebApp, entonces puede autenticarse e ingresar, pero no visualiza planes ni credenciales operables.
10. Ningún plan Inactivo o Dado de baja debe quedar disponible en selectores/flujos/funcionalidades que permitan iniciar una operación con su credencial.
11. El filtrado debe basarse en el **estado informado por SISE**, considerando únicamente Activo como habilitado.
12. La modificación no debe afectar la visualización ni operatoria de otros planes Activos del mismo usuario.

## Subtareas (4)

| Key | Título | Estado | Asignado |
|---|---|---|---|
| IMAS-4409 | Análisis de la solución | Hecho | Paula Scalzo |
| IMAS-4410 | Desarrollo de la solución | Hecho | Paula Scalzo |
| IMAS-4411 | **Pruebas QA** | **Tareas Por Hacer** | **Sin asignar** |
| IMAS-4451 | Deploy a Prod | Backlog | — |

## El único comentario (Paula Scalzo, 2026-08-27 08:47) — evidencia visual del fix

> "Paso esta tarea a 'in validation' y adjunto evidencia del fix: Plan Emergencias activo: Sección Mascotas / Sección Mis Planes / Flujo Videollamadas / Flujo Reintegros / Plan Emergencias dado de baja: Home / Sección Mascotas / Sección Mis Planes / Flujo Videollamadas / Flujo Reintegros"

9 capturas adjuntas, cuenta de prueba con 2 mascotas: **Lucy** (plan "Vetify 100 Emergencia", el que se da de baja para la demo) y **Mishi** (plan "Vetify 100 Senior", control que queda activo). Analizadas una por una (mapeadas por contenido real, no por nombre de archivo/orden de subida):

| Pantalla | Con plan Activo (Lucy) | Con plan Dado de baja (Lucy) |
|---|---|---|
| Home | (no capturado en este set) | Solo tarjeta de Mishi; el espacio de Lucy pasa a "Dejá su credencial lista" genérico |
| Mascotas | Lucy + Mishi, ambas visibles | Solo Mishi — Lucy desaparece del todo |
| Planes y coberturas | 5 planes (incl. EMERGENCIA) | 4 planes — "VETIFY 100 EMERGENCIA x1" desaparece |
| Videollamada | Selector con Lucy + Mishi | Selector fijo solo en Mishi, sin opción de elegir a Lucy |
| Reintegros | Selector con Lucy + Mishi, "Agregar gasto"/"Continuar" habilitados | Selector solo con Mishi; con Mishi elegida, "No hay tipos de gasto disponibles", monto deshabilitado |

**Coincide con los ACs 4, 5, 6, 7 de la descripción real** — el comportamiento demostrado en las capturas es consistente con el Escenario 1 (Lucy = plan dado de baja, Mishi = plan activo que sigue funcionando bien, ambos en la misma cuenta).

## Contexto adicional del proyecto (revisado antes de automatizar)

- **`docs/impedimentos-bloqueos.md` y `docs/lecciones-aprendidas.md`**: sin coincidencias para "dado de baja"/"plan inactivo"/"desactivar".
- **`docs/conocimiento-sistema.md`**: existe el tag `UserTag.INACTIVE_PLAN` (enum, `src/providers/user/tags.ts:30`) — pero **ningún usuario del pool lo tiene asignado hoy y ningún script lo genera activamente**. Sigue siendo un hueco real para conseguir una cuenta de prueba en este estado.

## ⚠️ Nota técnica reutilizable — campo de descripción real en issues tipo "Tarea"

Confirmado empíricamente en 2 tickets de esta sesión: los issues tipo **"Tarea"** en este proyecto de Jira guardan su descripción "real" (la que se ve en la UI de Jira) en el **campo custom `customfield_11620`**, NO en el campo estándar `description` que `getIssue()`/`fetchStory()` leen por default. Confirmado:
- `IMAS-4408` (Tarea): `description` estándar vacío, `customfield_11620` con el spec completo (este documento).
- `IMAS-4356` (Tarea): mismo patrón — `customfield_11620` tenía el spec completo del banner Cooper, nunca leído en esa sesión de trabajo (ver `project-imas4356-banner-cooper-osde` en memoria persistente para el detalle de qué cambia con esto).
- `IMAS-3610` (Historia): **no** tiene este problema — su contenido real está en el campo estándar `description`.

**Regla para la próxima vez**: al analizar un issue tipo "Tarea" con `description` estándar vacío, **no asumir que la descripción está vacía** — chequear `customfield_11620` antes de concluir nada. Candidato a arreglar en el código del proyecto (`scripts/jira/jira-client.mjs` / `adapters/jira/client.mjs`, funciones `getIssue`/`fetchStory`) para que revisen ambos campos automáticamente — no se modificó el código todavía, queda pendiente de decisión del usuario.

## ✅ 2026-08-28 — Punto 1 resuelto: cuenta real conseguida, Escenario 1 verificado en vivo

Paula Scalzo (dev) se adelantó al bloqueo: para poder demostrar el fix ella misma, le pidió a Alexis (soporte/backoffice) que diera de baja un plan real de una cuenta de prueba en QA — no fue algo simulado por QA ni por dev, es un cambio de estado real en el backend (SISE). Le pasó esa misma cuenta a Alan por privado (transcripción de audio + credenciales escritas aparte): `pauscalzo@hotmail.com` / `Elo2014!Ama2017!` (¡ojo! dominio `@hotmail.com`, no confundir con la cuenta de equipo ya conocida `pauscalzo@gmail.com` — mismo password, dominio distinto, no se asumió que fuera la misma sin probarla).

Paula ofreció explícitamente 2 caminos: (a) usar esta cuenta ya preparada — rápido, pero solo se ve el "después" (el "antes" queda respaldado únicamente por sus 9 capturas de Jira); (b) tomar una cuenta nueva, documentar el "antes" con mis propios ojos, y pedirle a Alexis que dé de baja un plan mientras miro — más lento pero con control total del experimento. **Se tomó el camino (a)** para no perder tiempo, con la limitación reconocida documentada.

**Verificado en vivo, las 5 pantallas que pide la HU, coincide exactamente con las capturas de Paula**:
- Home: solo credencial de Mishi (plan Activo), lugar de la mascota del plan dado de baja reemplazado por el genérico "Dejá su credencial lista".
- Mascotas: solo Mishi, la otra mascota no aparece en absoluto.
- Planes y coberturas: solo los planes Activos listados.
- Videollamada: "Mascota" fijo en "Mishi", sin selector, sin opción de elegir la otra.
- Reintegros: selector solo con Mishi, "No hay tipos de gasto disponibles para tu cobertura", todo deshabilitado.

Diseño de casos completo en `IMAS-4408-ocultar-credenciales-planes-inactivos.tests.md` — **8 de 11 casos verificados en vivo hoy** (todo el Escenario 1, el más común en producción). Quedan bloqueados solo `CP09`/`CP10` (Escenarios 2/3 — usuario con un ÚNICO plan Inactivo/Dado de baja, esta cuenta no sirve para aislarlo porque tiene a Mishi como plan Activo de respaldo).

## Pendiente para continuar

1. **Resuelto para Escenario 1** (ver arriba) — para Escenarios 2/3 (único plan), evaluar si vale la pena repetir el camino (b) que ofreció Paula: cuenta nueva, documentar el "antes", pedirle a Alexis que dé de baja el único plan.
2. Confirmar si corresponde comentar en Jira o transicionar `IMAS-4411` ("Pruebas QA", hoy "Tareas Por Hacer") reflejando este avance.
3. Confirmar si el comportamiento aplica igual en mobile (app nativa) o si esta Tarea es solo WebApp.
4. **Hallazgo lateral, no relacionado a esta HU**: en esta misma cuenta (`pauscalzo@hotmail.com`), el menú lateral mostró **tanto "Cooper" como "Vetify PLUS"** simultáneamente en la sección Beneficios — un patrón distinto a todo lo visto en la investigación de `IMAS-4356` (donde siempre era uno u otro, nunca ambos). No investigado más a fondo, queda anotado para retomar si se vuelve a tocar esa HU.
