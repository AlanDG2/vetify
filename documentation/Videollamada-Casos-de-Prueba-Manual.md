# Videollamada (rediseño) — Casos de prueba para validación manual

> Origen: [`Videollamada-Nuevo-Flujo-Figma-Mapeo.md`](Videollamada-Nuevo-Flujo-Figma-Mapeo.md) §18 (41 casos, metodología `qa-risk-test-design`).
> Formato: Precondición / Pasos / Resultado esperado — pensado para ir tildando manualmente contra el ambiente QA real antes de automatizar.
> Estado de este documento: **actualizado 2026-08-04** — validación real contra QA (MCP Playwright + `npx playwright test`) y automatización en `tests/projects/vetify-webapp/videocall.spec.ts`. Leyenda: ✅🤖 automatizado y pasando en esta sesión · ✅👁️ confirmado manualmente (MCP), no automatizado aún · 🐛 discrepancia/bug real encontrado · ⏭️ brecha de cobertura documentada (dato de prueba no disponible, no omitido silenciosamente) · ⚠️ pendiente de re-confirmar.
> Nota de usuarios de prueba: ver [`HANDOFF-CLAUDE-MCP-videollamada.md`](HANDOFF-CLAUDE-MCP-videollamada.md) §4 — "credencial de la mascota" = completar los datos de la mascota (`AddPetFormPage`, ruta `/pets`). Un plan con tag `PLAN_WITHOUT_PET` en `pooled-users.json` sirve como precondición de "mascota sin credencial". **Actualización 2026-08-04**: el único usuario `NO_PET` del pool se consumió durante la validación de CP04 (ver IMP-003 en `docs/impedimentos-bloqueos.md`) — el test de UI de CP01 ahora hace un chequeo dinámico vía API y se auto-skipea si no encuentra la precondición, en vez de asumir el tag.

---

## IMAS-3899 — Solicitud de videollamada sin credencial cargada (5 casos)

### CP01 — ✅🤖 Validar bloqueo de avance sin credencial vigente
- **Precondición**: tutor autenticado con una mascota SIN credencial vigente cargada (plan con tag `PLAN_WITHOUT_PET`).
- **Pasos**:
  1. Iniciar sesión.
  2. Iniciar solicitud de videollamada para esa mascota/plan.
- **Resultado esperado**: no se permite avanzar en la reserva; se muestra la pantalla informativa de credencial faltante.
- **Confirmado 2026-08-04 (MCP)**: correcto. Con `user_1782309546559@automation.com` (tags `ACTIVE, NO_PET, PLAN_WITHOUT_PET` en ese momento), el flujo se detiene en "Completá su credencial" antes de llegar al selector de motivo.
- **✅ IMP-003 resuelto 2026-08-05**: se generó un usuario `NO_PET` fresco funcional (`user_1785886357504_7fce46f5@automation.com`, vía `UserFactory` + esperar la propagación de la compra antes de validar, ver IMP-004) y se agregó al pool. `TS-01 TC-01` ya no está en skip — **pasando**, corrido con `-g "IMAS-3899"` y dentro de la suite completa.

### CP02 — ✅🤖 Validar contenido de la pantalla informativa
- **Precondición**: flujo interrumpido por falta de credencial (llegar al estado de CP01).
- **Pasos**:
  1. Observar la pantalla mostrada.
- **Resultado esperado**: mensaje claro indicando la necesidad de cargar la credencial, según diseño de Figma, con una acción principal visible.
- **Confirmado 2026-08-04 (MCP)**: encabezado "Completá su credencial" + texto "Para agendar una videollamada, primero necesitamos los datos de tu mascota." + bloque "Dejá su credencial lista" con botón "Completar credencial" visible. Coincide con el diseño esperado.
- **Automatización**: aserciones incluidas en `TS-01 TC-01` — **pasando** (ver CP01).

### CP03 — ✅🤖 Validar acceso al flujo de carga de credencial desde la pantalla informativa
- **Precondición**: usuario viendo la pantalla informativa (CP02).
- **Pasos**:
  1. Seleccionar la acción principal de la pantalla.
- **Resultado esperado**: redirige al flujo de carga de credencial (confirmar si es `AddPetFormPage` o equivalente).
- **Confirmado 2026-08-04 (MCP)**: redirige a `/pets/<petId>`, pantalla "¡Vamos a empezar!" del flujo `AddPetFormPage` existente — confirmado.
- **Automatización**: aserción de URL (`waitForURL(/\/pets\/.+/)`) incluida en `TS-01 TC-01` — **pasando**. Al automatizar se encontró y corrigió un locator ambiguo en `AddPetFormPage.ts` (`stepTitleLbl` matcheaba tanto el título del paso como el heading del modal de advertencia "Asegurate de completar bien los datos", que en este punto de entrada aparecen juntos en pantalla — nunca se había ejercitado este camino de entrada antes, por el skip de IMP-003).

### CP04 — 🐛 Validar retomar la solicitud tras cargar la credencial (feliz)
- **Precondición**: usuario en medio del flujo de carga de credencial iniciado desde CP03.
- **Pasos**:
  1. Completar y validar la carga de credencial exitosamente.
- **Resultado esperado**: continúa la solicitud de videollamada retomando el punto exacto donde quedó — **no** vuelve a la Home ni reinicia la operación.
- **Resultado real 2026-08-04 (MCP), RE-CONFIRMADO 2026-08-05 con usuario limpio**: **DISCREPANCIA sigue vigente**. Al completar la carga de credencial (nombre, tipo, género, raza, edad, foto) con `user_1785886357504_7fce46f5@automation.com`, la pantalla de éxito ("¡TestBug001 ya tiene su credencial lista!") sigue ofreciendo únicamente el botón **"Ir al inicio"**, que navega a `/` (Home). No hay ninguna redirección de vuelta al flujo de videollamada ni rastro de la solicitud en curso — contradice el comentario de validación de la HU citado en el mapeo funcional §0 punto 1. **Jira**: IMAS-4102 (tipo Error, linkeado con "Blocks" a IMAS-3899), sigue abierto — bloquea el criterio 6 del DoD.
- **Automatización**: no automatizado como test de regresión todavía (requiere completar todo el wizard de `AddPetFormPage` con datos únicos por corrida — factible ahora que hay un usuario `NO_PET` reproducible, candidato para la siguiente pasada).

### CP05 — ✅🤖 [Negativo] [API] Validar que el backend rechaza la creación de turno sin credencial vigente
- **Precondición**: tutor sin credencial vigente; acceso a Postman/cliente HTTP con token de sesión válido.
- **Pasos**:
  1. Enviar request directa al endpoint de creación de turno con el `petId` de la mascota sin credencial, saltando el formulario de UI.
- **Resultado esperado**: el backend rechaza la operación — status 4xx + mensaje/código de error de credencial faltante (no debe depender solo de la validación de frontend).
- **Automatización**: `TS-01 TC-02` — **pasando**. Usa `VetifyWebappApiClient.scheduleVideocall({ petId })` contra un plan sin mascota del usuario logueado; el backend rechaza la operación.

---

## IMAS-3174 — Rediseño solicitud de turno x 1 mascota (8 casos)

### CP01 — Validar flujo feliz completo sin pantalla de selección de mascota
- **Precondición**: tutor con una única mascota asociada a su plan (con credencial vigente).
- **Pasos**:
  1. Iniciar solicitud de turno.
  2. Completar motivo.
  3. Adjuntar archivo (opcional, se puede omitir).
  4. Elegir día/horario.
  5. Revisar datos.
  6. Confirmar.
- **Resultado esperado**: NO aparece pantalla de selección de mascota (se auto-selecciona) — va directo a "Motivo de la consulta"; todo el flujo se completa exitosamente hasta la confirmación.
- **✅🤖 Automatizado y pasando** — `TS-02 TC-01` (`tests/projects/vetify-webapp/videocall.spec.ts`), cubre este CP y CP02, CP04, CP05, CP06, CP07 en un solo test. Confirmado contra QA real (turno creado exitosamente vía UI, `POST /api/services/assistance/493/create` → 200).
- **Nota de idempotencia**: el test tiene un `beforeEach` que cancela turnos previos de la mascota antes de correr — necesario porque el límite real de 2 turnos/mascota (IMAS-3909) bloquearía reruns consecutivos con el mismo usuario pooled.
- **CA05 (3 franjas horarias) agregado 2026-08-04**: el mismo test ahora verifica explícitamente (vía "Editar fecha y hora") que las 3 franjas Mañana/Tarde/Noche están visibles en el Drawer, no solo que se puede elegir una.

### CP02 — ✅🤖 Validar que "Motivo de la consulta" es un selector cerrado, sin texto libre
- **Precondición**: usuario en el paso "Motivo de la consulta".
- **Pasos**:
  1. Intentar escribir un texto libre no listado en el campo.
- **Resultado esperado**: solo permite elegir una opción del listado predefinido; no acepta guardar texto libre como motivo (salvo excepción de diseño explícita).
- **Confirmado**: texto libre no listado ("TextoLibreQueNoExiste123") muestra "No encontramos coincidencias." y el botón Continuar permanece deshabilitado. El listado real (orden alfabético, "Otro motivo" al final): Control después de una cirugía, Enfermedades crónicas, Revisión de estudios, Seguimiento de tratamiento, Síntomas leves o cambios recientes, Vacunas y desparasitación, Otro motivo.
- **Automatización**: incluido en `TS-02 TC-01`.

### CP03 — [Negativo] Validar bloqueo de avance con campo obligatorio vacío
- **Precondición**: usuario completando el formulario con un campo obligatorio sin completar.
- **Pasos**:
  1. Dejar vacío un campo obligatorio.
  2. Intentar avanzar de paso o confirmar.
- **Resultado esperado**: el avance se bloquea (botón "Continuar"/"Confirmar" deshabilitado o mensaje de validación bloqueante).
- **Automatización**: cubierto implícitamente por CP02 (Motivo vacío/inválido → Continuar deshabilitado). No se agregó un test dedicado por campo — se prioriza cobertura vs. cantidad de tests, ver criterio del usuario.

### CP04 — ✅🤖 Validar que campos opcionales no bloquean el avance
- **Precondición**: campos obligatorios completos, opcionales vacíos.
- **Pasos**:
  1. Avanzar de paso sin completar los campos opcionales.
- **Resultado esperado**: el flujo continúa sin impedimento.
- **Confirmado**: con Motivo distinto de "Otro motivo" seleccionado, "Comentarios adicionales" (opcional) vacío, y adjuntos omitidos (botón "Omitir"), el flujo avanza sin bloqueo hasta confirmación.
- **Automatización**: incluido en `TS-02 TC-01`.

### CP05 — ✅🤖 Validar pantalla de revisión y edición previa a confirmar
- **Precondición**: usuario completó todos los datos del formulario.
- **Pasos**:
  1. Avanzar al siguiente paso tras completar día/horario.
- **Resultado esperado**: se ve una pantalla de revisión con toda la información cargada, con opción de editar cualquier dato antes de confirmar.
- **Confirmado**: pantalla "Revisá los datos y confirmá tu turno" con bloques Mascota, Fecha y hora, Motivo, Adjuntos — cada uno (excepto Mascota) con botón "Editar".
- **~~Hallazgo no buscado: bloque "Mascota" con UUID crudo~~ — ✅ Retractado 2026-08-04**: se observó una vez con la cuenta `user_1782309368512@automation.com`, pero era contaminación de esa cuenta (reutilizada muchas veces en la misma sesión). Repetido con una cuenta distinta (`user_1782845996861@automation.com`, ver CP01-03 de IMAS-3889) y el bloque "Mascota" mostró el nombre correcto. Ver `docs/bugs/BUG-002-uuid-crudo-pantalla-revision.md` para el detalle completo de la retractación.
- **Automatización**: incluido en `TS-02 TC-01`.

### CP06 — ✅🤖 Validar que la mascota es el único campo NO editable en revisión
- **Precondición**: usuario en la pantalla de revisión del flujo de 1 mascota.
- **Pasos**:
  1. Intentar editar cada campo mostrado en la revisión.
- **Resultado esperado**: todos los campos son editables excepto la mascota.
- **Confirmado 2026-08-04**: correcto — no existe botón "Editar mascota" en el flujo de 1 sola mascota; Fecha y hora, Motivo y Adjuntos sí tienen "Editar". Se resuelve el punto ⚠️ original: aplica igual en IMAS-3174 (no solo en el comentario de IMAS-3889 del que se citó).
- **Automatización**: incluido en `TS-02 TC-01` (aserción `expect(page.getByRole('button', {name: 'Editar mascota'})).not.toBeVisible()`).

### CP07 — ✅🤖 Validar pantalla de confirmación
- **Precondición**: usuario confirma la solicitud con datos válidos.
- **Pasos**:
  1. Confirmar la solicitud.
- **Resultado esperado**: se ve la pantalla de confirmación según diseño aprobado — turno generado, con ID visible/recuperable.
- **Confirmado**: `POST /api/services/assistance/493/create` responde 200 con `assistanceId` — el turno se crea exitosamente.
- **✅ Gap cerrado 2026-08-04**: se detectó en auditoría de DoD que el test solo validaba la respuesta HTTP, sin verificar la pantalla de confirmación que CA07 exige explícitamente ("visualizará una pantalla de confirmación según el diseño aprobado"). Confirmado el copy real vía MCP: "¡\<Mascota\> ya tiene su turno reservado!" + fecha/hora + botón "Ir al inicio". Se agregó `verifyConfirmationScreen()` a `VideocallFormPage.ts` y un paso dedicado en `TS-02 TC-01` que la ejecuta antes de navegar a Home.
- **Automatización**: incluido en `TS-02 TC-01`.

### CP08 — ✅👁️ Validar que el proceso de comunicaciones posterior no se modifica
- **Precondición**: turno generado exitosamente.
- **Pasos**:
  1. Finalizar la solicitud.
  2. Ir a Home.
- **Resultado esperado**: se ejecuta el mismo proceso de comunicaciones ya existente (contenido, canal, timing sin cambios).
- **✅ Aclarado 2026-08-04 (corrección de interpretación)**: "el proceso de comunicaciones" **no es email/push externo** — es el banner in-app naranja/amarillo en la Home ("Tenés una videollamada programada — Para el día DD/MM/AA a las HH:MM h." con botón "Ir al detalle"), documentado también en §2 del mapeo funcional. Confirmado manualmente por el usuario del proyecto tras reservar un turno real y volver a Home.
- **✅🤖 Automatizado 2026-08-04**: `TS-02 TC-01` ahora navega a Home tras confirmar el turno y verifica el banner (`upcomingVideocallBannerLbl`) + botón "Ir al detalle" (`goToVideocallDetailBtn`), agregados a `HomePage.ts`. Pasando establemente en 2 corridas consecutivas.
- **Nota técnica**: al agregar este paso se detectó y corrigió una condición de carrera latente — `TC-01` y `TC-02` comparten el mismo usuario pooled (`reserve: false`) y corren en paralelo; el `beforeEach` que cancela turnos previos ahora es best-effort (`.catch(() => {})`) para no fallar si otro test cambió el estado del turno concurrentemente durante la limpieza.

---

## IMAS-3889 — Rediseño solicitud de turno +1 mascota (18 casos)

> **✅ IMP-003 parcialmente resuelto 2026-08-04**: `user_1782845996861@automation.com` (2 planes) se completó con una segunda mascota real ("Kira2") vía UI/MCP — ahora es un usuario multi-mascota funcional, ya actualizado en `pooled-users.json` (tags `ACTIVE, WITH_PET, NO_EMPTY_PLAN`, `numberOfPlans: 2`). CP01-CP03 automatizados con este usuario.
> **✅ CP07/CP08/CP18 cerrados 2026-08-04**: `TS-03 TC-06` (nuevo) cubre el flujo completo — selección de mascota, edición desde la revisión, confirmación y banner de Home — con el usuario multi-mascota real. CP13 (mobile) sigue bloqueado — el proyecto mobile está deshabilitado en `playwright.config.ts`.

### CP01 — ✅🤖 Validar selector de mascota obligatorio antes de continuar
- **Precondición**: tutor con más de una mascota asociada a su plan.
- **Pasos**: 1. Iniciar la solicitud del turno.
- **Resultado esperado**: se muestra un selector con todas las mascotas habilitadas; no permite avanzar sin elegir una.
- **Confirmado 2026-08-04**: pantalla "Elegí para quién es la consulta" con selector tipo dropdown (botón "Seleccionar" que despliega la lista de mascotas), "Continuar" deshabilitado hasta elegir.
- **Automatización**: `TS-03 TC-05` — **pasando**, con `user_1782845996861@automation.com`.

### CP02 — ✅🤖 [Negativo] Validar bloqueo de "Continuar" sin mascota seleccionada
- **Precondición**: usuario en el selector de mascota, sin elegir ninguna.
- **Pasos**: 1. Intentar continuar sin seleccionar.
- **Resultado esperado**: el botón permanece deshabilitado o se muestra bloqueo explícito.
- **Automatización**: cubierto en `TS-03 TC-05` (misma aserción que CP01).

### CP03 — ✅🤖 Validar continuidad idéntica al flujo de 1 mascota tras seleccionar
- **Precondición**: usuario seleccionó una mascota del selector.
- **Pasos**: 1. Continuar la solicitud (motivo → adjuntos → día/horario → revisión → confirmación).
- **Resultado esperado**: el resto del flujo se comporta igual que en IMAS-3174.
- **Confirmado**: tras elegir "Kira2", el flujo llega directo a "Seleccioná el motivo de tu consulta" con el bloque "Mascota" mostrando el nombre correcto — idéntico al flujo de 1 mascota.
- **Automatización**: `TS-03 TC-05` — **pasando**.

### CP04 — ✅👁️🤖 Validar motivo: texto libre filtra opciones del listado
- **Precondición**: usuario en el campo "Motivo de la consulta".
- **Pasos**: 1. Escribir texto libre en el campo.
- **Resultado esperado**: el listado se filtra por las opciones existentes que coinciden (no se guarda como texto libre nuevo).
- **Confirmado**: escribir "Vacunas" filtra correctamente a "Vacunas y desparasitación". No requiere multi-mascota, aplica igual con 1 sola mascota — validado tanto por MCP como automatizado en `TS-02 TC-01` de IMAS-3174 (comparte la misma lógica de Motivo).

### CP05 — ✅🤖 Validar que elegir un motivo distinto de "otro motivo" habilita "Continuar"
- **Precondición**: usuario en el selector de motivo.
- **Pasos**: 1. Elegir cualquier motivo del listado excepto "otro motivo".
- **Resultado esperado**: "Continuar" se habilita sin requerir campos adicionales.
- **Automatización**: cubierto en `TS-02 TC-01` (IMAS-3174) — mismo comportamiento, no depende de multi-mascota.

### CP06 — ⏭️ [Negativo] Validar que "otro motivo" vuelve obligatorio el comentario adicional
- **Precondición**: usuario selecciona el motivo "otro motivo".
- **Pasos**: 1. Intentar continuar sin completar "comentarios adicionales".
- **Resultado esperado**: "Continuar" permanece deshabilitado hasta completar ese campo.
- **No automatizado en esta sesión** (no requiere multi-mascota, pero no se llegó a implementar por tiempo — candidato fácil para la siguiente pasada, reutilizando el patrón de `TS-02 TC-01`).

### CP07 — ✅🤖 Validar edición de mascota en pantalla de revisión conservando datos válidos
- **Precondición**: usuario en la pantalla de revisión con una mascota seleccionada, fecha/hora y motivo cargados.
- **Pasos**: 1. Tocar "Editar mascota". 2. Elegir la otra mascota. 3. Continuar hasta volver a la revisión.
- **Resultado esperado**: la revisión refleja la nueva mascota, conservando fecha/hora y motivo ya cargados.
- **Confirmado 2026-08-04 (MCP + automatizado)**: "Editar mascota" no vuelve directo a la revisión — regresa al selector de mascota ("Elegí para quién es la consulta"), y desde ahí hay que re-recorrer Motivo → Adjuntos → Día/horario. Cada paso llega con el valor previamente cargado ya conservado (Continuar habilitado sin tocar nada) — exactamente lo que exige CA09.
- **Automatización**: `TS-03 TC-06` (nuevo) — **pasando**. Método `changeSelectedPetFromReview()` en `VideocallFormPage.ts`.

### CP08 — ✅🤖⚠️ [Negativo/borde] Validar invalidación de campo dependiente al cambiar de mascota
- **Confirmado 2026-08-04**: no existe ningún campo dependiente de la mascota en este flujo (motivo, adjuntos y día/horario son genéricos por usuario, no por mascota) — no hay escenario real de "invalidación" para reproducir en la app tal como está hoy. Lo único verificable es la conservación (CP07), que sí está cubierta. Si en el futuro se agrega algo pet-específico (ej. franjas horarias por mascota), este CP debería revisarse.
- **Automatización**: cubierto implícitamente en `TS-03 TC-06` (verifica que motivo y fecha/hora NO cambian al cambiar de mascota).

### CP09 — ✅👁️ Validar botón "Continuar" en adjuntos deshabilitado sin al menos 1 archivo
- **Precondición**: usuario en el paso de adjuntos, sin cargar ningún archivo.
- **Pasos**: 1. Iniciar la carga sin adjuntar nada. 2. Revisar el estado de "Continuar".
- **Resultado esperado**: permanece deshabilitado hasta cargar al menos un archivo, si el paso lo requiere.
- **Confirmado**: en la pantalla "Subí una foto, video o archivo", "Continuar" aparece deshabilitado por defecto — solo "Omitir" permite avanzar sin adjuntar.

### CP10 — ⏭️ [Negativo] Validar rechazo de formato de archivo no permitido
- **Precondición**: archivo de prueba en un formato NO permitido (fuera de `.png/.jpg/.pdf/.mp4/.mov`).
- **Pasos**: 1. Intentar adjuntar ese archivo.
- **Resultado esperado**: no se carga; mensaje de error de formato inválido.
- **Corrección 2026-08-04**: este CP tenía el marcador ✅🤖 por error — no está automatizado. El mensaje de la pantalla confirma los formatos exactos permitidos (ver CP11), pero no se probó un archivo de formato inválido específico. Placeholder documentado en `TS-03 TC-07` junto con CP12/CP15.

### CP11 — ✅🤖⚠️→✅ [Negativo] Validar rechazo de archivo que excede el peso permitido
- **Precondición**: archivo de prueba que excede el límite de peso.
- **Resultado esperado**: mensaje de error, el archivo no se carga.
- **✅ Punto abierto #4 del handoff RESUELTO 2026-08-04**: la propia UI confirma los límites exactos, ya no hace falta inferirlos: *"Formatos permitidos: .png, .jpg o .pdf (hasta 10 MB c/u) y video .mp4 o .mov (máx. 1 min o 100 MB)"*, máximo 5 archivos.
- **Automatización**: `TS-03 TC-01` — **pasando**. Usa un fixture de 11MB (`src/fixtures/images/oversize_videocall_11MB.jpg`, generado en esta sesión — el fixture `oversize_img_10MB.jpg` existente pesa 9.7MB real, insuficiente para este límite de 10MB de videollamada; sigue siendo válido para el límite de 5MB del flujo de credencial de mascota, no tocarlo).

### CP12 — ⏭️ [Borde] Validar bloqueo del botón de subir al llegar a 5 archivos
- **No automatizado en esta sesión por tiempo** — placeholder documentado en `TS-03 TC-07`. El método `uploadAttachment` del POM ya soporta subir múltiples archivos en secuencia.

### CP13 — ⏭️ [Borde, mobile] Validar bloqueo específico de cámara al llegar a 5 archivos
- Requiere el proyecto mobile, deshabilitado en `playwright.config.ts`. Placeholder documentado en `TS-03 TC-08`.

### CP14 — ✅🤖 Validar que los archivos cargados pueden borrarse
- **Precondición**: usuario con al menos 1 archivo cargado.
- **Pasos**: 1. Seleccionar la opción de borrar ese archivo.
- **Resultado esperado**: el archivo se elimina de la lista de adjuntos.
- **Automatización**: `TS-03 TC-02` — **pasando**. Selector real confirmado: `button[aria-label="DeleteFile"]` (no tenía texto "eliminar"/"borrar" como se asumía inicialmente).

### CP15 — ⏭️ [Negativo] [API] Validar bypass de validaciones de archivos directo al backend
- **No automatizado en esta sesión** — placeholder documentado en `TS-03 TC-07`, junto con CP12.

### CP16 — ✅🤖 Validar que el calendario solo habilita 30 días de anticipación (front)
- **Precondición**: usuario en el selector de día.
- **Pasos**: 1. Intentar seleccionar una fecha más allá de 30 días desde hoy.
- **Resultado esperado**: la fecha no está habilitada/seleccionable en el calendario.
- **Confirmado 2026-08-04 (MCP + automatizado)**: hoy 03/08/2026, último día habilitado 03/09/2026 (31 días — offset de calendario natural), 04/09/2026 ya "Not available". Componente real: **`react-datepicker`** (no `react-calendar` como asumía el POM viejo) — `aria-label="Choose <fecha>"` para habilitado, `"Not available <fecha>"` para deshabilitado.
- **Automatización**: `TS-03 TC-03` — **pasando**.

### CP17 — ✅🤖 [Negativo] [API] Validar rechazo de fecha fuera de ventana de 30 días directo al backend
- **Precondición**: acceso a cliente HTTP con sesión válida.
- **Pasos**: 1. Enviar request directa de creación de turno con fecha > 30 días desde hoy, saltando el calendario de UI.
- **Resultado esperado**: el backend rechaza la operación.
- **Automatización**: `TS-03 TC-04` — **pasando**. `VetifyWebappApiClient.scheduleVideocall({ date: +45 días })` rechazado por el backend.

### CP18 — ✅🤖 Validar pantalla de confirmación y proceso de comunicaciones sin cambios
- **Precondición**: turno multi-mascota confirmado exitosamente.
- **Pasos**: 1. Confirmar la solicitud. 2. Ir a Home.
- **Resultado esperado**: pantalla de confirmación según diseño aprobado; banner de turno programado visible en Home.
- **Confirmado 2026-08-04**: mismo copy/comportamiento que IMAS-3174 CP07/CP08 ("¡\<Mascota\> ya tiene su turno reservado!" + banner "Tenés una videollamada programada"), ahora confirmado también para el flujo multi-mascota con la mascota editada en revisión.
- **Automatización**: `TS-03 TC-06` — **pasando**.

---

## IMAS-3909 — Casuísticas especiales, con turno previo (límites) (4 CAs reales del ticket)

> **⚠️ Corrección importante 2026-08-05**: esta sección se escribió originalmente contra una lectura de la HU vía API de Jira que devolvía 8 CA (incluyendo límite anual OSDE Capitado/Flux Capitado y analítica). El usuario del proyecto confirmó, mirando el ticket en vivo, que la HU real tiene **solo 4 CA** — el "Objetivo" dice explícitamente *"Quedará para más adelante la restricción de capitados osde"* (descopeado a otro ticket, **IMAS-4038**, que en efecto aparece listado en "Actividades vinculadas" del ticket). La lectura por API mostraba contenido desactualizado por un motivo no determinado (posible delta de sincronización de Jira) — se descubrió tras varias horas de investigación (incluyendo un intento fallido de reportar un bug basado en CA que no existen en la versión real). CA04 real ("Mascota asociada al turno") es exactamente lo que se documentaba antes como CA07.
>
> **✅ Los 4 CA reales están 100% cubiertos y pasando** — no queda ningún gap de cobertura en esta HU.

### CA01 — ✅🤖 Validación de cantidad máxima de turnos por mascota
- **Precondición**: mascota con 2 turnos ya agendados (el máximo).
- **Pasos**: 1. Intentar iniciar una nueva solicitud de videollamada.
- **Resultado esperado**: el sistema bloquea antes de llegar al selector de motivo.
- **Confirmado 2026-08-04 (MCP + automatizado)**: con 1 mascota, el bloqueo se dispara directo al tocar "Agendar nueva videollamada" (no hace falta seleccionar mascota, es implícita). Modal: *"Superaste el límite de videollamadas por mascota"* — *"Ya tenés 2 videollamadas programadas para \<Mascota\>. Podés agendar otra cuando finalice uno de tus turnos activos, o cancelar/reprogramar alguno."*
- **Automatización**: `TS-04 TC-01` — **pasando**.

### CA02 — ✅🤖 Pantalla de imposibilidad por límite de turnos
- **Resultado esperado**: pantalla informativa según Figma, indicando el máximo alcanzado y la acción para acceder a "Tus turnos".
- **Confirmado 2026-08-04**: es un **modal** sobre la pantalla de entrada (no una pantalla aparte) — esa pantalla de fondo ya muestra "Tus turnos" con los turnos existentes, por lo que la acción de CA02 está resuelta por la propia composición de la pantalla, sin un botón "Tus turnos" dentro del modal.
- **Automatización**: `TS-04 TC-01` — **pasando**.

### CA03 — ✅🤖 Visualización de turnos existentes
- **Resultado esperado**: al seleccionar "Tus turnos", ver los turnos actuales.
- **Confirmado 2026-08-04**: "Tus turnos" aparece en la pantalla de entrada de Videollamada en cuanto el usuario tiene ≥1 turno agendado (no hace falta estar bloqueado) — cada turno lista mascota + fecha/hora.
- **Automatización**: `TS-04 TC-01` — **pasando** (verifica 2 turnos visibles antes y después de cerrar el modal de bloqueo).

### CA04 — ✅🤖 Mascota asociada al turno (multi-mascota)
- **Resultado esperado**: el límite aplica únicamente sobre la mascota seleccionada.
- **Confirmado 2026-08-04 (MCP + automatizado)**: en cuenta multi-mascota, "Agendar nueva videollamada" **no** bloquea de entrada — primero pide elegir mascota (a diferencia del flujo de 1 mascota). El bloqueo aparece recién tras elegir la mascota en el límite y tocar "Continuar". Elegir la OTRA mascota (sin turnos) continúa el flujo con normalidad.
- **Automatización**: `TS-04 TC-02` — **pasando**.

### Investigación descartada 2026-08-05 (límite OSDE Capitado — NO es parte de esta HU)
Durante la sesión se investigó extensamente un supuesto CA04-06/CA08 sobre límite anual OSDE Capitado/Flux Capitado + analítica, incluyendo: confirmar que hay un usuario OSDE Capitado usable en el pool, validar el copy del modal contra Figma (coincide, reutiliza el modal genérico "por mascota" a propósito), y confirmar por API que cancelar un turno libera cupo de inmediato (es decir, el límite que sí existe hoy es "2 activos simultáneos", no un cupo anual). Todo ese trabajo quedó **sin efecto** al confirmar que esos CA no son parte del alcance real de IMAS-3909 — la funcionalidad capitada está descopeada a `IMAS-4038` (Backlog). Se documenta acá solo para que quede registro de por qué no hay más casos de prueba de esto en esta HU.

### Hallazgo de tooling (no es un CP, es un bug del helper de test)
**`VetifyWebappApiClient.scheduleVideocall()` sin `date` explícito puede fallar.** Su lógica default (`monthOffset` 0-3 + `dayOffset` 1-10) puede elegir una fecha fuera de la ventana real de 30 días, dejando la disponibilidad horaria vacía y enviando `rango: undefined` al backend → error genérico sin detalle. Se mejoró el mensaje de error para incluir status+body (antes silencioso). Además, el endpoint de creación de turnos puede responder `422 "Horario no disponible"` de forma intermitente (colisión de horario, ej. otro test corriendo sobre el mismo usuario pooled) — mitigado con reintento (`expect(...).toPass()`) en `TS-04`.

---

## IMAS-3894 — Visualización, reprogramación, cancelación e ingreso a turno (7 CPs, epic IMAS-2877)

> Clon de IMAS-3889/IMAS-3899 dentro del mismo epic — cubre la gestión de un turno YA agendado (a diferencia de las 4 HUs anteriores, que cubren el agendamiento). Sin subtask QA propio identificado en Jira al momento de automatizar.
> **✅ CP01-CP04 cerrados 2026-08-04**: precondición (turno futuro ya agendado) generada vía API, igual que IMAS-3909. `TS-05 TC-01/02/03` — pasando, corridos con `-g "TS-05"` y con la config real de CI (`--workers=2 --retries=1`) sobre el spec completo.
> **⏭️ CP05-CP07 — fuera de alcance/brecha documentada, no resuelta**: CP05 (positivo de "Ingresar") choca con la anticipación mínima de 30 min del wizard de agendamiento; CP06 (sala de espera/videoconsulta) requiere infra real de videollamada; CP07 (comunicaciones) sin integración de email/push verificable.
> **🐛 BUG-003 encontrado**: el detalle del turno no muestra "Estado del turno" (exigido por CA02), y por consecuencia un turno ya `CANCELADO` por una reprogramación sigue mostrándose como activo si se navega directo a su URL vieja. Documentado en `docs/bugs/BUG-003-detalle-turno-sin-estado-y-stale-tras-reprogramar.md`, pendiente de OK del usuario del proyecto para reportarlo en Jira.

### CP01 — ✅🤖 Validar aviso destacado en Home y acceso al detalle
- **Precondición**: tutor con un turno futuro agendado.
- **Pasos**: 1. Ir a la Home. 2. Presionar "Ir al detalle" desde el aviso.
- **Resultado esperado**: la Home muestra un aviso con la fecha/hora del turno más próximo; el aviso permite acceder al turno.
- **Confirmado 2026-08-04 (MCP + automatizado)**: banner real "Tenés una videollamada programada" / "Para el día DD/MM/AA a las HH:MM h." con botón "Ir al detalle". Con un único turno agendado, ese botón navega DIRECTO a `/petsAssistance/{id}` (no pasa por la lista "Tus turnos"); esa lista intermedia solo se observó manualmente con 2+ turnos, no automatizado ese caso puntual.
- **Automatización**: `TS-05 TC-01` — **pasando**.

### CP02 — ✅🤖🐛 Validar contenido del detalle del turno
- **Precondición**: usuario en el detalle de un turno futuro.
- **Pasos**: 1. Abrir el detalle.
- **Resultado esperado**: muestra Mascota, Fecha, Hora, Estado del turno y acciones disponibles (CA02 explícito).
- **Confirmado 2026-08-04 (MCP + automatizado)**: Mascota/Fecha y hora/Motivo correctos; "Ingresar" deshabilitado y "Cancelar" habilitado para un turno fuera de ventana. **Discrepancia real**: no existe ningún campo "Estado del turno" en la pantalla — ver BUG-003.
- **Automatización**: `TS-05 TC-01` — **pasando** (sin aserción de "Estado" porque el campo no existe).

### CP03 — ✅🤖 Validar cancelación con doble check
- **Precondición**: usuario en el detalle, turno cancelable (≥30 min antes del horario).
- **Pasos**: 1. Presionar "Cancelar". 2. Confirmar en el modal.
- **Resultado esperado**: modal de doble check con copy específico; al confirmar, el turno se cancela.
- **Confirmado 2026-08-04 (MCP + automatizado)**: copy exacto "Estás por cancelar tu videollamada" / "Si cancelás el turno, vas a perder el horario reservado." (coincide 100% con Figma §10), botones "Cancelar videollamada"/"Cerrar". Al confirmar: `PUT /api/services/pets/cancel/{id}` → 200, y pantalla "Tu turno fue cancelado" con botones "Volver al inicio"/"Agendar nueva videollamada".
- **Automatización**: `TS-05 TC-03` — **pasando**.

### CP04 — ✅🤖🐛 Validar reprogramación reutilizando mascota y motivo
- **Precondición**: usuario en el detalle, turno reprogramable.
- **Pasos**: 1. Presionar "Reprogramar". 2. Elegir nuevo día/horario. 3. Confirmar.
- **Resultado esperado**: reutiliza mascota y motivo sin pedirlos de nuevo; confirma con la nueva fecha/hora, actualizando Home y detalle.
- **Confirmado 2026-08-04 (MCP + automatizado)**: reutiliza el mismo `CalendarSchedulingComponent` del agendamiento (mismas 30 días/franjas), pantalla de revisión intermedia ("Revisá los datos y confirmá tu turno") solo con "Editar fecha y hora", endpoint real `PUT /api/services/pets/appointment/{id}/reschedule` → 200. **Discrepancia real**: el backend genera una `assistanceId` NUEVA para el turno reprogramado y deja la anterior en `estado: "CANCELADO"` — pero el detalle de la `assistanceId` vieja sigue mostrando fecha/hora/botones como si el turno siguiera activo si se navega directo a esa URL (consecuencia de la falta de "Estado del turno", BUG-003).
- **Automatización**: `TS-05 TC-02` — **pasando** (verificado por API contra la fecha reprogramada, no contra el banner de Home — el usuario pooled se comparte con otros tests en paralelo).

### CP05 — ⏭️⚠️ [Brecha de cobertura] Validar habilitación de "Ingresar" dentro de la ventana de 5 min (CA05, caso positivo)
- **No automatizable de forma estable**: requiere esperar en tiempo real a que un turno entre en la ventana de 5 min, lo cual choca con la anticipación mínima de 30 min del propio wizard de agendamiento — no se puede crear un turno ya dentro de esa ventana. **Confirmado manualmente vía MCP contra QA real**: con un turno dentro de la ventana, "Ingresar" se habilita correctamente (verificado comparando un turno pasado/próximo vs. uno lejano en la misma sesión de exploración). El caso negativo (deshabilitado fuera de ventana) sí está automatizado en CP02.
- **Automatización**: `TS-05 TC-04` documenta el gap explícitamente (`test.skip`).

### CP06 — ⏭️ [Fuera de alcance] Sala de espera, ingreso y salida de la videoconsulta (CA06, CA07, CA08)
- Requiere una sesión de videoconferencia real con un profesional conectado del otro lado — no reproducible desde QA automatizado sin un simulador de proveedor.
- **Automatización**: `TS-05 TC-05` documenta el gap explícitamente.

### CP07 — ⏭️ [Fuera de alcance] Comunicaciones tras cancelar/reprogramar (CA09)
- Mismo criterio que CP08 de IMAS-3174: sin integración para verificar envío real de email/push desde el pipeline automatizado.
- **Automatización**: `TS-05 TC-06` documenta el gap explícitamente.

---

## Resumen de cobertura (actualizado 2026-08-04, post-cierre IMAS-3909 parcial + IMAS-3894 parcial)

| HU | # Casos | ✅🤖 Automatizado y pasando | ✅👁️ Confirmado manual (MCP), no automatizado | ⏭️ Brecha de cobertura (dato no disponible) | 🐛 Discrepancia/bug encontrado |
|---|---|---|---|---|---|
| IMAS-3899 | 5 (CP) | 4 (CP01,02,03,05 — IMP-003 resuelto 2026-08-05) | 0 | 0 | 1 (CP04, BUG-001/IMAS-4102 re-confirmado vigente) |
| IMAS-3174 | 8 (CP) | 7 (CP01,02,04,05,06,07 en un test + CP03 implícito) | 0 | 1 (CP08 — sin integración de email/push) | 1 (CP05 — UUID crudo en revisión) |
| IMAS-3889 | 18 (CP) | 11 (CP01,02,03,05,07,08,11,14,16,17,18) | 2 (CP04 doble-confirmado, CP09 solo manual) | 5 (CP06,10,12,13,15 — no implementado por tiempo o requiere mobile) | 0 |
| IMAS-3909 | 4 (CA reales del ticket — corregido 2026-08-05, ver nota arriba) | 4 (CA01,02,03,04) | 0 | 0 | 0 |
| IMAS-3894 | 7 (CP) | 4 (CP01,02,03,04) | 0 | 3 (CP05 anticipación mínima; CP06 infra real; CP07 comunicaciones) | 1 (CP02/CP04 — falta "Estado del turno", BUG-003) |
| **Total** | **41 CP + 4 CA + 7 CP** | **~27** | **~5** | **~14** | **3** |

**Automatización real**: `tests/projects/vetify-webapp/videocall.spec.ts` — 22 tests (13 passed, 9 skipped con motivo documentado, 0 failed) tras validación real contra `https://vetify-qa.ikeapp.com`, corrido con la config real de CI (`--workers=2 --retries=1`) para confirmar estabilidad. Nota: con paralelismo local por-encima-de-CI (6+ workers, sin retries) el spec puede mostrar fallos intermitentes por contención sobre el pool chico de usuarios `VETIFY_ADQUIRENTE` compartido entre TS-02/03/04/05 — ver `qa-workspace/known-issues.md`, no reproducible con la config real de CI.

**Estado de cierre por HU**: IMAS-3174, IMAS-3889 e **IMAS-3909** — **100% DoD** (los 6 criterios, incluido 0 bugs Jira abiertos vinculados). IMAS-3909 llegó al 100% recién el 2026-08-05, tras corregir el alcance real (4 CA, no 8 — ver nota al inicio de su sección). IMAS-3899 — **bloqueada solo por DoD criterio 6**: CP01/02/03/05 ya automatizados y pasando (IMP-003/IMP-004 resueltos 2026-08-05), pero BUG-001/IMAS-4102 (CP04) sigue abierto y re-confirmado vigente — la HU no cierra hasta que ese Error se resuelva en Jira. IMAS-3894 — **parcial, no al 100%**: CP01-04 (CA01-04) cerrados y verificados, CP05-07 (CA05 positivo, CA06-08, CA09) documentados como fuera de alcance/brecha real, y BUG-003/IMAS-4119 (falta "Estado del turno") reportado en Jira, abierto — la HU no puede declararse completa mientras ese bug siga abierto y CA05-09 sigan sin cobertura automatizada.

## Hallazgos que requieren seguimiento

1. **🐛 CP04 IMAS-3899 (discrepancia de HU)**: tras completar la credencial desde el flujo de videollamada, el sistema no retoma la solicitud — va a Home. Contradice el comportamiento documentado en el comentario de validación de la HU. **Reportado en Jira: IMAS-4102** (abierto, bloquea el cierre de IMAS-3899).
2. **🐛 CP05 IMAS-3174 (posible bug menor)**: la pantalla de revisión muestra el UUID crudo del petId en vez del nombre de la mascota. Pendiente confirmar si es un bug de datos (`descripcion_producto`/nombre no llega al front) o si el mapeo de Figma solo mostraba mockups. Reportar tras confirmar.
3. **IMP-003** (`docs/impedimentos-bloqueos.md`): el pool no tiene actualmente ningún usuario `NO_PET` disponible ni ningún usuario multi-mascota — bloquea CP01 de IMAS-3899 (ahora en skip) y la mayoría de IMAS-3889/3909. Requiere ampliar `UserTag`/`user-factory.ts` o provisionar usuarios reales con esas condiciones.
4. **Error 422 intermitente** observado durante la exploración manual inicial (`POST /api/services/assistance/493/create` → `{"detail":"No encontrado"}`) con datos aparentemente válidos — no se pudo reproducir de forma consistente en la automatización (los tests automatizados sí lograron crear turnos exitosamente). Podría ser inestabilidad puntual del ambiente QA (confirmado como "no estable" en `docs/conocimiento-sistema.md`) — no se abrió Defect por no ser reproducible.
5. **🐛 BUG-003 IMAS-3894 (CA02)**: el detalle del turno no muestra el campo "Estado del turno" que la HU exige explícitamente, y por consecuencia un turno ya `CANCELADO` por una reprogramación sigue mostrando el detalle y las acciones (Reprogramar habilitado) como si estuviera vigente si se navega directo a su URL vieja. **Reportado en Jira: IMAS-4119** (abierto, bloquea el cierre de IMAS-3894).
6. **⚠️ Lección de proceso 2026-08-05 (IMAS-3909)**: la lectura de una HU vía API de Jira puede quedar desactualizada respecto al ticket real (motivo no determinado) — se investigó extensamente un límite anual OSDE Capitado que resultó no ser parte del alcance real de la HU (descopeado a IMAS-4038). Regla a partir de ahora: si algo de una HU parece raro/incompleto/contradictorio, pedirle al usuario del proyecto que confirme mirando el ticket en vivo antes de invertir tiempo de investigación o reportar un Defect.
