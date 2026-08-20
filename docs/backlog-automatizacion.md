# Backlog de automatización — gap analysis vs. Casos de Prueba manuales

> Qué falta automatizar, priorizado por esfuerzo/valor. Fuente: `documentation/Casos de Prueba.xlsx` (columna `Automatizado?`) cruzado contra el código real (`tests/projects/**/*.spec.ts`, POMs en `src/pages/`). Complementa `docs/coverage-register.md` (que trackea lo YA automatizado por HU) — este archivo trackea lo que falta, No confundir ambos.
>
> **Última actualización**: 2026-08-07 — Tier 2 (Videollamadas) queda 100% cerrado, ver `docs/coverage-register.md` para las 6 HUs de videollamada.

## Nota — hojas `Reintegros` y `Miscelaneas`

Ambas están **vacías en el Excel** (solo header + grupo "Adquirientes", 0 casos diseñados todavía). No es un gap de automatización — es un gap de *diseño de casos*, previo a automatizar. Además, `Reintegros` toca `institucional.ike.qa` / backoffice, que requiere VPN (sin acceso al momento de este análisis). Cuando haya VPN, el primer paso ahí es diseño de casos, no automatización directa.

**Nota 2026-08-07, sin confirmar si es el mismo sistema**: se accedió sin problema (vía MCP, sin necesidad aparente de VPN — aunque no se puede descartar que la VPN ya estuviera activa en la máquina del usuario) a `reintegros-backoffice.ike.qa` (certificado propio, requiere `--ignore-https-errors` en `.mcp.json`) durante IMAS-3742. Es un panel de gestión de reintegros/reembolsos veterinarios (solicitudes "VETI-...", expedientes SISE) — no está confirmado si es el mismo backoffice que `institucional.ike.qa` mencionado arriba o uno distinto. Si resulta ser el mismo, revisar si el bloqueo de VPN sigue vigente.

## Tier 1 — infraestructura ya construida, esfuerzo bajo

Todo sobre `tests/projects/vetify-webapp/credentials.spec.ts` + `VetifyWebappAddPetFormPage` (`src/pages/vetify/webapp/credentials/AddPetFormPage.ts`), ya usados por specs verdes.

| Hoja / ID | Título | Crítico | Estado en código | Nota |
|---|---|---|---|---|
| ~~Credenciales CP-21 (TS-02 Paso 5)~~ | Subir foto — Archivo en formato no permitido | No | **✅ Automatizado 2026-08-07** — `credentials.spec.ts` TC-21, verde en Desktop+Android. Mensaje real confirmado: "No se pudo cargar la foto", "Continuar" queda deshabilitado |
| ~~Credenciales CP-02 (TS-03 Crear Credencial)~~ | Cargar credencial sin foto (Omitir) | **Sí** | **No aplica — investigado 2026-08-07**: no existe ningún botón "Omitir" en la pantalla real de carga de foto. "Continuar" queda deshabilitado tanto antes de subir nada como después de un intento fallido — la foto es obligatoria hoy en la UI, a diferencia de lo que asume el caso diseñado en el Excel. No se automatiza (no tiene sentido codificar un flujo que no existe); no se reporta como bug (no está confirmado si es un cambio de requisito intencional) |
| Credenciales CP-18/CP-19/CP-20 (TS-02 Paso 5) | Cámara no disponible / disponible / tomar foto | No | Stubs vacíos con `test.skip('Test not implemented yet.')` | Requiere flags de Playwright (`--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`), no bloqueado externamente |

## Tier 2 — mismo spec ya verde, extensiones incrementales

`tests/projects/vetify-webapp/videocall.spec.ts` (IMAS-3889, multi-mascota) está 100% DoD — estos son casos adicionales sobre `VideocallFormPage`, ya construido y probado.

| Hoja / ID | Título | Crítico | Nota |
|---|---|---|---|
| ~~Videollamadas CP06~~ | [Negativo] "otro motivo" vuelve obligatorio el comentario adicional | No | **✅ Automatizado 2026-08-07** — `videocall.spec.ts` TC-10 (TS-03 IMAS-3889), verde en Desktop+Android. Confirmado en vivo: al elegir "Otro motivo" el campo se marca "Obligatorio" y bloquea "Continuar" |
| ~~Videollamadas CP09~~ | Botón "Continuar" en adjuntos deshabilitado sin archivo | No | **✅ Automatizado 2026-08-07** — cubierto indirectamente por TC-02/TC-09 (**IMAS-4023**) |
| ~~Videollamadas CP10~~ | [Negativo] Rechazo de formato de archivo no permitido | No | **✅ Automatizado 2026-08-07** (**IMAS-4023** CA01/CA02/CA06) — `videocall.spec.ts` TC-07, texto real confirmado en vivo: "No se pudo subir el archivo. Intentá nuevamente." |
| ~~Videollamadas CP12~~ | [Borde] Bloqueo de subir al llegar a 5 archivos | No | **✅ Automatizado 2026-08-07** (**IMAS-4023** CA01/CA05) — TC-07. El input de archivo se oculta al llegar a 5 (no el bloque de texto, que sigue visible) |
| ~~Videollamadas CP13~~ | [Borde, mobile] Bloqueo de cámara al llegar a 5 archivos | No | **✅ Automatizado 2026-08-07** (**IMAS-4023**) — TC-08, corrido y verificado en Android real |
| ~~Videollamadas CP15~~ | [Negativo] [API] Bypass de validaciones de archivos directo al backend | No | **No aplica — reevaluado 2026-08-07**: confirmado en vivo que el front llama al mismo endpoint (`POST /api/files/upload/pets`) para CUALQUIER archivo, válido o no; no hay un gate solo-frontend que "bypasear". La validación real ya se ejercita en TC-07 (CP10) |
| Videollamadas CA03 (IMAS-4023) | Reintento de carga tras error (archivo inválido → válido) | Sí | **✅ Automatizado 2026-08-07** — `videocall.spec.ts` TC-09 |
| ~~Videollamadas CA07 (IMAS-4023)~~ | Analítica de intentos/rechazos/reintentos de carga | No | **Descartado 2026-08-07** — confirmado con la PO (Pau): no fue algo hablado al definir la HU y no aporta valor suficiente, queda fuera de alcance. No automatizar |

## Tier 2b — Reseteo de contraseña (IMAS-3215), parcialmente destrabado

`tests/projects/vetify-b2c/user-management.spec.ts` (TS-04) — 5/18 CPs automatizados 2026-08-07. Ver `docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md`.

| CP | Título | Estado |
|---|---|---|
| ~~CP01-CP05~~ | Acceso al flujo + solicitud de reset (registrado/no registrado/vacío/formato inválido) | **✅ Automatizado 2026-08-07**, 5/5 verdes |
| CP06-CP12 | Recepción/contenido del email, link de reset, redirección | 🔴 Bloqueado — IMP-006 (sin infra de lectura de casilla). Confirmado que `/api/passrecovery` no expone el token en la respuesta |
| CP13-CP18 | Cambiar contraseña, confirmar, loguearse con la nueva, vieja invalidada | 🔴 Bloqueado — depende de tener un link/token de reset válido (mismo motivo que arriba) |

**Para destrabar CP06-CP18 sin infraestructura de email**: preguntarle al equipo de dev si puede exponerse el token/link de reset de otra forma en QA (endpoint de debug, feature flag, etc.). Sin eso, solo queda esperar a que se resuelva IMP-006 (IMAS-3467, lectura de casilla de correo).

**IMAS-3216 (Capitado OSDE) / IMAS-3217 (Capitado FLUX)**: mismo bloqueo aplica 1:1 — ambos reusan la misma pantalla `/auth/login` de Vetify webapp (confirmado en `docs/user-stories/IMAS-3216-*.md` / `IMAS-3217-*.md`), sin diseño de casos nuevo necesario.

## Tier 3 — alcance nuevo, sin VPN pero a verificar contra impedimentos existentes

| Hoja / ID | Título | Crítico | Nota |
|---|---|---|---|
| Gestión de Usuario TS-03 CP-01 | Activación de cuenta — Campos obligatorios | No | Repetido en Vetify B2C, OSDE Adquirente, OSDE Capitado, Flux Capitado |
| Gestión de Usuario TS-03 CP-02 | Activación de cuenta — Listado de tipos de documento | No | Ídem — **verificar primero si aplica igual en OSDE/Flux Capitado** dado `IMP-002` (`docs/impedimentos-bloqueos.md`): esos productos no tienen pantalla de registro propia, podría pasar lo mismo con activación |

## Bloqueado — no es por VPN, son impedimentos ya documentados

No avanzar acá aunque no dependan de la VPN de Reintegros:

- **Gestión de Usuario TS-04/TS-05** (Olvidé contraseña / Cambio de contraseña, los 4 productos) — bloqueado por `IMP-006`: sin infraestructura de lectura de casilla de correo en el repo. Ver `docs/impedimentos-bloqueos.md`.
- **Perfil — "Cambiar DNI - Nuevo DNI ya registrado con otro usuario"** y **"...Nuevo DNI sin utilizar en el sistema"** — Pasos/Resultado esperado siguen como `DBD` (por definir) en el Excel, no están listos para automatizar todavía (falta definición, no es un bloqueo técnico).
- **Flujo de Compra** (las 8 variantes de compra exitosa + fallida, por producto) — no bloqueado en el Excel, pero cruza con `IMP-004` (vinculación compra↔usuario poco confiable en QA, requiere esperar propagación) — evaluar caso por caso antes de comprometerse a un tier.

## Ver también

- `docs/coverage-register.md` — inventario de lo YA automatizado por HU (estado real, ambiente).
- `docs/impedimentos-bloqueos.md` — detalle completo de IMP-002, IMP-004, IMP-006.
- `qa-workspace/known-issues.md` — issues de ambiente/pool de usuarios, no de diseño de casos.
