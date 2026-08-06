# Videollamada — Nuevo flujo (rediseño) — Mapeo funcional y casuísticas

> **Origen**: Figma — archivo `Dev - Vetify - Iniciativas y solicitudes` (`fileKey=YfysBYoQZB2Y0J0pLf3nMb`), página **"Videollamadas"** (`node-id=40001944-9407`).
> **Frame analizado en profundidad**: `Nuevo flujo Videollamada` (`node-id=40001944-27644`, 40913×27402px — el frame más grande de la página, contiene el flujo completo Mobile + Desktop con todas las casuísticas anotadas por el equipo de diseño).
> **Otros frames de la misma página** (no forman parte del flujo funcional, no se mapean acá): `Nuevas piezas de comunicación` (`40001944-27037`, piezas de comunicación/marketing) e `Info CX | Videollamadas Journey digital` (`40002257-73541`, capturas + 2 notas sobre coordinar un testeo con prestador — contenido de proceso interno, no de producto).
> **Método de extracción**: Figma REST API (`scripts/figma/figma-client.mjs`) leyendo el árbol de nodos + el texto literal de cada `CardNotas` (anotación del equipo de diseño) y de cada modal. **No hizo falta exportar imágenes/PNG** — el texto de las anotaciones de Figma es más preciso para diseño de casos de prueba que una captura visual (contiene la regla de negocio exacta, copy exacto de mensajes de error, límites numéricos, etc.). Si en el futuro hace falta validar detalle visual (layout exacto, spacing, estados de color) se puede pedir un export PNG puntual de una pantalla con `node scripts/figma/figma-client.mjs image <FILE_KEY> <NODE_ID>`.
> **Estado de automatización actual** (repo, confirmado 2026-08): existen fixtures/POMs (`src/pages/vetify/webapp/videocall/`: `VideocallFormPage`, `CalendarSchedulingComponent`, `RescheduleVideocallPage`, `CancelVideocallModal`, `VideocallViewPage`) y fixtures wireados en `tests/framework/{base-test,vetify-base-test}.ts`, pero **no hay ningún `.spec.ts` escrito todavía** para videollamadas — este documento es la base para escribirlos.
> **Contraste con Jira**: enriquecido y corregido contra las 4 HUs del sprint actual (epic `IMAS-2877`) — ver [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877). Todas en estado **"In Validation"** (dev Hecho, QA pendiente).
> **Última actualización**: fecha de esta sesión — doble-check + cruce con Jira completado (ver `docs/conocimiento-sistema.md` para el resumen corto + link a este archivo).

---

## 0. Trazabilidad con HUs de Jira (sprint actual, epic IMAS-2877)

> Contrastadas contra el mapeo de Figma de arriba. Las 4 HUs están **"In Validation"** — el subtask de desarrollo de cada una ya está **Hecho**, y el subtask "Pruebas QA" está **pendiente** (Backlog/Tareas Por Hacer) → listas para diseñar/automatizar casos de prueba ahora. El comentario de validación de cada HU (autora: Paula Scalzo, quien la pasó a "In Validation") es la fuente más autorizada de comportamiento esperado — se prioriza sobre la sola lectura de Figma cuando hay diferencia.

| HU | Título | Cubre (de este documento) | Subtask QA |
|---|---|---|---|
| [IMAS-3899](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3899) | Solicitud de Videollamada sin Credencial Cargada | [§4](#4-validación-de-credencial-de-la-mascota) | IMAS-3901 (Tareas Por Hacer) |
| [IMAS-3174](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3174) | Rediseño Solicitud de Turno **x 1 mascota** (sin turno previo) | [§3](#3-selección-de-mascota), [§5](#5-selector-de-motivo--comentarios-adicionales)-[§9](#9-pantalla-de-confirmación) | IMAS-3176 (Tareas Por Hacer) |
| [IMAS-3889](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3889) | Rediseño Solicitud de Turno **+1 mascota** (sin turno previo) | [§3](#3-selección-de-mascota), [§5](#5-selector-de-motivo--comentarios-adicionales)-[§9](#9-pantalla-de-confirmación) | IMAS-3891 (Backlog) |
| [IMAS-3909](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3909) | Casuísticas especiales — Con turno previo (límites) | [§13](#13-límites-de-turnos-por-mascota--cupo--osde-capitado) | IMAS-3911 / IMAS-4063 (Backlog, duplicado de subtask — ver nota) |
| [IMAS-3894](https://ikeasistencia-arg.atlassian.net/browse/IMAS-3894) | Visualización, Reprogramación, Cancelación e Ingreso a Turno (Edición del turno) | [§10](#10-detalle-del-turno-ver--reprogramar--cancelar)-[§12](#12-salida-de-la-videollamada) | Clon de IMAS-3889/IMAS-3899 (mismo epic) — sin subtask QA propio identificado en Jira al momento de automatizar |

**Correcciones y contenido nuevo aportado por las HUs/comentarios (no visible solo en Figma)**:

1. **[IMAS-3899, CA05] Retomar la solicitud tras cargar la credencial**: no vuelve a la Home — el sistema **retoma exactamente el flujo de reserva donde quedó**, sin reiniciar la operación. Más específico que lo inferido solo de Figma ("redirigido a carga de credencial").
2. **[IMAS-3889, CA09] Cambiar de mascota en la pantalla de revisión**: al editar la mascota seleccionada, el sistema conserva el resto de los datos ya cargados **"siempre que continúe siendo válida para la nueva mascota"** — implica que algún dato (ej. motivo de consulta, si depende de especie/tipo de mascota) podría invalidarse y pedir recarga. Punto a confirmar en pruebas: ¿qué campo exactamente se invalida al cambiar de mascota?
3. **[IMAS-3889, comentario] Cámara — CONFIRMADO, ya no es "a confirmar"**: "Desde el celular se puede utilizar la cámara del teléfono" (resuelve la pregunta abierta de Figma, ver [§16](#16-puntos-abiertos--a-confirmar-con-negocio)).
4. **[IMAS-3889, comentario] Archivos adjuntos — casuísticas nuevas no vistas en Figma**:
   - Los archivos **pueden borrarse** una vez cargados (no estaba en las notas de Figma).
   - Al llegar a 5 archivos, si se intenta usar la **cámara** (no solo "adjuntar archivo"), también se bloquea y muestra su propio mensaje de error — casuística específica de cámara distinta del error genérico de carga.
   - **Doble validación front + back**: todas las reglas de adjuntos (formato, peso, cantidad) están validadas tanto en frontend como en backend — "sortear estas validaciones desde el front no permite vulnerabilidades". Implica que el diseño de casos debe incluir intentos de **bypass de validación de frontend contra el backend directamente** (API), no solo UI.
5. **[IMAS-3889, comentario] Calendario — 30 días validado front + back** también, mismo criterio de doble validación que archivos.
6. **[IMAS-3909, CA05] Límite OSDE Capitado / Flux Capitado — CORRECCIÓN IMPORTANTE**: el tope no es "2 videollamadas totales" sin más (como parecía en Figma) sino **"2 videollamadas permitidas AL AÑO"** — es un tope anual, no un tope de por vida. Ajustar datos de prueba para poder simular renovación del cupo (cambio de año o fecha de referencia).
7. **[IMAS-3909, CA08] Analítica — no estaba en el mapeo de Figma**: deben registrarse eventos de: intentos de agendamiento bloqueados, motivo del bloqueo (tope por mascota vs. tope por plan), plan del usuario, mascota asociada, acceso a "Tus turnos" desde el bloqueo, y abandono del flujo. Si el equipo QA tiene forma de verificar analítica (ej. dataLayer, requests a un tracker), agregar verificación en los casos de prueba de límites.
8. **[IMAS-3909, comentario] Secuencia EXACTA de validación del límite "2 turnos por la misma mascota" — más precisa que Figma**:
   - Mascota única + ya tiene 2 turnos → el mensaje de error aparece **en la pantalla previa de "turnos ya agendados"**, antes de llegar siquiera al selector de motivo.
   - Multi-mascota + ya tiene 2 turnos para UNA mascota → el sistema **permite avanzar** hasta la pantalla de selección de mascota. Recién ahí se bifurca:
     - Si elige la **misma** mascota (la que ya tiene 2 turnos) → error, no puede continuar.
     - Si elige **otra** mascota (con cupo disponible) → continúa sin error.
   - Esto es más específico que "se muestra un modal si se supera el límite" — el bloqueo ocurre **después** de elegir la mascota, no antes, en el caso multi-mascota.
9. ~~**Discrepancia a validar — IMAS-3174 (flujo de 1 sola mascota)**~~ — ✅ **Resuelto**: el comentario de validación de esta HU mencionaba una pantalla de selección de mascota que no aplicaba a este flujo. Se revisó el video adjunto al mismo comentario y se confirmó que fue **un error de redacción** (texto copiado de la HU multi-mascota IMAS-3889). **Vale lo que dice Figma**: en el flujo de 1 sola mascota **no** hay pantalla de selección, se va directo a "Motivo de la consulta". Ver detalle de la validación en [`documentation/IMAS-3174-duda-para-daily.md`](IMAS-3174-duda-para-daily.md).

---

## Índice

0. [Trazabilidad con HUs de Jira (sprint actual)](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877)
1. [Visión general del flujo](#1-visión-general-del-flujo)
2. [Entrada al flujo (Home)](#2-entrada-al-flujo-home)
3. [Selección de mascota](#3-selección-de-mascota)
4. [Validación de credencial de la mascota](#4-validación-de-credencial-de-la-mascota)
5. [Selector de motivo + comentarios adicionales](#5-selector-de-motivo--comentarios-adicionales)
6. [Adjuntar archivos (opcional)](#6-adjuntar-archivos-opcional)
7. [Selección de día y horario](#7-selección-de-día-y-horario)
8. [Pantalla de revisión](#8-pantalla-de-revisión)
9. [Pantalla de confirmación](#9-pantalla-de-confirmación)
10. [Detalle del turno (ver / reprogramar / cancelar)](#10-detalle-del-turno-ver--reprogramar--cancelar)
11. [Ingreso a la videollamada (sala de espera)](#11-ingreso-a-la-videollamada-sala-de-espera)
12. [Salida de la videollamada](#12-salida-de-la-videollamada)
13. [Límites de turnos por mascota / cupo / OSDE Capitado](#13-límites-de-turnos-por-mascota--cupo--osde-capitado)
14. [Mensajes de error y estados de falla](#14-mensajes-de-error-y-estados-de-falla)
15. [Diferencias Mobile vs Desktop](#15-diferencias-mobile-vs-desktop)
16. [Puntos abiertos / a confirmar con negocio](#16-puntos-abiertos--a-confirmar-con-negocio)
17. [Mapeo a POMs / fixtures existentes](#17-mapeo-a-poms--fixtures-existentes)
18. [Casos de prueba](#18-casos-de-prueba)

---

## 1. Visión general del flujo

El rediseño organiza el agendamiento de una videollamada veterinaria en **etapas separadas** (en vez de un único formulario largo), para reducir carga cognitiva y errores:

```
Home (banner si ya tiene turno)
   → Selección de mascota (auto si tiene 1 sola / selector si tiene 2+)
   → [si credencial incompleta → derivación a carga de credencial] (corta el flujo)
   → Selector de motivo (+ comentarios adicionales condicionales)
   → Adjuntar archivos (opcional)
   → Selección de día y horario
   → Pantalla de revisión (editar cualquier paso anterior)
   → Pantalla de confirmación (turno agendado)
        ↓ (desde Home, con el turno ya agendado)
   Detalle del turno → Ingresar | Reprogramar | Cancelar
        ↓ Ingresar (habilitado 5 min antes)
   Sala de espera → Videollamada → Salir
```

Existen **dos plataformas con componentes de interacción distintos** para lo mismo (ver [§15](#15-diferencias-mobile-vs-desktop)): Mobile usa *Bottom Sheet*, Desktop usa *Drawer*.

---

## 2. Entrada al flujo (Home)

| Caso | Comportamiento |
|---|---|
| **Sin turno agendado** | La PU (persona usuaria) ve la Home en estado normal, con el botón para agendar un nuevo turno habilitado. El botón para "acceder a turnos programados" aparece **deshabilitado** si no tiene turnos. |
| **Con 1 turno agendado** | Aparece un **banner/aviso recordatorio** en la Home. Acción "Ir al detalle" → navega al detalle del turno. |
| **Con turno próximo a empezar** | Se propone un **segundo banner** (más urgente) cuando falta poco para el horario. Su acción es directamente **"Ingresar"** → entra directo a la videollamada (salta el detalle). |
| **Con más de un turno agendado** | El aviso de la Home muestra la info del **turno más próximo** únicamente (no lista todos). |
| **Perdió el turno** (llegó tarde o no pudo volver a entrar) | Se agrega un aviso nuevo en Home notificando la situación, visible durante **1 hora**. |

---

## 3. Selección de mascota

- **Multi-mascota**: se reemplaza el selector anterior por un **selector desplegable (dropdown)** que permite elegir la mascota (y su credencial asociada) de forma más clara — reduce carga cognitiva/errores vs. el diseño anterior donde todo estaba en un mismo espacio.
- **Mascota única**: si la PU tiene una sola mascota, **se carga automáticamente** y el flujo salta directo al selector de motivo (no se le pide elegir).

## 4. Validación de credencial de la mascota

- Si la PU selecciona una mascota que **todavía no completó su credencial**, el flujo la **detiene** ahí: se le avisa que debe completar la credencial primero, y se la **deriva al flujo de carga de credencial** existente (`credentials/AddPetFormPage`).
- No se puede continuar hacia el selector de motivo mientras la credencial esté incompleta.

## 5. Selector de motivo + comentarios adicionales

- El selector de motivo permite **dos formas de uso**: elegir del desplegable, o **escribir texto libre** y que el campo se autocomplete/filtre a la opción coincidente.
- **Orden de la lista**: alfabético, con la excepción de **"Otro motivo"**, que siempre queda **al final** (opción de cierre para cuando ninguna categoría aplica).
- **Comentarios adicionales**:
  - **Obligatorio únicamente si el motivo elegido es "Otro motivo"**. Para el resto de los motivos, el campo es opcional.
  - Límites: **mínimo 10 caracteres, máximo 300 caracteres** (contando espacios).
  - Se muestra un contador visible tipo `0/300`.
  - ⚠️ Nota de diseño: hay una versión de la anotación más antigua sin límites (solo "campo obligatorio si Otro motivo") — la versión con límites 10/300 + contador es la más reciente y debe tomarse como vigente.

## 6. Adjuntar archivos (opcional)

- **Totalmente opcional** en todo el flujo — la PU puede avanzar sin adjuntar nada.
- **Cantidad máxima**: hasta **5 archivos**. Al llegar a 5, la sección de carga queda **automáticamente deshabilitada**.
- **Formatos y pesos permitidos**:
  - Imágenes/documentos: `.png`, `.jpg`, `.pdf` — hasta **10 MB** cada uno.
  - Video: `.mp4`, `.mov` — máx. **1 minuto** de duración o **100 MB**.
  - (Marcado como "a confirmar si queremos ajustarlos" en el diseño — ver [§16](#16-puntos-abiertos--a-confirmar-con-negocio)).
- **Botón "Continuar"**: solo se habilita cuando la persona **incluyó al menos un archivo válido** — si la sección es opcional y no cargó nada, el botón de continuar del flujo general no depende de esto (la carga de archivo es su propia mini-validación local: mientras haya un archivo inválido cargado, el botón de esa sección permanece deshabilitado hasta que se reintente con uno válido u opte por "Omitir").
- **Error al cargar un archivo** (formato no compatible o excede tamaño): se muestra mensaje de error en la sección de carga. El botón de avance permanece deshabilitado hasta que: (a) la PU cargue un archivo válido, o (b) elija la opción **"Omitir"**.
- **Cámara**: **confirmado por IMAS-3889** — desde el celular se puede usar la cámara del teléfono para adjuntar directamente. Si ya se cargaron 5 archivos, usar la cámara también queda bloqueado con su **propio mensaje de error** (distinto del error genérico de carga de archivo).
- **Borrado de archivos**: los archivos ya adjuntados **pueden borrarse** antes de continuar (confirmado por IMAS-3889, no estaba documentado en las notas de Figma).
- **Doble validación front + back**: formato, peso y cantidad máxima están validados tanto en frontend como en backend — intentar sortear la validación del front (ej. llamando directo al endpoint) no debería permitir cargar un archivo inválido. Incluir este caso en las pruebas API, no solo E2E.

## 7. Selección de día y horario

- Selección mediante un **componente select** (día + horario).
- **Ventana de disponibilidad**:
  - **Anticipación mínima: 30 minutos** desde el horario actual — no deben mostrarse ni habilitarse horarios que empiecen en menos de 30 min (para asegurar que el equipo reciba la notificación a tiempo).
  - **Ventana máxima: 30 días corridos** hacia adelante desde el momento de agendar. **Confirmado y validado front + back** (IMAS-3889) — el calendario no permite seleccionar fechas fuera de esa ventana ni siquiera manipulando el request directamente al backend.
  - Rango completo a mostrar: **desde ahora+30min hasta ahora+30 días**, calculado dinámicamente (no fecha fija).
- **Franjas horarias**: existen **4 variantes de horarios** disponibles según la franja horaria que la PU seleccione (el diseño ejemplifica con la franja "mañana").
- Componente de selección según plataforma: ver [§15](#15-diferencias-mobile-vs-desktop).

## 8. Pantalla de revisión

- Antes de confirmar, la PU ve un resumen de todo lo cargado (mascota, motivo, comentarios, archivos, día/horario).
- **Editar**: cada sección tiene un ícono de lápiz que redirige a la pantalla específica de esa sección para modificar el dato.
- **Excepción — editar mascota**: si la PU **tiene una sola mascota**, la sección "editar mascota" **no está disponible** en la revisión (no aplica, porque no hubo selección).
- **Archivos adjuntos**: si hay más de un adjunto, la leyenda se actualiza dinámicamente (ej. *"2 archivos adjuntos"*).
- Modal de advertencia asociado a este paso: **"Asegurate de completar bien los datos"** — *"Una vez guardados, solo podrás modificarlos llamando al 0800 122 1183."* (acciones: Continuar / Cancelar).

## 9. Pantalla de confirmación

- Confirma que el turno **ya fue reservado**, indicando cuándo podrá ingresar.
- Informa que puede **cancelar el turno hasta 30 minutos antes** del horario (para liberar el horario).
- Si la PU tiene más de una mascota, en esta pantalla también puede **editar la mascota seleccionada**.

## 10. Detalle del turno (ver / reprogramar / cancelar)

Al entrar al detalle de un turno ya agendado, la PU puede:

| Acción | Reglas |
|---|---|
| **Ingresar** | Botón **deshabilitado por defecto**; se **habilita recién 5 minutos antes** del horario del turno. |
| **Reprogramar** | Redirige directo a la etapa de "seleccionar día y horario" (reutiliza el resto de los datos ya cargados). |
| **Cancelar** | Al tocar "Cancelar" se abre un **modal de doble check**: *"Estás por cancelar tu videollamada"* — *"Si cancelás el turno, vas a perder el horario reservado."* (acciones: Cancelar videollamada / Cerrar). |

- **Hasta 2 turnos por mascota**: el tutor puede tener **hasta 2 turnos paralelos agendados para la misma mascota**, siempre que sean en **horarios distintos**.

## 11. Ingreso a la videollamada (sala de espera)

- Al ingresar (una vez habilitado el botón), se muestra una **pantalla de espera** con consejos útiles para la consulta mientras se conecta.
- **Loader**: debe ser un loader **indeterminado animado** (sin mostrar porcentaje ni tiempo estimado, salvo que ese dato exista en tiempo real). Se mantiene activo hasta que ocurra uno de estos 3 eventos:
  1. la consulta se inicia,
  2. cambia el estado de la videollamada,
  3. ocurre un error de conexión.

## 12. Salida de la videollamada

| Escenario | Comportamiento |
|---|---|
| **Salir dentro de la ventana de cortesía** | Modal doble check: *"Estás por salir de la videollamada"* — *"Podés volver a ingresar hasta 5 minutos después del horario del turno. Luego, perderás la reserva."* (acciones: Abandonar videollamada / Volver a la consulta). Si confirma salir, vuelve a la Home y **puede reingresar** mientras esté dentro de los 5 min posteriores al horario del turno. |
| **Intentar reingresar después de los 5 min de cortesía** | El aviso recordatorio **desaparece de la Home** → **no puede volver a ingresar**, perdió el turno. |
| **Llega tarde directamente** (nunca entró y ya pasaron los 5 min de cortesía desde el horario) | Pierde el turno igual, sin haber llegado a entrar. |
| **En ambos casos de pérdida de turno** | Se agrega un aviso nuevo en la Home notificando la situación, visible durante **1 hora**. |

⚠️ El **tiempo de cortesía de 5 minutos** está marcado explícitamente como **parametrizable/configurable desde código** ("a confirmar"), pensado para poder ajustarse según datos de uso reales — no debería hardcodearse en los tests como una constante inamovible sin volver a chequear este valor contra el ambiente real.

## 13. Límites de turnos por mascota / cupo / OSDE Capitado

Hay **3 variantes de mensaje de error distintas** cuando la PU intenta agendar más turnos de los permitidos — no son intercambiables, cada una aplica a una condición distinta:

| Condición | Mensaje (modal) | Acción sugerida al usuario |
|---|---|---|
| **Ya tiene 2 turnos para la misma mascota** (tope por mascota) | *"Superaste el límite de videollamadas por mascota"* — *"Ya tenés 2 videollamadas programadas para [Mascota]. Podés agendar otra cuando finalice uno de tus turnos activos, o cancelar/reprogramar alguno."* | Cancelar o reprogramar un turno existente de esa mascota. |
| **Tope general de turnos activos** (independiente de mascota) | *"Superaste el límite de videollamadas"* — *"Para agendar una nueva, primero cancelá o reprogramá uno de los turnos actuales."* — nota: la cancelación debe ser **al menos 30 min antes** del horario. | Cancelar/reprogramar alguno de los turnos actuales. |
| **Cupo de consultas online agotado** (plan con cupo mensual/periódico) | *"Superaste el límite de videollamadas"* — *"Para agendar una nueva, tendrás que esperar que se renueve tu cupo de consultas online."* | Esperar la renovación del cupo — no hay acción inmediata posible. |
| **OSDE Capitado / Flux Capitado — tope de 2 videollamadas por año** (⚠️ corregido — IMAS-3909 CA05: no es un tope total/de por vida, es **anual**) | Mismo patrón de modal — el tope es **2 por año** para este segmento. La pantalla exacta que se muestra varía según si la PU **ya tiene o no turnos en curso**. | Esperar a que se renueve el cupo (próximo año / período). |

**Secuencia exacta de validación del tope "2 turnos por la misma mascota"** (IMAS-3909, comentario de validación — más precisa que lo inferible solo de Figma):

1. **PU con 1 sola mascota** y ya tiene 2 turnos agendados → el error aparece directo en la **pantalla previa de turnos ya agendados**, antes de llegar al selector de motivo (nunca ve el selector de mascota, porque no aplica).
2. **PU con 2+ mascotas** y ya tiene 2 turnos para UNA de ellas → el sistema **permite avanzar** hasta la pantalla de selección de mascota. Ahí se bifurca:
   - Elige la **misma** mascota que ya tiene el cupo agotado → error, bloqueado.
   - Elige **otra** mascota con cupo disponible → continúa sin error.

**Analítica requerida** (IMAS-3909 CA08, no estaba en el mapeo de Figma — verificar si es testeable desde QA): deben registrarse eventos de intentos de agendamiento bloqueados, con motivo del bloqueo (tope por mascota vs. tope por plan), plan del usuario, mascota asociada, acceso a "Tus turnos" desde el bloqueo, y abandono del flujo.

## 14. Mensajes de error y estados de falla

| Caso | Comportamiento |
|---|---|
| **Falla de sistema al agendar** (datos completos, pero el guardado falla) | Pantalla de error con explicación breve + botón **"Reintentar"** que vuelve a ejecutar la acción de agendar. Contempla fallas técnicas, problemas de conexión o errores durante el guardado — no es un error de validación de datos. |
| **Error al cargar un archivo adjunto** | Ver [§6](#6-adjuntar-archivos-opcional) — mensaje de error + botón de avance deshabilitado hasta archivo válido u "Omitir". |
| **Error de conexión durante la videollamada** | Corta el loader de la sala de espera (ver [§11](#11-ingreso-a-la-videollamada-sala-de-espera)). |

## 15. Diferencias Mobile vs Desktop

| Aspecto | Mobile | Desktop |
|---|---|---|
| **Selector de rango horario y horarios** | Componente **Bottom Sheet**: se despliega desde abajo; al tocar el input de horario se abre y dentro del mismo componente se ve el detalle de horarios; si se toca fuera, se oculta. | Componente **Drawer**: entra desde la derecha; la pantalla se oscurece con un overlay para enfocar el drawer; si se hace clic fuera, se cierra y sale hacia la derecha. |
| **Resto del flujo** | Mismas pantallas/reglas, solo cambia el layout responsive (`Layout / Mobile` 412×917 en las capturas). | Mismas reglas de negocio (confirmado en las anotaciones — son el mismo set de "Casuística- Horarios de cada franja horaria - Desktop" espejado). |

---

## 16. Puntos abiertos / a confirmar con negocio

Estos son literalmente marcados como pendientes en las anotaciones de diseño (`Header: DESARROLLO | ...`) — **no asumir un comportamiento definitivo en los tests sin re-confirmar contra el ambiente real primero**:

1. ~~**Usar cámara en el momento**~~ — ✅ **Resuelto por IMAS-3889**: sí es posible, confirmado en el comentario de validación ("Desde el celular se puede utilizar la cámara del teléfono").
2. ~~**Cantidad de archivos**~~ — ✅ **Resuelto por IMAS-3889**: el tope es **5**, confirmado y con casuística propia para el bloqueo vía cámara al llegar al tope.
3. ~~**⚠️ Nuevo — discrepancia IMAS-3174 vs. resto de las HUs**~~ — ✅ **Resuelto**: fue un error de redacción en el comentario (copiado de IMAS-3889). Vale Figma: sin pantalla de selección de mascota para el flujo de 1 sola mascota. Ver [`documentation/IMAS-3174-duda-para-daily.md`](IMAS-3174-duda-para-daily.md).
4. **Formatos y pesos permitidos** (`.png/.jpg/.pdf` 10MB, video `.mp4/.mov` 1min/100MB): marcado explícitamente como "a confirmar si queremos ajustarlos". Las HUs confirman que la validación es front+back, pero no repiten los valores numéricos exactos — siguen sin poder darse por definitivos sin chequear config real.
5. **Tiempo de cortesía de 5 minutos** (reingreso post-turno): marcado como parametrizable/editable desde código, no fijo. No mencionado en ninguna de las 4 HUs — sigue siendo un punto abierto solo de Figma.
6. **Botón "Ingresar" se habilita 5 min antes del turno**: hay una nota que dice *"En Refi confirmamos que sí es posible"* — sugiere que en algún momento esto estuvo en duda técnica y ya fue validado, pero vale re-confirmar si "Refi" (probable referencia a un sistema/equipo) sigue siendo la fuente de verdad vigente.
7. **Máximo 30 días de anticipación**: aparece repetido 4 veces de forma idéntica en las notas de Figma, y ahora **confirmado también por IMAS-3889** ("El calendario solo habilita la selección de 30 días desde la fecha actual. Validación realizada en front y back"). Puede considerarse **prácticamente cerrado** — solo falta verificarlo empíricamente contra el ambiente al automatizar.
8. **Nuevo — campo que se invalida al cambiar de mascota en revisión** (IMAS-3889 CA09): no queda claro en la HU qué campo exactamente se pierde/revalida si el usuario cambia de mascota en la pantalla de revisión y la nueva mascota no es compatible con algún dato ya cargado (¿el motivo de consulta, si depende de tipo/especie?). Confirmar en exploración manual antes de escribir el caso.
9. **Nuevo — analítica de bloqueos** (IMAS-3909 CA08): no se sabe si el equipo QA de este proyecto tiene forma de verificar eventos de analítica (dataLayer, tracker de terceros). Si no la tiene, este criterio queda fuera del alcance de las pruebas automatizadas y debe reportarse como tal, no omitirse silenciosamente.

---

## 17. Mapeo a POMs / fixtures existentes

| Elemento del flujo (Figma) | Página/fixture actual en el repo | Notas |
|---|---|---|
| Selector de mascota, motivo, comentarios, archivos, día/horario | `src/pages/vetify/webapp/videocall/VideocallFormPage.ts` | Página de formulario existente — revisar si ya contempla el rediseño por etapas o si sigue el formulario de una sola pantalla (versión anterior). |
| Selección de día/horario (Bottom Sheet / Drawer) | `src/pages/vetify/webapp/videocall/CalendarSchedulingComponent.ts` | Componente separado — bien alineado con el rediseño que trata la selección de horario como su propio paso/componente. |
| Ver / Reprogramar turno | `src/pages/vetify/webapp/videocall/RescheduleVideocallPage.ts`, `VideocallViewPage.ts` | Existe POM dedicado. |
| Cancelar turno (modal doble check) | `src/pages/vetify/webapp/videocall/CancelVideocallModal.ts` | Existe POM dedicado — validar que el texto del modal coincida con el copy de [§10](#10-detalle-del-turno-ver--reprogramar--cancelar). |
| Fixtures wireados | `tests/framework/base-test.ts`, `tests/framework/vetify-base-test.ts` | `videocallFormPage`, `createVideocallViewPage`, `createRescheduleVideocallPage`, `createCancelVideocallModal` ya expuestos vía `container`. |
| Ingreso a videollamada / sala de espera / salida | **No existe POM todavía** | A crear: pantalla de espera con loader + modal de salida (dos variantes: dentro de cortesía / fuera de cortesía). |
| Derivación por credencial incompleta | `src/pages/vetify/webapp/credentials/AddPetFormPage.ts` (a confirmar el punto exacto de entrada desde el flujo de videollamada) | |
| Límites de turnos (por mascota / cupo / OSDE Capitado) | **No existe POM/spec todavía** | Requiere datos de prueba con mascota que ya tenga 2 turnos activos, y un usuario OSDE Capitado con cupo agotado. |

**Spec existente**: ninguno (`tests/projects/**` no tiene ningún `.spec.ts` con "video" en el nombre a la fecha de este documento) — este mapeo es la base para la primera tanda de specs de videollamada.

---

## 18. Casos de prueba

> **Metodología**: diseño basado en riesgo (`riesgo = impacto × probabilidad`, skill `qa-risk-test-design`, NIST combinatorial + ISTQB). Numeración `CP##` reiniciada por HU. **Trazabilidad obligatoria** a los CA de la HU (`CA0X`) y, cuando aplica, al comentario de validación de Paula Scalzo citado en [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877). Los negativos incluyen oráculo de error (mensaje/comportamiento esperado ante falla). **[API]** marca casos que exigen bypassear el frontend y pegarle directo al backend — obligatorio por el comentario de IMAS-3889 ("sortear estas validaciones desde el front no permite vulnerabilidades", doble validación front+back en archivos y calendario). Casos con ⚠️ dependen de un punto abierto de [§16](#16-puntos-abiertos--a-confirmar-con-negocio) — no automatizar la aserción exacta sin confirmar primero contra el ambiente real.

### 18.1 IMAS-3899 — Solicitud de videollamada sin credencial cargada

**Riesgo: Alto** (impacto 3 — es el primer gate del flujo completo de reserva; probabilidad 2 — lógica condicional simple pero crítica) → cobertura mínima aplicada: 1 feliz + 4 negativos/borde.

- **CP01 — Validar bloqueo de avance sin credencial vigente** · Trazabilidad: CA01, CA02
  - Dado: tutor autenticado cuya mascota NO tiene credencial vigente cargada.
  - Cuando: inicia la solicitud de una videollamada.
  - Entonces: el sistema no permite avanzar en la reserva y muestra la pantalla informativa de credencial faltante.
  - Datos: usuario de prueba con mascota sin credencial asociada (crear dinámicamente, sin credencial subida).

- **CP02 — Validar contenido de la pantalla informativa** · Trazabilidad: CA03
  - Dado: flujo interrumpido por falta de credencial.
  - Cuando: se renderiza la pantalla correspondiente.
  - Entonces: se visualiza un mensaje claro indicando la necesidad de cargar la credencial, respetando el diseño de Figma, con una acción principal visible.

- **CP03 — Validar acceso al flujo de carga de credencial desde la pantalla informativa** · Trazabilidad: CA04
  - Dado: usuario viendo la pantalla informativa.
  - Cuando: selecciona la acción principal.
  - Entonces: es redirigido al flujo de carga de credencial (`AddPetFormPage` o equivalente — confirmar punto de entrada exacto, ver [§17](#17-mapeo-a-poms--fixtures-existentes)).

- **CP04 — Validar retomar la solicitud tras cargar la credencial (feliz)** · Trazabilidad: CA05
  - Dado: usuario que acaba de cargar y validar su credencial exitosamente desde el flujo de videollamada.
  - Cuando: finaliza el proceso de carga.
  - Entonces: continúa la solicitud de videollamada **retomando el punto exacto del flujo donde quedó**, sin volver a la Home ni reiniciar la operación (más específico que Figma, ver [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877) punto 1).

- **CP05 — [Negativo] [API] Validar que el backend rechaza la creación de turno sin credencial vigente** · Trazabilidad: CA02
  - Dado: tutor sin credencial vigente.
  - Cuando: se envía una request directa al endpoint de creación de turno, saltando el formulario.
  - Entonces: el backend rechaza la operación (oráculo: status 4xx + mensaje/código de error de credencial faltante, no solo el frontend).
  - Datos: request HTTP directo al servicio de agendamiento con `petId` de una mascota sin credencial.

### 18.2 IMAS-3174 — Rediseño solicitud de turno x 1 mascota

**Riesgo: Alto** (impacto 3 — flujo completo end-to-end de reserva; probabilidad 3 — múltiples pasos/validaciones encadenadas) → cobertura mínima aplicada: 1 feliz completo + 5 negativos/borde.

- **CP01 — Validar flujo feliz completo sin pantalla de selección de mascota** · Trazabilidad: CA01; confirmado en [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877) punto 9 (video revisado, comentario de la HU era error de redacción).
  - Dado: tutor con una única mascota asociada a su plan.
  - Cuando: inicia la solicitud de turno.
  - Entonces: **NO** se muestra pantalla de selección de mascota — la mascota se auto-selecciona y el flujo va directo a "Motivo de la consulta"; completa motivo → adjuntos (opcional) → día/horario → revisión → confirmación exitosamente.

- **CP02 — Validar que "Motivo de la consulta" es un selector cerrado, sin texto libre** · Trazabilidad: CA02
  - Dado: usuario en el paso "Motivo de la consulta".
  - Cuando: interactúa con el campo.
  - Entonces: solo puede elegir una opción de un listado predefinido; no se permite ingresar texto libre (salvo excepción de diseño explícita).

- **CP03 — [Negativo] Validar bloqueo de avance con campo obligatorio vacío** · Trazabilidad: CA03
  - Dado: usuario completando el formulario con un campo obligatorio sin completar.
  - Cuando: intenta avanzar de paso o confirmar.
  - Entonces: el sistema bloquea el avance (oráculo: botón "Continuar"/"Confirmar" deshabilitado o mensaje de validación bloqueante).

- **CP04 — Validar que campos opcionales no bloquean el avance** · Trazabilidad: CA03
  - Dado: usuario con todos los campos obligatorios completos y los opcionales vacíos.
  - Cuando: avanza de paso.
  - Entonces: el flujo continúa sin impedimento.

- **CP05 — Validar pantalla de revisión y edición previa a confirmar** · Trazabilidad: CA06
  - Dado: usuario completó todos los datos del formulario.
  - Cuando: avanza al siguiente paso.
  - Entonces: visualiza una pantalla de revisión con toda la información cargada y puede volver a editar cualquier dato antes de confirmar.

- **CP06 — ⚠️ Validar que la mascota es el único campo NO editable en revisión (caso 1 mascota)** · Trazabilidad: comentario cruzado de IMAS-3889 ("al tratarse de una sola mascota... el único campo que no puede editarse es la mascota. Todos los demás se pueden editar").
  - Dado: usuario en la pantalla de revisión del flujo de 1 mascota.
  - Cuando: intenta editar cada campo mostrado.
  - Entonces: todos los campos son editables excepto la mascota (no aplica selector de mascota en este flujo). Confirmar contra el ambiente real antes de fijar la aserción, ya que el comentario fuente pertenece a otra HU.

- **CP07 — Validar pantalla de confirmación** · Trazabilidad: CA07
  - Dado: usuario confirma la solicitud con datos válidos.
  - Cuando: la operación finaliza correctamente.
  - Entonces: visualiza la pantalla de confirmación según el diseño aprobado (turno generado, ID visible/recuperable para casos siguientes).

- **CP08 — Validar que el proceso de comunicaciones posterior no se modifica** · Trazabilidad: CA08
  - Dado: turno generado exitosamente.
  - Cuando: finaliza la solicitud.
  - Entonces: se ejecuta el mismo proceso de comunicaciones ya existente (contenido, canal, timing sin cambios). **Nota de cobertura**: si el proyecto no tiene forma de verificar el envío real (email/push) en el pipeline automatizado, este caso queda como verificación manual/smoke — reportarlo así, no omitirlo silenciosamente.

### 18.3 IMAS-3889 — Rediseño solicitud de turno +1 mascota

**Riesgo: Alto** (impacto 3 — mismo flujo crítico de reserva + lógica adicional de selección/edición de mascota; probabilidad 3 — mayor cantidad de ramas que 3174) → cobertura mínima aplicada: 1 feliz + 9 negativos/borde (incluye 2 casos **[API]** de bypass).

- **CP01 — Validar selector de mascota obligatorio antes de continuar** · Trazabilidad: CA02
  - Dado: tutor con más de una mascota asociada a su plan.
  - Cuando: inicia la solicitud del turno.
  - Entonces: el sistema muestra un selector con todas las mascotas habilitadas; no permite avanzar sin seleccionar una.

- **CP02 — [Negativo] Validar bloqueo de "Continuar" sin mascota seleccionada** · Trazabilidad: CA02
  - Dado: usuario en el selector de mascota, sin elegir ninguna.
  - Cuando: intenta continuar.
  - Entonces: el botón permanece deshabilitado o se muestra bloqueo explícito.

- **CP03 — Validar continuidad idéntica al flujo de 1 mascota tras seleccionar** · Trazabilidad: CA03
  - Dado: usuario seleccionó una mascota.
  - Cuando: continúa la solicitud.
  - Entonces: el resto del flujo (motivo → adjuntos → día/horario → revisión → confirmación) se comporta igual que en IMAS-3174.

- **CP04 — Validar motivo: texto libre filtra opciones del listado** · Trazabilidad: comentario IMAS-3889 (i).
  - Dado: usuario en el campo "Motivo de la consulta".
  - Cuando: escribe texto.
  - Entonces: el listado se filtra por las opciones existentes que coinciden (no se guarda como texto libre).

- **CP05 — Validar que elegir un motivo distinto de "otro motivo" habilita "Continuar"** · Trazabilidad: comentario IMAS-3889 (ii).
  - Dado: usuario selecciona cualquier motivo del listado excepto "otro motivo".
  - Cuando: revisa el estado del botón.
  - Entonces: "Continuar" se habilita sin requerir campos adicionales.

- **CP06 — [Negativo] Validar que "otro motivo" vuelve obligatorio el comentario adicional** · Trazabilidad: comentario IMAS-3889 (iii).
  - Dado: usuario selecciona el motivo "otro motivo".
  - Cuando: intenta continuar sin completar "comentarios adicionales".
  - Entonces: "Continuar" permanece deshabilitado hasta completar ese campo (oráculo: campo marcado como requerido/mensaje de validación).

- **CP07 — Validar edición de mascota en pantalla de revisión conservando datos válidos** · Trazabilidad: CA09
  - Dado: usuario en revisión detecta que eligió la mascota incorrecta.
  - Cuando: cambia la mascota seleccionada por otra válida.
  - Entonces: el sistema actualiza la solicitud con la nueva mascota y conserva el resto de los datos ya cargados, sin reiniciar el flujo.

- **CP08 — ⚠️ [Negativo/borde] Validar invalidación de campo dependiente al cambiar de mascota** · Trazabilidad: CA09; punto abierto [§16](#16-puntos-abiertos--a-confirmar-con-negocio) #8.
  - Dado: usuario en revisión cambia a una mascota cuyo tipo/especie invalida un dato ya cargado (ej. motivo dependiente de especie, si existiera).
  - Cuando: confirma el cambio de mascota.
  - Entonces: el campo afectado se invalida y se solicita recarga — **confirmar en exploración manual contra el ambiente antes de fijar qué campo exacto es**; no asumir.

- **CP09 — Validar botón "Continuar" en adjuntos deshabilitado sin al menos 1 archivo** · Trazabilidad: comentario IMAS-3889 (i, sección archivos).
  - Dado: usuario en el paso de adjuntos, sin cargar ningún archivo (paso opcional en 3174, pero con esta regla específica cuando se decide adjuntar).
  - Cuando: revisa el estado de "Continuar" tras iniciar la carga.
  - Entonces: permanece deshabilitado hasta cargar al menos un archivo, si el paso lo requiere.

- **CP10 — [Negativo] Validar rechazo de formato de archivo no permitido** · Trazabilidad: comentario IMAS-3889 (ii).
  - Dado: usuario intenta adjuntar un archivo fuera de los formatos permitidos (`.png/.jpg/.pdf/.mp4/.mov`, ⚠️ límites exactos a confirmar, ver [§16](#16-puntos-abiertos--a-confirmar-con-negocio) #4).
  - Cuando: selecciona el archivo.
  - Entonces: no se carga el archivo (oráculo: mensaje de error de formato inválido, sin subida).

- **CP11 — [Negativo] Validar rechazo de archivo que excede el peso permitido** · Trazabilidad: comentario IMAS-3889 (iii).
  - Dado: usuario intenta adjuntar un archivo más pesado que el límite (⚠️ valor exacto a confirmar).
  - Cuando: selecciona el archivo.
  - Entonces: aparece mensaje de error y el archivo no se carga.

- **CP12 — [Borde] Validar bloqueo del botón de subir al llegar a 5 archivos** · Trazabilidad: comentario IMAS-3889 (iv).
  - Dado: usuario ya cargó 5 archivos.
  - Cuando: intenta agregar un 6to archivo vía el botón de adjuntar.
  - Entonces: el botón para subir archivos está deshabilitado.

- **CP13 — [Borde, mobile] Validar bloqueo específico de cámara al llegar a 5 archivos** · Trazabilidad: comentario IMAS-3889 (vii).
  - Dado: usuario mobile ya cargó 5 archivos.
  - Cuando: intenta usar la cámara para agregar uno más.
  - Entonces: se bloquea con su propio mensaje de error (distinto del error genérico de carga).

- **CP14 — Validar que los archivos cargados pueden borrarse** · Trazabilidad: comentario IMAS-3889 (v).
  - Dado: usuario con al menos 1 archivo cargado.
  - Cuando: selecciona borrar ese archivo.
  - Entonces: el archivo se elimina de la lista de adjuntos.

- **CP15 — [Negativo] [API] Validar bypass de validaciones de archivos directo al backend** · Trazabilidad: comentario IMAS-3889 (viii): "sortear estas validaciones desde el front no permite vulnerabilidades".
  - Dado: request directa al endpoint de upload de archivos (`/api/files/upload/pets` según POM actual).
  - Cuando: se envía un archivo con formato inválido, peso excedido, o un 6to archivo saltando la validación de UI.
  - Entonces: el backend rechaza igualmente la operación (oráculo: status 4xx / error estructurado, no solo el frontend).

- **CP16 — Validar que el calendario solo habilita 30 días de anticipación (front)** · Trazabilidad: comentario IMAS-3889; confirmado también en [§16](#16-puntos-abiertos--a-confirmar-con-negocio) #7.
  - Dado: usuario en el selector de día.
  - Cuando: intenta seleccionar una fecha más allá de 30 días desde hoy.
  - Entonces: la fecha no está habilitada/seleccionable en el calendario.

- **CP17 — [Negativo] [API] Validar rechazo de fecha fuera de ventana de 30 días directo al backend** · Trazabilidad: comentario IMAS-3889 ("validación realizada en front y back").
  - Dado: request directa de creación de turno con una fecha > 30 días desde hoy.
  - Cuando: se envía la request saltando el calendario de UI.
  - Entonces: el backend rechaza la operación.

- **CP18 — Validar pantalla de confirmación y proceso de comunicaciones sin cambios** · Trazabilidad: CA10, CA11 (mismo criterio que CP07/CP08 de [§18.2](#182-imas-3174--rediseño-solicitud-de-turno-x-1-mascota), reutilizar el mismo caso adaptado a multi-mascota).

### 18.4 IMAS-3909 — Casuísticas especiales — Con turno previo (límites)

**Riesgo: Alto** (impacto 3 — bloquea agendamiento, afecta relación con el plan/cupo del cliente; probabilidad 3 — múltiples ramas mascota única/multi-mascota/plan capitado) → cobertura mínima aplicada: 1 feliz (camino sin bloqueo) + 7 negativos/borde.

- **CP01 — Validar bloqueo temprano con mascota única en el límite (2 turnos)** · Trazabilidad: CA01, CA02; comentario IMAS-3909 punto 2.
  - Dado: tutor con una única mascota que ya tiene 2 turnos agendados.
  - Cuando: intenta iniciar una nueva solicitud de videollamada.
  - Entonces: el mensaje de error aparece **en la pantalla previa de "turnos ya agendados"**, antes de llegar al selector de motivo (más específico que Figma, ver [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877) punto 8).

- **CP02 — Validar avance permitido en multi-mascota con 1 mascota en el límite** · Trazabilidad: comentario IMAS-3909 punto 3.
  - Dado: tutor con más de una mascota, una de ellas con 2 turnos ya agendados.
  - Cuando: inicia una nueva solicitud.
  - Entonces: el sistema permite avanzar hasta la pantalla de selección de mascota (no bloquea antes).

- **CP03 — [Negativo] Validar bloqueo al re-elegir la mascota que ya está en el límite** · Trazabilidad: comentario IMAS-3909 (i).
  - Dado: usuario en el selector de mascota, con la mascota en el límite disponible como opción.
  - Cuando: selecciona esa misma mascota (2 turnos ya agendados).
  - Entonces: aparece el mensaje de error y no puede continuar.

- **CP04 — Validar continuidad al elegir otra mascota con cupo disponible** · Trazabilidad: comentario IMAS-3909 (ii).
  - Dado: usuario en el selector de mascota, con al menos una mascota sin llegar al límite.
  - Cuando: selecciona esa otra mascota.
  - Entonces: continúa el flujo sin error.

- **CP05 — Validar acceso a "Tus turnos" desde la pantalla de bloqueo** · Trazabilidad: CA03.
  - Dado: usuario bloqueado por límite de turnos.
  - Cuando: selecciona la acción "Tus turnos".
  - Entonces: es redirigido a la sección donde puede ver sus turnos actuales.

- **CP06 — [Negativo] Validar bloqueo anual para plan OSDE Capitado / Flux Capitado** · Trazabilidad: CA04, CA05; corrección de [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877) punto 6 (tope es **anual**, no de por vida).
  - Dado: tutor con plan OSDE Capitado o Flux Capitado que ya usó 2 videollamadas **en el año en curso**.
  - Cuando: intenta agendar una nueva videollamada.
  - Entonces: se bloquea y se muestra la pantalla informativa indicando que agotó el máximo disponible, con mensaje de cuándo podrá volver a solicitar.

- **CP07 — [Borde] Validar renovación de cupo OSDE Capitado en cambio de año** · Trazabilidad: corrección de [§0](#0-trazabilidad-con-hus-de-jira-sprint-actual-epic-imas-2877) punto 6.
  - Dado: tutor OSDE Capitado que usó 2 videollamadas el año anterior (no en el año actual).
  - Cuando: intenta agendar una videollamada en el año actual.
  - Entonces: el sistema permite continuar (cupo renovado). Datos de prueba: requiere poder controlar/mockear la fecha de referencia o usar datos con turnos fechados el año previo.

- **CP08 — Validar diferenciación del mensaje según motivo de bloqueo** · Trazabilidad: CA06.
  - Dado: dos escenarios de bloqueo distintos (límite por mascota vs. límite por plan capitado).
  - Cuando: se muestra la pantalla informativa en cada caso.
  - Entonces: el mensaje mostrado es distinto y corresponde al motivo real del bloqueo.

- **CP09 — Validar que el límite aplica solo a la mascota seleccionada** · Trazabilidad: CA07.
  - Dado: tutor con múltiples mascotas, solo una en el límite.
  - Cuando: agenda para una mascota distinta a la bloqueada.
  - Entonces: no se aplica el bloqueo (cubierto también por CP04, se deja como caso de regresión explícito por su propio AC).

- **CP10 — ⚠️ [Fuera de alcance a confirmar] Analítica de eventos de bloqueo** · Trazabilidad: CA08; punto abierto [§16](#16-puntos-abiertos--a-confirmar-con-negocio) #9.
  - No incluir aserciones de analítica (dataLayer/tracker) hasta confirmar si el proyecto QA tiene forma de verificarlas. **Si no la tiene, reportar como brecha de cobertura explícita, no omitir silenciosamente.**

### 18.5 IMAS-3894 — Visualización, reprogramación, cancelación e ingreso a turno

**Riesgo: Medio-Alto** (impacto 3 — gestión de un turno ya reservado, afecta la confianza del usuario en el servicio; probabilidad 2 — flujo con menos ramas que el agendamiento) → cobertura mínima aplicada: 1 feliz de detalle + reprogramación + cancelación; CA05 (positivo)/CA06-08 (sala de espera)/CA09 (comunicaciones) documentados como brecha/fuera de alcance, no omitidos silenciosamente.

- **CP01 — Validar aviso destacado en Home y acceso al detalle** · Trazabilidad: CA01.
  - Dado: tutor con un turno futuro agendado.
  - Cuando: ingresa a la Home.
  - Entonces: ve un aviso con la fecha/hora del turno más próximo y puede acceder al detalle. **Confirmado vía MCP**: con un único turno agendado, "Ir al detalle" navega directo a `/petsAssistance/{id}`; con 2+ turnos (no automatizado, solo observado manualmente) pasa primero por la lista "Tus turnos".

- **CP02 — Validar contenido del detalle del turno** · Trazabilidad: CA02.
  - Dado: usuario en el detalle de un turno.
  - Cuando: se renderiza la pantalla.
  - Entonces: muestra mascota, fecha/hora y motivo correctos, con "Ingresar" deshabilitado (fuera de ventana) y "Cancelar" habilitado. **Hallazgo (BUG-003, `docs/bugs/`)**: el campo "Estado del turno" que exige CA02 no se muestra en ningún caso.

- **CP03 — Validar cancelación con doble check** · Trazabilidad: CA03.
  - Dado: usuario en el detalle, turno cancelable (≥30 min antes).
  - Cuando: presiona "Cancelar" y confirma en el modal.
  - Entonces: el modal pide confirmación con copy exacto ("Estás por cancelar tu videollamada" / "Si cancelás el turno, vas a perder el horario reservado.") y, al confirmar, se cancela y se muestra la pantalla "Tu turno fue cancelado".

- **CP04 — Validar reprogramación reutilizando mascota y motivo** · Trazabilidad: CA04.
  - Dado: usuario en el detalle, turno reprogramable.
  - Cuando: presiona "Reprogramar", elige nuevo día/horario y confirma.
  - Entonces: reutiliza mascota y motivo sin pedirlos de nuevo, y confirma con la nueva fecha/hora. **Hallazgo (BUG-003)**: el backend genera una `assistanceId` nueva y deja la anterior en `CANCELADO`; el detalle de la `assistanceId` vieja sigue mostrándose como activo si se navega directo a esa URL.

- **CP05 — ⚠️ [Brecha de cobertura] Validar habilitación de "Ingresar" dentro de la ventana de 5 min** · Trazabilidad: CA05 (caso positivo).
  - No automatizable de forma estable: requiere esperar en tiempo real a que un turno entre en la ventana de 5 min, lo cual choca con la anticipación mínima de 30 min que exige el propio wizard de agendamiento ([§7](#7-selección-de-día-y-horario)). Confirmado manualmente vía MCP contra QA real: el botón se habilita correctamente dentro de la ventana. El caso negativo (deshabilitado fuera de ventana) sí está automatizado (CP02).

- **CP06 — [Fuera de alcance] Sala de espera, ingreso y salida de la videoconsulta** · Trazabilidad: CA06, CA07, CA08.
  - Requiere una sesión de videoconferencia real con un profesional conectado del otro lado — no reproducible desde QA automatizado sin un simulador de proveedor.

- **CP07 — [Fuera de alcance] Comunicaciones tras cancelar/reprogramar** · Trazabilidad: CA09.
  - Mismo criterio que CP08 de IMAS-3174: no hay forma de verificar el envío real de email/push en el pipeline automatizado.

### 18.6 Resumen de cobertura y siguientes pasos

| HU | # Casos diseñados | Feliz | Negativos/borde | API (bypass) | Pendientes de confirmar (⚠️) / fuera de alcance |
|---|---|---|---|---|---|
| IMAS-3899 | 5 | 2 | 2 | 1 | 0 |
| IMAS-3174 | 8 | 5 | 3 | 0 | 1 (CP06) |
| IMAS-3889 | 18 | 6 | 10 | 2 | 1 (CP08) |
| IMAS-3909 | 10 | 4 | 5 | 0 | 1 (CP10) |
| IMAS-3894 | 7 | 4 | 0 | 0 | 3 (CP05, CP06, CP07) |
| **Total** | **48** | **21** | **20** | **3** | **6** |

**Siguiente paso natural**: extender/crear los POMs faltantes (ver [§17](#17-mapeo-a-poms--fixtures-existentes) — pantalla de selección de mascota, pantalla de bloqueo por límite, pantalla informativa de credencial) y escribir los `.spec.ts` en `tests/projects/vetify-webapp/` siguiendo la skill `qa-spec-conventions` de este repo, empezando por IMAS-3174 (flujo más simple, sin ramas de selección de mascota) como piloto antes de replicar en las otras 3 HUs.
