# Diseño de casos — IMAS-4092 [Reintegros] B: Obtener Historial Servicios Auxiliares (subtarea de IMAS-4101)

> Diseño basado en riesgo (qa-risk-test-design). Riesgo: **alto** — es la fase que habilita por primera vez que clientes Capitados puedan pedir reintegros (hoy vía SISE, "no pueden reintegrar por este camino"); un gap acá bloquea de raíz a toda la Fase C/D/E para ese segmento.
>
> **Fuente**: descripción completa del ticket (campo estándar, no `customfield_11620` — a diferencia de `IMAS-4052`, esta "Tarea" sí tiene la descripción en el campo normal), extraída completa por primera vez en esta sesión (el CLI la mostraba cortada). Contexto completo de la épica en `docs/user-stories/IMAS-4101-migracion-reintegros-nexus.md`.

## Contrato real (resumen)

**Objetivo**: habilitar reintegros para adquirientes y capitados, migrando de SISE a Nexus. **Desafío principal**: el capitado no compra → no pasa por Engage → no tiene cliente en SISE → nunca podía pedir reintegro. Nexus lo destraba.

**Tabla propia del ticket — Adquirientes vs Capitados**:
| | Adquirientes (210/310) | Capitados (410+) |
|---|---|---|
| Alta del plan | Compra → Engage → batch → cliente en SISE | Incluido en OSDE; cuenta Vetify |
| Engage | Sí (`idProductEngage`) | Nunca |
| SISE | Hay cliente / posible expediente | No se crea cliente ni expediente |
| Reintegros hoy | Sí vía SISE | **No pueden reintegrar por este camino** |
| Límite | Según cobertura SISE | **2 atenciones / año** |

**Flujo objetivo**:
```
GET claimsHistory/{policyKey}  →  límites + capabilityList
        ↓
Create pets/auxiliaries  →  capability desde capabilityList + refund 1/0
        ↓
Calidad carga monto (+ ARCA)
        ↓
refund/exp  →  estado 3 (pago) o 5 (rechazo)
```

**Limitante conocida**: `policy.key` = `{clCuenta}-{clave}` (`clave` = DNI del titular) — identifica titular+producto, NO la mascota puntual. Con 2+ mascotas, el key es el mismo para todas.

**Criterios de aceptación del ticket (padre), citados textualmente — ninguno marcado**:
- [ ] Adquirientes y capitados listan tipos de gasto vía `claimsHistory` (`capabilityList` + límites)
- [ ] Confirmación abre expediente Nexus con `assisted.capability` tomado de `capabilityList`, refund `1/0`, y persiste `filecase`/`_id`
- [ ] Ciclo Calidad/Finanzas cierra con `refund/exp` `3/5` (o interim SISE)
- [ ] Limitante multi-mascota documentado/acordado
- [ ] QA y PROD con checklists
- [ ] DoD del proyecto

Las últimas 2 son criterios de proceso, no funcionales — no tienen CP dedicado.

## Hallazgo de contexto — la cuenta de evidencia de dev es la misma que ya veníamos usando hoy

Comentario de Paula Scalzo (dev), 2026-08-26, con 5 capturas adjuntas: *"Se pudo comprobar que reintegros funciona OK en Nexus para todos los usuarios, planes y subservicios probados."* Las capturas corresponden a la cuenta **DNI `12540524`, mascota "Popi"** — la misma cuenta del pool `OSDE_CAPITADO` usada hoy en `docs/user-stories/IMAS-4052-...tests.md` (CP01/CP02). El panel interno de Nexus ("Iké Argentina (dev)") etiqueta a esa cuenta explícitamente como **"Osde/capitado (H)"** — confirma que es un capitado real.

**Evidencia de esa captura (servicio `3268-1`)**: línea de tiempo `26/08/26 12:47 Aceptado → 12:56 Finalizado`, Mascotas / Estudios bioquímicos, Cliente "Osde/capitado (H)" / Centro "Iké Argentina (dev)" / Coordinador "Nexus-api", Asistido "Automation Test" DNI `12540524`, canal `WEBAPP-REINTEGROS`, $6 pagados. Cruzado con el backoffice (`reintegros-backoffice.ike.qa`, expediente `3268-1`): factura $6, "Estudios bioquímicos", plan "Vetify Esencial OSDE" (`2349`, Grupo `0163`), 0/1 eventos, tope $40.000, reintegro sugerido $6 — coincide en todo.

**Esto es evidencia de dev, no una validación propia** — mismo criterio que con `BUG-015` hoy: no se acepta a ciegas, se retestea.

## TS-01 Cobertura/capabilityList para Capitados (AC1)

**CP01 - Verificar que una cuenta Capitado real tiene historial de reintegros previamente exitoso vía Nexus** ✅✅ **CONFIRMADO EN VIVO 2026-08-28 (evidencia propia, no solo de dev)**
- Dado: cuenta `user_1783951005615@automation.com` (DNI `12540524`, "Popi", confirmada Capitado real vía panel interno de Nexus).
- Cuando: se navega a Reintegros → "Mis reintegros".
- Entonces: la pantalla muestra historial real y variado — **Pagado (4), Solicitado (1), Desaprobado (2)** — incluyendo el ítem de $6,00 pagado el 26/08/2026 que coincide exactamente con la evidencia de Paula Scalzo (expediente `3268-1`).
- **Conclusión**: confirma de forma independiente (no solo por la palabra de dev) que esta cuenta Capitado SÍ tiene un historial real de reintegros procesados vía Nexus — el mecanismo de fondo (AC1/AC2/AC3 para al menos un ciclo) funcionó en algún momento.
- Trazabilidad: `IMAS-4092` AC1/AC2/AC3 — evidencia histórica confirmada, no de un ciclo ejecutado hoy mismo.

**CP02 - Verificar que HOY se puede iniciar un reintegro NUEVO para la misma cuenta Capitado (Alta)** 🔴 **NO PASA — EJECUTADO 2026-08-28**
- Dado: misma cuenta, en la pantalla "Mis reintegros".
- Cuando: se hace clic en "Nuevo reintegro".
- Entonces (esperado, AC1/AC2): debería poder elegir la mascota "Popi" y continuar el alta, igual que lo hizo dev el 26/08.
- **Resultado real**: la UI mostró **"No hay mascotas registradas para tu documento"**. Inspeccionando la red: `GET /api/bff/reintegros/mascotas` → **`200`**, pero con el único registro devuelto casi vacío: `{"id":"f8693dfa-...","mascotaId":null,"nombre":null,"especieDescripcion":null,"fotoUrl":null,"idProductoEngage":"7404f953-...","fechaNacimiento":null,"raza":null}`. El `id` coincide con el de `GET /pets/my-products` (mismo registro de producto), pero **todos los campos de identidad de la mascota vienen `null`** — no es que falte la mascota, es que el registro existe pero está incompleto, y el frontend no puede armar la opción para seleccionarla.
- **Por qué importa**: contradice directamente el "funciona OK" de dev de hace 2 días, para el mismo tipo de operación (alta nueva) sobre la MISMA cuenta. Los reintegros ya existentes se siguen viendo bien (CP01) porque probablemente quedaron con los datos de la mascota "congelados" al momento de crearse — el problema está específicamente en la resolución EN VIVO de la identidad de la mascota para una alta nueva.
- Trazabilidad: `IMAS-4092` AC1/AC2 — no se cumple hoy para esta cuenta, aunque sí se cumplió el 2026-08-26.

**CP03 - Verificar que un Adquirente (control) sí puede iniciar un reintegro nuevo sin este problema** ✅✅ **CONFIRMADO — evidencia ya recogida hoy en la sesión de `IMAS-4052`**
- Dado: cuenta `pauscalzo@hotmail.com` (Paula Scalzo — la persona, no la dev homónima —, mascota Mishi, plan "VETIFY 100 SENIOR x1", no-OSDE, Adquirente).
- Cuando: Reintegros → Nuevo reintegro.
- Entonces: `GET /mascotas` → `200` con Mishi correctamente identificada (`nombre`, foto, especie completos) y preseleccionada en el wizard.
- Trazabilidad: `IMAS-4092` AC1/AC2 — cumplido para Adquirente. El contraste con CP02 sugiere que el problema de datos incompletos es específico de (al menos esta) cuenta Capitado, no un problema general del endpoint.

## TS-02 Multi-mascota (AC — "limitante documentado/acordado")

**CP04 - Verificar el comportamiento cuando un titular tiene 2+ mascotas (policy.key no las distingue)** 🟠 **NO EJECUTADO — investigado a fondo, sin cuenta utilizable hoy**
- Dado: se necesitaría una cuenta (Adquirente o Capitado) con 2 o más mascotas activas y DNI válido.
- Cuando: se intenta iniciar un reintegro y ver cómo el sistema resuelve a cuál mascota se imputa.
- Entonces (limitante ya documentada en el propio ticket): `policy.key` no distingue mascota — la resolución depende de `insuredObject` (IKE Mascotas) por fuera del `policy.key`.
- **Investigación de por qué no se pudo ejecutar (2026-08-28)**:
  1. Ni Popi ni Mishi (las cuentas ya usadas) tienen más de 1 mascota. El botón "Suscribir mascota" en la sección Mascotas **no agrega una mascota nueva** — solo completa la credencial de la única mascota que la cuenta ya tiene (el plan de ambas cuentas es de 1 sola mascota, sufijo `x1`). No hay alta de mascota adicional self-service para un plan de 1 mascota.
  2. Se buscó en `pooled-users.json` alguna cuenta con `numberOfPlans > 1`: **una sola** (`user_1786584481760_8aea8baa@automation.com`, `VETIFY_ADQUIRENTE`) tiene nota explícita *"provisionada... multi-mascota... ambos planes con mascota completada"* — sería la candidata ideal. Pero es la MISMA cuenta que ya había chocado hoy, más temprano, con `BUG-007`/`IMAS-4279` (DNI `1588816521`, 10 dígitos — formato inválido, bloquea toda la Reintegros antes de llegar a elegir mascota).
  3. Las otras 3 cuentas del pool con 2+ planes tienen el mismo problema de DNI (10 dígitos) **y además** ninguna tiene 2 mascotas reales — tienen 1 mascota + 1(o 2) plan(es) vacío(s) a propósito (`PLAN_WITHOUT_PET`).
- **Conclusión**: hoy no existe en el pool ninguna cuenta que combine (DNI válido) + (2 mascotas reales). No es falta de intento — es un gap de datos de prueba real y concreto. Para destrabar esto haría falta: (a) corregir el DNI de `user_1786584481760_8aea8baa@automation.com` a 7-8 dígitos, o (b) generar una cuenta nueva con 2 mascotas y DNI válido.
- Trazabilidad: `IMAS-4092` — "Limitante multi-mascota documentado/acordado".

## TS-03 Límite de 2 atenciones/año para Capitados

**CP05 - Verificar que el límite de "2 atenciones por año" se aplica realmente a cuentas Capitado** 🟠 **NO EJECUTADO — nadie lo probó nunca, ni dev ni QA**
- Dado: una cuenta Capitado que ya haya usado 2 atenciones de reintegro en el año en curso.
- Cuando: intenta pedir una 3ra.
- Entonces (regla de negocio citada textual en el ticket): debería bloquearse o advertirse por superar el límite anual.
- **No hay evidencia de esto en ningún lado** — ni en los comentarios de dev, ni en capturas, ni en este repo. Es una regla de negocio explícita del contrato que nadie parece haber verificado todavía. La cuenta Popi (DNI `12540524`) tiene 4 pagados + 1 solicitado + 2 desaprobados este año — **más de 2 "atenciones" aparentes**, lo cual podría significar que (a) el límite no cuenta igual que "reintegros totales" (quizás es por tipo de prestación, o el conteo excluye desaprobados), o (b) el límite no se está aplicando. No investigado más a fondo — requeriría entender primero qué cuenta exactamente como "atención" antes de diseñar un CP ejecutable.
- Trazabilidad: `IMAS-4092` — tabla "Adquirientes vs Capitados", fila "Límite". Pendiente aclarar la definición exacta de "atención" con el equipo antes de poder ejecutar este caso.

## Resumen de cobertura

| AC del ticket | Cubierto por | Estado |
|---|---|---|
| Listar tipos de gasto vía `claimsHistory` (capitados) | CP01 (histórico), CP02 (hoy) | 🟡 Funcionó antes, **no funciona hoy** para la misma cuenta |
| Listar tipos de gasto (adquirientes) | CP03 | ✅ Cumplido |
| Confirmación abre expediente Nexus correcto | CP01 (histórico) | 🟡 Solo evidencia pasada, no un ciclo nuevo hoy |
| Ciclo Calidad/Finanzas cierra con `refund/exp` | CP01 (histórico, vía backoffice cruzado) | 🟡 Solo evidencia pasada |
| Limitante multi-mascota documentada/acordada | CP04 | 🟠 No ejecutado, sin cuenta disponible |
| Límite 2 atenciones/año (capitados) | CP05 | 🟠 No ejecutado, nunca antes probado por nadie |

**Conclusión honesta**: `IMAS-4092` funcionó de punta a punta para un Capitado hace 2 días (26/08), pero **hoy la misma cuenta no puede iniciar un reintegro nuevo** por datos de mascota incompletos en `GET /mascotas`. No se puede dar por válido el "funciona OK" de dev sin resolver esto — es exactamente el mismo patrón de hoy con `BUG-015` (evidencia de dev que no se sostuvo en un retest independiente), aunque acá el síntoma es más sutil (funcionaba, dejó de funcionar, no se sabe cuándo ni por qué).

## Pendiente

1. Confirmar con dev/Core por qué `GET /mascotas` devuelve el registro de Popi con todos los campos de identidad en `null` hoy, cuando el 26/08 el mismo tipo de operación funcionó.
2. Corregir el DNI de `user_1786584481760_8aea8baa@automation.com` (10 dígitos → 7-8) o generar una cuenta nueva con 2 mascotas y DNI válido, para poder ejecutar CP04.
3. Aclarar con el equipo qué cuenta exactamente como "atención" para el límite de 2/año de capitados, antes de poder diseñar CP05 de forma ejecutable.
4. Repetir CP02 con las otras 2 cuentas `OSDE_CAPITADO` del pool una vez que tengan DNI válido (hoy bloqueadas por `BUG-007`/`IMAS-4279`) para saber si el problema de datos-null es específico de Popi o generalizado.
