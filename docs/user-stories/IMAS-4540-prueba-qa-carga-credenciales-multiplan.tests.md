# Diseño y ejecución de casos — IMAS-4540 Prueba QA: Carga de credenciales cuando hay 2+ vacías (subtarea de IMAS-4538)

> **Fuente**: HU `IMAS-4538` (criterios de aceptación), épica `IMAS-4563`, diseño en Figma (`YfysBYoQZB2Y0J0pLf3nMb`, nodo `40001027:19664`, sección "Casuística de carga de credencial | EXCLUSIVO PARA TUTORES CON MÁS DE UNA CREDENCIAL EMPTY | Actualización AGOSTO"), POM existente `src/pages/vetify/webapp/credentials/AddPetFormPage.ts`.

## 1. Contexto

Cuando un tutor tiene 2 o más credenciales (planes) sin mascota cargada, la app debe mostrar una pantalla previa ("Asigná el plan de la credencial" / "Elegí el plan correcto para la mascota que vas a cargar.") para que el tutor elija a cuál de los planes pendientes le va a cargar los datos de la mascota, evitando asociarla al plan incorrecto (error irreversible, solo modificable llamando al 0800). Con 1 sola credencial vacía (o ninguna), el flujo debe mantenerse igual que antes (sin esta pantalla).

## 2. Gap de datos inicial

Ninguna cuenta del pool tenía 2+ credenciales vacías simultáneas al momento de diseñar los casos. Con OK de Alan, se generó una cuenta nueva vía `UserFactory.generateVetifyTestUser({numberOfPlans: 2})` (script temporal, ya borrado tras su uso). Se descubrió en el camino que el tag `numberOfPlans` del fixture **no refleja la cantidad real de credenciales** — hay que verificar siempre vía `GET /api/services/pets/my-products` antes de asumir cuántas están `LIBRE`.

**Cuenta usada para la ejecución real**: `user_1789072184062_39adba77@automation.com` (VETIFY_ADQUIRENTE, fresh, activada), con exactamente 2 credenciales `LIBRE` al momento de la prueba: `VETIFY PREMIUM X1` (cuenta 2317) y `VETIFY 100 ADULTO x1` (cuenta 2245).

## 3. Criterios de aceptación mapeados

| AC de la HU | Cubierto por | Resultado |
|---|---|---|
| AC1 — 2+ credenciales vacías → pantalla previa de selección | CP01 | ✅ PASS |
| AC2 — 1 sola credencial vacía (o ninguna) → flujo original sin pantalla previa | CP02 | ✅ PASS |
| AC3 — cada credencial pendiente listada de forma clara/diferenciable | CP03 | ✅ PASS |
| AC4 — al confirmar selección, continúa el flujo asociado a esa credencial | CP04 | ✅ PASS |
| AC5 — no permite avanzar sin seleccionar | CP05 | ✅ PASS |
| AC6 — la mascota queda asociada únicamente a la credencial elegida, sin afectar las demás | CP06 | ✅ PASS |

**6/6 CPs ejecutados y en PASS.**

## 4. Casos de prueba y evidencia de ejecución (2026-09-10)

### CP01 — Con 2+ credenciales vacías, aparece la pantalla de selección de plan
- **Dado**: tutor logueado con 2 credenciales sin mascota cargada (Premium y 100 Adulto).
- **Cuando**: toca "Completar credencial" en el home → cierra el modal "Asegurate de completar bien los datos" → toca "Continuar" en "¡Vamos a empezar!".
- **Entonces**: aparece la pantalla **"Asigná el plan de la credencial" / "Elegí el plan correcto para la mascota que vas a cargar."**, con un selector y el botón "Continuar" deshabilitado.
- **Resultado**: ✅ PASS. Confirmado en vivo.
- **Nota de proceso**: en un primer intento se concluyó erróneamente que esta pantalla no aparecía — el corte de la prueba fue un paso antes de tiempo (en "¡Vamos a empezar!", sin clickear su "Continuar"). Alan lo detectó comparando contra las capturas de Figma y se corrigió reverificando el paso siguiente. Ver `qa-workspace/decision-log.md` (2026-09-10) para el detalle completo del error y la corrección.

### CP02 — Con 1 sola credencial vacía, se mantiene el flujo original (regresión)
- **Dado**: tutor logueado con exactamente 1 credencial sin mascota cargada.
- **Cuando**: toca "Completar credencial".
- **Entonces**: va directo a "¡Vamos a empezar!" (flujo de siempre), sin ninguna pantalla de selección de plan.
- **Resultado**: ✅ PASS. Confirmado con cuenta `user_1786584446082_b40427fd@automation.com` (1 credencial `LIBRE` restante).

### CP03 — Las credenciales pendientes se listan de forma clara y diferenciable
- **Dado**: pantalla de selección de plan visible (CP01).
- **Cuando**: se abre el selector "Plan".
- **Entonces**: lista las 2 opciones con el nombre del plan real de cada una ("PREMIUM", "100 ADULTO"), sin ambigüedad.
- **Resultado**: ✅ PASS.

### CP04 — Al confirmar la selección, el flujo continúa asociado a esa credencial
- **Dado**: pantalla de selección de plan visible, plan "PREMIUM" elegido.
- **Cuando**: se toca "Continuar".
- **Entonces**: avanza a "¿Cómo se llama tu mascota?" sobre la URL/ID de la credencial PREMIUM específicamente (`/pets/7d54ec37-...`).
- **Resultado**: ✅ PASS.

### CP05 — No permite avanzar sin seleccionar un plan
- **Dado**: pantalla de selección de plan visible, combobox en "Seleccionar" (placeholder, opción deshabilitada).
- **Cuando**: se observa el botón "Continuar".
- **Entonces**: permanece deshabilitado hasta elegir una opción real del combobox.
- **Resultado**: ✅ PASS.

### CP06 — La mascota queda asociada únicamente a la credencial elegida, sin afectar las demás
- **Dado**: se completó el wizard entero (nombre "Rocky IMAS4538 QA", Perro/Macho, raza MUDI, 3 años, foto) sobre la credencial PREMIUM elegida en CP04.
- **Cuando**: se llega a la pantalla de éxito ("¡Rocky IMAS4538 QA ya tiene su credencial lista!") y se reconsulta `GET /api/services/pets/my-products`.
- **Entonces**: la credencial PREMIUM queda `estado: "OCUPADO"` con los datos de Rocky correctamente asociados; la credencial "100 ADULTO" sigue exactamente `estado: "LIBRE"`, `mascota: null` — sin ningún cambio.
- **Resultado**: ✅ PASS. Verificado por API (no solo por UI).

## 5. Notas técnicas para automatizar (a futuro)

- El componente de selección es un `<select>` nativo (no un combobox custom) — usar `selectOption()` de Playwright o el patrón de seteo nativo de valor + eventos `change`/`input` si `selectOption()` no resuelve directo.
- El valor de cada `<option>` del selector de plan es el **ID de la credencial** (mismo `id` que devuelve `GET /api/services/pets/my-products`), no el nombre del plan — útil para automatizar sin depender del texto visible.
- Para armar el caso de prueba (2+ credenciales vacías) sin depender del pool: `UserFactory.generateTestUsers([{siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 2, registration: true}])`, seguido de `activateFreshAccounts()` (espera ~15min de propagación real antes de poder loguear). **Verificar siempre por API cuántas credenciales quedan `LIBRE` reales** — el tag `numberOfPlans`/`NO_PET` puede estar desactualizado si la cuenta ya fue usada antes.
- La encuesta de satisfacción de Hotjar (IMP-022, ya documentada) aparece en la pantalla de éxito — no es parte de esta HU, se puede cerrar sin afectar el resultado.

## 6. Veredicto QA

**IMAS-4538 cumple los 6 criterios de aceptación. Validado de punta a punta en QA, con evidencia de API además de UI. Listo para cierre.**
