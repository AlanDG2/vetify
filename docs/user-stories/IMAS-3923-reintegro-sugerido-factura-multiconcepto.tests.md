# Diseño de casos — IMAS-3923 Reintegro sugerido usa total de factura con un solo tipo de gasto

> Diseño basado en riesgo (`qa-risk-test-design`). **Reconstruido desde evidencia real ya existente** (comentarios de Jira en `IMAS-3923`, ver `IMAS-3923-reintegro-sugerido-factura-multiconcepto.md`) — la subtarea `IMAS-3967` ("Creación de los casos de prueba") está marcada Hecho en Jira pero sin ningún contenido real; el trabajo de QA sí se ejecutó (retest de Alan, 2026-08-11), solo que nunca se formalizó como caso de prueba. Nada acá se inventa sin fuente — cada CP cita de dónde sale.
>
> **Estado por caso**: ✅ verificado en vivo / ⏳ DBD (identificado, pendiente de ejecutar) / ⚠️ gap contra el DOD, no confirmado.

## TS-01 Distribución manual de factura con reintegro de un solo tipo de gasto
**Riesgo: ALTO** (impacto alto — afecta el monto de dinero reintegrado; es el bug original de la HU).

**CP01 - Verificar que el sistema exige distribución manual en vez de auto-calcular el total de la factura como monto reintegrable** ✅ (verificado 2026-08-11)
- Dado: expediente de reintegro con factura real de 2 conceptos (Consulta $81.000 + Estudio Radiográfico $65.000, total $146.000), titular solicita reintegro de un solo tipo de gasto (Vacunación)
- Cuando: Calidad abre el expediente en `reintegros-backoffice` (ambiente QA)
- Entonces: el sistema **no** toma el total de la factura ($146.000) como monto reintegrable del ítem solicitado — exige que Calidad distribuya manualmente la factura línea por línea antes de continuar
- Trazabilidad: fuente = comentario de Alan Gonzalez en `IMAS-3923`, 2026-08-11. Expediente de prueba real: `3132040`

**CP02 - Verificar que "Confirmar distribución" permanece bloqueado hasta que la cuadratura sea exacta** ✅ (verificado 2026-08-11, misma sesión que CP01)
- Dado: modal "Distribución de factura" abierto sobre el expediente de CP01
- Cuando: se distribuye línea "Vacunación" $81.000 (aceptada) y línea "Estudio Radiográfico" $65.000 (rechazada, motivo "El plan no cubre el servicio")
- Entonces: el footer de cuadratura (total factura vs. distribuido) muestra diferencia $0,00 recién cuando la suma de las 2 líneas iguala el total ($146.000); "Confirmar distribución" permanece deshabilitado hasta ese punto y se confirma sin errores una vez cuadrado
- Trazabilidad: misma fuente que CP01

**CP03 - Verificar que el motivo de rechazo de una línea no cubierta queda registrado** ✅ (verificado 2026-08-11, misma sesión)
- Dado: línea "Estudio Radiográfico" marcada para rechazo dentro del mismo modal de distribución
- Cuando: se selecciona el motivo "El plan no cubre el servicio" y se confirma la distribución
- Entonces: la distribución se confirma sin errores con ese motivo asociado a la línea rechazada
- Trazabilidad: misma fuente que CP01

## TS-02 Registro en SISE por concepto — DOD explícito, no confirmado
**Riesgo: ALTO** (impacto alto — es un requisito explícito del DOD, no una mejora opcional; probabilidad media, nunca se verificó específicamente).

**CP04 - Verificar que, con más de un concepto en la factura, se abre un expediente en SISE por cada uno, con la bitácora acordada** ⚠️ **Gap real — no confirmado por la evidencia existente**
- Dado: el mismo escenario de CP01 (factura con 2 conceptos, reintegro de 1 tipo de gasto)
- Cuando: se completa la distribución y confirmación de la factura
- Entonces (esperado, DOD literal de `IMAS-3923`): debe abrirse un expediente en SISE por cada concepto, para dejar registro, con la bitácora acordada en la tarjeta de Oscar Tello
- Entonces (lo único confirmado hoy): el retest de Alan (08-11) solo registra **un** número de expediente (`3132040`) para las 2 líneas — no queda explícito si cada línea generó su propio expediente en SISE o si comparten uno
- **Acción requerida antes de dar por cumplido el DOD**: repetir el flujo verificando puntualmente cuántos expedientes SISE se abren y si la bitácora coincide con lo acordado — no asumir que CP01-CP03 alcanzan para cerrar este punto

## TS-03 Casos borde — identificados, sin ejecutar todavía (DBD)
**Riesgo: ALTO** (mismo impacto que TS-01; probabilidad baja de que ya estén cubiertos, ninguno tiene evidencia real).

**CP05 - Verificar el comportamiento cuando el titular solicita reintegro de un tipo de gasto que cubre TODOS los conceptos de la factura** ⏳ DBD
- Dado/Cuando/Entonces: sin diseñar — no hay evidencia real de este escenario en los comentarios de Jira

**CP06 - Verificar el aviso de tope cuando una línea aceptada supera el tope por evento de SISE** ⏳ DBD
- Trazabilidad parcial: `IMAS-4010` ("Corrección de distribución confirmada, avisos de tope, parseo de moneda") menciona este comportamiento como construido, pero ningún comentario de Jira lo prueba en vivo

**CP07 - Verificar que un intento de confirmar distribución con cuadratura incorrecta (diferencia ≠ $0) es rechazado explícitamente** ⏳ DBD
- Nota: CP02 confirma que el botón queda deshabilitado *durante* el proceso normal de carga, pero no hay evidencia de haber forzado un desbalance real para confirmar el mensaje/bloqueo exacto

## Alcance y ubicación en el tracker

Estos CPs prueban `reintegros-backoffice` (herramienta interna de Calidad, no la WebApp del tutor) — no encajan en la hoja "Reintegros" existente de `documentation/Casos de Prueba.xlsx` (esa hoja es 100% flujo tutor). Pendiente de decisión de Alan sobre dónde trackear esto (hoja nueva vs. no incluir en ese Excel).
