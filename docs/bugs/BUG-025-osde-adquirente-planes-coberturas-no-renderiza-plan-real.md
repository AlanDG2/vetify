**ESTADO: RETESTEADO 2026-09-10 — INCONCLUSO, no se pudo reproducir la mecánica exacta.** Con la misma cuenta (`adquirenteosde@gmail.com`), "Planes y coberturas" sigue mostrando "No hay planes por el momento." — pero esta vez `GET /api/services/plans/engage/{dni}` devolvió `500` (2/2 veces), no `200` con datos reales como decía el hallazgo original. No se puede confirmar si el bug de render en sí sigue existiendo porque el endpoint no llegó a responder bien para probarlo — es el mismo síntoma de fondo que otros impedimentos de ambiente ya documentados (500 intermitente). No se crea Defect nuevo; retestear cuando el endpoint responda 200 de forma estable.

Jira: sin crear — inconcluso, ver retest de arriba.

[Título]: BUG | OSDE Adquirente: "Planes y coberturas" muestra "No hay planes por el momento" pese a que el backend devuelve un plan real y activo
[Severidad]: Medio-Alto — no bloquea la compra ni el acceso, pero el titular no puede ver el detalle de su propio plan contratado (cobertura, facturación) en una pantalla dedicada a exactamente eso.
[Categoría]: Frontend (render) / Webapp Vetify
[HU relacionada]: Encontrado investigando `IMAS-4356` (banner Cooper OSDE) — no es un bug de esa HU, es un hallazgo transversal en la misma cuenta. Ver `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.md` e `IMAS-4356-banner-cooper-webapp-osde.tests.md` (fila "Planes y coberturas (Adquirente)" en la matriz de cobertura).

[Información del entorno]:
- Ambiente: QA — `https://vetify-qa.ikeapp.com/section/myplans` (pantalla "Planes y coberturas", `VetifyWebappMyPlansPage`)
- Cuenta de prueba: `adquirenteosde@gmail.com` — producto real confirmado `2364` ("Vetify Emergencias x1 OSDE"), DNI `45285456`
- Fecha de detección: 2026-08-28 (retest de `IMAS-4356`/`IMP-014`)

[Descripción]:
Investigando por qué el banner de Cooper/Vetify PLUS se veía inconsistente (`IMAS-4356`), se confirmó que el backend de servicios (`category/overview`, `plans/engage/{dni}`, `notifications`) estaba fallando con `500` intermitente (`IMP-014`, reportado como `IMAS-4464`). Al re-testear con el backend ya sano (2026-08-28 tarde, 0 errores 500 en 5 logins frescos), el síntoma de `IMP-014` desapareció — pero uno de los síntomas que se le venía atribuyendo a ese impedimento **siguió reproduciendo con el backend confirmado sano**: la pantalla "Planes y coberturas" de la cuenta OSDE Adquirente sigue mostrando el estado vacío pese a que el endpoint que la alimenta responde `200` con un plan real.

`GET /api/services/plans/engage/45285456` devolvió `200` las 2 veces que se probó, con `elements[]` de 1 ítem: plan real, `estado: "ACTIVO"`, `desCuenta: "Vetify Emergencias x1 OSDE"`, producto `2364`. La UI, en las 2 mismas cargas, mostró "No hay planes por el momento".

**No es el mismo síntoma que `IMP-014`**: ese impedimento es sobre el endpoint devolviendo `500` (error de servidor no controlado). Acá el endpoint responde `200` con datos de negocio válidos — el problema es que el frontend descarta o no renderiza un plan real que el backend sí entrega. Es un bug de render, no un error de infraestructura.

**Candidato de causa (no confirmado, requiere que dev lo revise)**: varios campos del plan devuelto vienen `null` — `priceAmount`, `priceLabel`, `billingPeriodLabel`, `description`, `coverageTarget`, `nextBillingDate`, `nextBillingAmount`, `linea`. Si el componente de la tarjeta de plan filtra o exige alguno de estos campos para decidir si renderiza, un producto OSDE (que aparentemente maneja precio/facturación de forma distinta a un plan Vetify común — incorporado al ID de producto en vez de como campos de descuento aparte) podría quedar afuera del render sin que el backend haya hecho nada incorrecto.

[Pasos para reproducir]:
1. Iniciar sesión en `https://vetify-qa.ikeapp.com` con una cuenta OSDE Adquirente que tenga un plan activo real (ej. `adquirenteosde@gmail.com`).
2. Ir a la sección "Planes y coberturas" (`/section/myplans`, vía menú "Cuenta").
3. Observar la pantalla.
4. (Para confirmar que no es el backend) Capturar la red y verificar la respuesta de `GET /api/services/plans/engage/{dni}`.

[Resultado esperado]:
La pantalla muestra la tarjeta del plan real contratado (`Vetify Emergencias x1 OSDE` u otro), con su información de cobertura/facturación.

[Resultado actual]:
La pantalla muestra "No hay planes por el momento", pese a que `GET /api/services/plans/engage/{dni}` responde `200` con `elements[]` conteniendo el plan real (`estado: "ACTIVO"`). Reproducido 2/2 veces el mismo día, con captura de red confirmando que el backend no es la causa.

[Notas adicionales]:
- Descubierto junto con `IMAS-4356` (banner Cooper) y `IMP-014` (500 intermitentes) en la misma cuenta — los 3 hallazgos comparten cuenta/sesión pero son independientes entre sí. Este es el único de los 3 sin Jira ni archivo de bug propio hasta ahora.
- No confirmado si afecta solo al segmento OSDE Adquirente o también a OSDE Capitado/Flux — no se probó la misma pantalla en esos segmentos durante esta investigación.
- No hay CP (caso de prueba) formal escrito para este hallazgo todavía — es una observación encontrada en el camino, no parte del diseño de casos original de `IMAS-4356`.
- Ver `docs/user-stories/IMAS-4356-banner-cooper-webapp-osde.tests.md` (fila "Planes y coberturas (Adquirente)") y `qa-workspace/decision-log.md` (2026-08-28) para el contexto completo de la investigación que lo encontró.

## 🔎 Retest 2026-09-02 — NO reproduce con cuenta OSDE real (pool)

Cuarta verificación en QA. Esta vez con una cuenta **OSDE Adquirente real del pool** (`user_1788192447095_142c8da5@automation.com`, DNI `1668472081`, plan Cachorros, creada el 2026-08-31 vía compra real OSDE para validar BUG-017/IMAS-4431). Login en `vetify-qa.ikeapp.com` → ir a "Planes y coberturas" (`/section/myplans`).

Resultado:
- **UI: la tarjeta del plan se ve** ("Vetify Cachorro x1" como acordeón expandible). Al expandir: muestra Grupo 0158, Código Producto 2360, botón "Condiciones del Servicio". **NO** se ve "No hay planes por el momento".
- Backend `GET /api/services/plans/engage/1668472081?brand=vetify` → `200 OK` con `elements[]` de 1 ítem: `desCuenta: "Vetify Cachorro x1 OSDE"`, `estado: "ACTIVO"`, `nroCuenta: "2360"`, `codigoGrupoCuenta: "0158"`.
- **Diferencia importante vs. el caso original**: este plan es OSDE (el nombre dice "OSDE") pero está en `codigoGrupoCuenta: "0158"` (VETIFY MASCOTAS), no en `0163` (el grupo "OSDE Adquirente" original del bug). El plan Cachorros OSDE se vendió con descuento del 30% (es la promoción que el `from=osde` aplica al checkout), pero la catalogación interna del producto no está en el segmento "OSDE Adquirente" puro.
- A pesar de tener `priceAmount`, `priceLabel`, `billingPeriodLabel`, `coverageTarget`, `nextBillingDate`, `nextBillingAmount` todos `null` (mismo síntoma que la cuenta original del bug), la UI **sí renderiza la tarjeta**. Esto sugiere que el render de la tarjeta no exige esos campos como bloqueantes — son opcionales.

**Conclusión**: BUG-025, tal como está documentado, **no se reproduce en QA con cuentas OSDE reales del pool**. La cuenta `adquirenteosde@gmail.com` (sobre la que se reportó originalmente) sigue siendo la única con el síntoma "No hay planes por el momento" pese a que el backend responde 200 con datos. El perfil de esa cuenta podría ser excepcional (cuenta migrada/legada de producción, no creada en QA limpia) — pero ya no puedo verificar esa cuenta aquí porque no tengo credenciales a mano en este retest.

**Decisión actualizada (2026-09-02)**: no filear todavía. Si vuelve a aparecer el síntoma con cualquier cuenta nueva, sí amerita Defect nuevo. Mantener el doc como referencia histórica + watch item.
