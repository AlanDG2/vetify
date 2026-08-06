# Lecciones aprendidas

> Bitácora de aprendizajes QA: bloqueos resueltos, preguntas recurrentes, patrones. **Leer primero** al empezar una sesión. La skill `qa-continuous-learning` define qué documentar aquí y cuándo promover un patrón (3+ veces) a regla.

<!-- Formato por entrada:
### [YYYY-MM-DD] Título corto
**HU relacionada**: <id o N/A>  ·  **Categoría**: <Locators/Datos/Ambiente/...>
**Problema**: ...
**Solución**: ...
**Aprendizaje/Regla**: ...
-->

### [2026-08-05] "videocall.spec.ts" fallaba igual en toda plataforma/config — no era inestabilidad de backend

**HU relacionada**: IMAS-3174, IMAS-3889, IMAS-3909, IMAS-3894 (TS-02 a TS-05)  ·  **Categoría**: Ambiente / helper de test

**Problema**: al validar mobile, la suite fallaba de forma casi idéntica en Desktop y Android, con y sin concurrencia (`--workers=1` y `2`), con sesión de usuario fresca o cacheada. Varias horas de investigación apuntaban a "inestabilidad de lectura del backend QA compartido" como causa.

**Solución**: la causa real era un bug propio — `VetifyWebappApiClient.cancelVideoCall()` llamaba primero a `GET /api/services/pets/cancel_reasons` (endpoint deprecado que devuelve 500 siempre; la UI real, rediseño IMAS-3894, ya no tiene selector de motivo y no lo usa). El error quedaba tragado en `cancelAllScheduledVideocalls()` (`.catch(() => {})`), así que la "limpieza" al inicio de cada test nunca cancelaba nada de verdad — los turnos se fueron acumulando corrida tras corrida hasta tocar el límite real de negocio de 2 turnos por mascota, que sí bloquea de forma determinística. Fix: `PUT /cancel/{id}` directo con `motivo_id: 1` (valor fijo confirmado por prueba directa contra la API, ya que la UI real no expone selector).

**Aprendizaje/Regla**: cuando algo falla igual sin importar plataforma/workers/frescura de sesión, leer el código del `beforeEach`/setup del test que falla ANTES de re-correr a ciegas o de concluir "ambiente inestable" — un error tragado en un helper de limpieza puede simular perfectamente ese patrón. Detalle completo en memoria de sesión `feedback_verify_before_concluding_flaky`.

### [2026-08-05] Botón final de la revisión de turno tiene texto distinto en mobile vs Desktop

**HU relacionada**: IMAS-3174 (TS-02)  ·  **Categoría**: Locators (mobile)

**Problema**: `VideocallFormPage.confirmVideocallBtn` buscaba el texto exacto `'Confirmar videollamada'`. En la corrida contra Android (`Vetify WebApp Android`, viewport Pixel 5) el test se colgaba 60s esperando la respuesta de red de `POST /assistance/493/create` que nunca llegaba — el click nunca encontraba el botón.

**Solución**: confirmado por screenshot real de la corrida que en mobile el mismo botón, mismo lugar, dice **"Continuar"** (mismo label genérico que usa el resto del wizard en esa plataforma). Se cambió el locator a `page.getByRole('button', { name: /^(Confirmar videollamada|Continuar)$/ })` — sin ambigüedad, la pantalla de revisión no tiene otro botón con esos textos.

**Aprendizaje/Regla**: en specs con proyecto mobile habilitado, no asumir que el texto de un botón "final" (confirmar/enviar) es el mismo en todos los breakpoints — validar el paso de confirmación específicamente contra mobile antes de dar un flujo por cerrado, aunque el resto del wizard ya haya sido validado en Desktop.

### [2026-08-05] Las tags de `pooled-users.json` no se auto-validan contra el backend real

**HU relacionada**: TS-02 a TS-05 (pool `VETIFY_ADQUIRENTE`)  ·  **Categoría**: Datos

**Problema**: 3 de 4 cuentas tageadas `ACTIVE, WITH_PET, NO_EMPTY_PLAN` en `pooled-users.json` ya no tenían plan/póliza activa en el backend real — la UI mostraba "Completá su credencial" pese al tag, y `getUserPets()` a veces devolvía la mascota (dato cacheado/parcial) y a veces `[]`.

**Solución**: confirmado navegando manualmente (login real) que esas 3 cuentas, al tocar "Suscribir mascota", reciben *"Para darle cobertura a una nueva mascota, primero elegí su plan en la web"* — no tienen plan, punto. Se retaggearon `BROKEN_NO_PLAN` con nota de fecha en el fixture. Se creó `scripts/maintenance/reset-pooled-user.mjs` para diagnosticar (pets/turnos agendados) y limpiar turnos sueltos de una cuenta pooled a demanda.

**Aprendizaje/Regla**: si una HU depende de un tag específico (`WITH_PET`, `NO_EMPTY_PLAN`, etc.) y el test falla de forma que no tiene sentido con ese tag, verificar manualmente el estado real de la cuenta (login + UI) antes de asumir que el problema está en el test o en el ambiente — el fixture puede simplemente estar desactualizado respecto al backend.
