# Diseño de casos — IMAS-3215 Reseteo de Contraseña B2C Vetify

> Diseño basado en riesgo (qa-risk-test-design). Riesgo del flujo: **ALTO** (impacto alto — afecta acceso/seguridad de cuenta; probabilidad media-alta — flujo nuevo, multi-paso, con dependencia externa de email). Cobertura mínima aplicada: 1 feliz + 3+ por sub-área.
>
> Estado de automatización por caso: **✅ Automatizable ahora** (una vez confirmados locators vía MCP) / **🔴 BLOQUEADO** (depende de IMAS-3467 — lectura de casilla de correo, ver `docs/impedimentos-bloqueos.md` IMP-006).
>
> Textos exactos (asunto del email, remitente, mensajes de error, reglas de política de contraseña) están marcados como `[CONFIRMAR]` — no están en la HU y deben verificarse contra UI/backend real antes de escribir el spec final.
>
> **Actualizado 2026-08-06 tras exploración MCP en `https://vetify-qa.ikeapp.com/auth/login`** — ver TS-01/TS-02 para el comportamiento real confirmado, incluye 2 hallazgos que parecen bugs (CP04, CP05).

## TS-01 Acceso a "Olvidé mi contraseña" (AC-1)

**CP01 - Verificar acceso al flujo de reseteo desde login** ✅ AUTOMATIZADO 2026-08-07 (TS-04 CP01)
- Dado: usuario en `/auth/login` (sin sesión iniciada)
- Cuando: hace click en el botón "¿Olvidaste tu contraseña?" (texto exacto confirmado)
- Entonces: **no hay navegación a otra URL** — se expande un sub-formulario inline en la misma pantalla `/auth/login`, con un input "Correo electrónico" (`#emailPassRecovery`) y botón "Enviar". El diseño previo asumía una pantalla separada; es incorrecto, corregir el POM en consecuencia.
- Trazabilidad: AC-1

## TS-02 Solicitud de reseteo (AC-2, AC-3)

**CP02 - Verificar solicitud de reset con email registrado** ✅ AUTOMATIZADO 2026-08-07 (`tests/projects/vetify-b2c/user-management.spec.ts`, TS-04 CP02)
- Dado: usuario con el sub-formulario de reseteo expandido; existe un usuario registrado (pool `UserTag.REGISTERED`)
- Cuando: ingresa el email del usuario y presiona "Enviar"
- Entonces: `POST /api/passrecovery` responde **200** con body `{"message":"Si el email está registrado, recibirás instrucciones para recuperar tu contraseña."}`; la UI muestra el mensaje **"Te hemos enviado un correo para que puedas resetear tu contraseña"** (texto de UI, distinto al texto del body de la API — ambos confirmados, documentar los dos)
- Trazabilidad: AC-2, AC-3

**CP03 - Verificar comportamiento con email no registrado** ✅ AUTOMATIZADO 2026-08-07 (TS-04 CP03)
- Dado: usuario con el sub-formulario de reseteo expandido
- Cuando: ingresa un email no asociado a ningún usuario (probado con `no-existe-este-usuario-qa-test@automation.com`)
- Entonces: **idéntico a CP02** — `POST /api/passrecovery` responde 200 con el mismo mensaje genérico, la UI muestra el mismo mensaje de éxito. **Confirmado: el sistema no revela si el email existe o no** (buen patrón de seguridad, evita user enumeration). No es un gap, es comportamiento esperado — se retira la nota `[CONFIRMAR]` anterior.
- Trazabilidad: AC-2 (comportamiento de seguridad confirmado)

**CP04 - Verificar campo email obligatorio** ✅ AUTOMATIZADO 2026-08-07 (TS-04 CP04) — 🐛 HALLAZGO, ver más abajo
- Dado: usuario con el sub-formulario de reseteo expandido
- Cuando: presiona "Enviar" sin ingresar email
- Entonces (comportamiento REAL observado): `POST /api/passrecovery` responde **400** con body `{"message":"email es requerido"}` (correcto en el backend) — pero el **frontend no muestra ese mensaje**. En su lugar muestra: **"En este momento estamos con problemas técnicos, te pedimos disculpas, si puedes contactanos al 0800-122-6238"** — un mensaje de error genérico de "sistema caído" que es engañoso para un simple campo vacío. No hay validación client-side previa al submit tampoco (el botón no está deshabilitado).
- Trazabilidad: AC-2 (borde) — **candidato a bug report** (UX: mensaje de error incorrecto/engañoso ante un error de validación, no un error de sistema)

**CP05 - Verificar formato de email inválido** ✅ AUTOMATIZADO 2026-08-07 (TS-04 CP05) — 🐛 HALLAZGO, ver más abajo
- Dado: usuario con el sub-formulario de reseteo expandido
- Cuando: ingresa `"noesunemail"` (sin `@`, formato inválido) y presiona "Enviar"
- Entonces (comportamiento REAL observado): **no hay validación de formato**. `POST /api/passrecovery` responde **200** con el mismo mensaje genérico de éxito, la UI muestra "Te hemos enviado un correo...". Contrasta con `RegistrationPage` donde sí existe validación de formato ("El correo electrónico no es válido", ver `user-management.spec.ts` TC-05). El AC de la HU dice explícitamente "Ingreso de un correo electrónico **válido**" — este campo no lo exige.
- Trazabilidad: AC-2 (borde) — **candidato a bug report** (falta validación de formato de email, inconsistente con el resto del sitio)

## TS-03 Recepción y contenido del email (AC-2, AC-3, AC-4)

> **✅ 2026-08-28 — CP06-CP09 destrabados y verificados en vivo, y el flujo se continuó hasta el final (CP10, CP13, CP16, CP17, ver TS-04/05/06 más abajo).** `IMP-006` (sin infraestructura de lectura de email) se resolvió construyendo `src/integrations/email/EmailClient.ts` (IMAP real vía `imapflow`+`mailparser`) y, en paralelo, `IMAS-4272` (el correo nunca llegaba) se confirmó arreglado — el usuario lo probó manual y el retest de abajo lo reconfirma end-to-end, incluyendo el cambio de contraseña real y el login posterior. Cuenta real usada: `alan.gonzalez@ingenia.la` (ya conocida del pool de cuentas reales, ver `IMP-003`). Reset disparado `2026-08-28T17:24:32Z`, correo recibido `2026-08-28T17:24:59Z` — **27 segundos**, primera vez que se documenta un dato real de SLA.

**CP06 - Verificar tiempo de envío del correo de recuperación** ✅ **verificado en vivo**
- Dado: se solicitó un reseteo para `alan.gonzalez@ingenia.la` (cuenta real, registrada)
- Cuando: se esperó con poll de 5s vía `EmailClient.waitForEmail()`
- Entonces: el correo llegó a los **27 segundos** — dentro de cualquier definición razonable de "tiempo razonable", aunque la HU sigue sin definir un SLA formal en segundos/minutos
- Trazabilidad: AC-2

**CP07 - Verificar remitente y asunto del correo** ✅ **verificado en vivo**
- Dado: se recibió el correo de recuperación
- Cuando: se inspecciona el mensaje
- Entonces: remitente = **`webapp@vetify.com.ar`**, asunto = **"Recuperá tu contraseña"**
- Trazabilidad: AC-3

**CP08 - Verificar estructura y contenido del correo** ✅ **verificado en vivo**
- Dado: se recibió el correo de recuperación
- Cuando: se inspecciona el cuerpo del mensaje (HTML)
- Entonces: título "Restablecé tu contraseña", texto "Pediste restablecer tu contraseña. Creá una nueva y volvé a cuidar a los tuyos sin vueltas.", botón "Restablecer contraseña", nota de vigencia explícita: *"Este enlace es de un solo uso y vence en 24 horas. Si no fuiste vos, ignorá este correo: tu cuenta sigue segura."* — preheader (texto de preview): "Creá una nueva contraseña y volvé a lo importante. Vence en 24 horas."
- Trazabilidad: AC-3

**CP09 - Verificar existencia y validez del link de reset dentro del correo** ✅ **verificado en vivo**
- Dado: se recibió el correo de recuperación
- Cuando: se extrae el link de reset del cuerpo del mensaje (`EmailClient.extractLinks()`)
- Entonces: el link existe y tiene la forma `https://ike-webapp-staging.us.auth0.com/u/reset-verify?ticket=<TOKEN>#` — **importante, no es un link al dominio de Vetify directamente, es una página hosteada por Auth0** (mismo tenant `ike-webapp-staging.us.auth0.com` ya usado para auth de Vetify, ver `AUTH_API_BASE_URL` en `.env`). El param se llama **`ticket`**, no `token`. Vigencia confirmada en el propio texto del correo: single-use, 24 horas.
- Trazabilidad: AC-4

## TS-04 Redirección al flujo de reset vía link (AC-5)

**CP10 - Verificar redirección correcta al hacer click en el link del correo** ✅ **verificado en vivo**
- Dado: se cuenta con un link de reset válido y vigente (confirmado el formato real en CP09)
- Cuando: se navega al link
- Entonces: el sistema redirige a `https://ike-webapp-staging.us.auth0.com/u/reset-password/change?state=...` — pantalla real "Introduzca una nueva contraseña" con 2 campos (Nueva contraseña / Reintroduzca contraseña) — no a login ni a error
- Trazabilidad: AC-5

**CP11 - Verificar comportamiento con link expirado** 🟡 **no probado literalmente (requiere esperar 24hs), pero inferible con alta confianza a partir de CP12** — TTL real confirmado en el propio correo: "vence en 24 horas" (ver CP08)
- Dado: se cuenta con un link de reset vencido (24hs+)
- Cuando: se navega al link
- Entonces: **muy probablemente** el mismo mensaje que CP12 (Auth0 usa una pantalla genérica "Enlace caducado" tanto para expirado por tiempo como para ya usado, no distingue el motivo) — no confirmado en vivo, solo inferido por el comportamiento observado en CP12
- Trazabilidad: AC-5 (negativo — no está explícito en la HU, gap de cobertura de seguridad)

**CP12 - Verificar comportamiento con link ya utilizado (reuso)** ✅ **verificado en vivo**
- Dado: un link de reset ya fue usado exitosamente una vez (el primero de esta sesión, ticket `JU6yuGh...`)
- Cuando: se navega nuevamente al mismo link
- Entonces: el sistema rechaza el reuso — título de página "Error de restablecimiento de contraseña", contenido: encabezado **"Enlace caducado"** + texto *"Para restablecer su contraseña, por favor vuelva hacia la página de inicio de sesión y seleccione '¿Olvidó su contraseña?' para enviar un nuevo email."* — nota: el mensaje dice "caducado" (expirado) aunque la causa real acá fue el reuso, no el tiempo; Auth0 no distingue los 2 motivos en la UI
- Trazabilidad: AC-5 (negativo, gap de seguridad)

## TS-05 Establecer nueva contraseña (AC-6)

> **✅ 2026-08-28 — CP13, CP16, CP17 (y luego CP14/CP15, ver abajo) verificados en vivo de punta a punta** (mismo retest de CP10, cuenta `alan.gonzalez@ingenia.la`).

**CP13 - Verificar cambio exitoso de contraseña cumpliendo política** ✅ **verificado en vivo — política real documentada por primera vez**
- Dado: usuario en la pantalla de cambio de contraseña (`https://ike-webapp-staging.us.auth0.com/u/reset-password/change?state=...`, post-link real)
- Cuando: ingresa `VetifyReset2026!` (cumple los 4 criterios, aunque la política solo exige 3 de 4) y confirma
- Entonces: el sistema acepta el cambio. **Política real, mostrada en vivo en la propia pantalla**: mínimo 8 caracteres + al menos 3 de {minúsculas, mayúsculas, números, caracteres especiales} — con checkmarks (✓) en tiempo real por cada criterio mientras se escribe
- Trazabilidad: AC-6

**CP14 - Verificar rechazo de contraseña débil** ✅ **verificado en vivo**
- Dado: usuario en la pantalla de cambio de contraseña
- Cuando: ingresa `abc` (3 caracteres, solo cumple 1 de los 4 criterios — minúsculas) en ambos campos
- Entonces: el submit queda **bloqueado** (no avanza a la pantalla de éxito), campo marcado inválido, checklist en vivo muestra solo "Letras minúsculas (a-z)" con ✓ y el resto sin marcar
- Trazabilidad: AC-6 (borde)

**CP15 - Verificar campo de nueva contraseña obligatorio** ✅ **verificado en vivo**
- Dado: usuario en la pantalla de cambio de contraseña
- Cuando: confirma sin ingresar contraseña en ninguno de los 2 campos
- Entonces: el sistema no permite continuar — mensajes exactos: **"Introduzca una nueva contraseña."** (campo 1) y **"Debe introducir la contraseña una segunda vez"** (campo 2), ambos campos marcados inválidos
- Trazabilidad: AC-6 (borde)

## TS-06 Confirmación e inicio de sesión (AC-7, AC-8)

**CP16 - Verificar confirmación del cambio de contraseña** ✅ **verificado en vivo**
- Dado: se completó el cambio de contraseña exitosamente
- Cuando: se observa la respuesta del sistema
- Entonces: la pantalla cambia a título "¡Contraseña cambiada!" y texto "Su contraseña se ha cambiado con éxito" (página propia de Auth0, `reset-password/change`, mismo `state`)
- Trazabilidad: AC-7

**CP17 - Verificar login exitoso con la nueva contraseña** ✅ **verificado en vivo**
- Dado: la contraseña fue reseteada exitosamente
- Cuando: el usuario inicia sesión en `/auth/login` con el nuevo password
- Entonces: login exitoso, redirige a Home ("¡Hola, alan!") — confirmado con la cuenta real
- Trazabilidad: AC-8

**CP18 - Verificar que la contraseña anterior deja de ser válida** ✅ **verificado en vivo — segundo reset encadenado**
- Dado: la contraseña fue reseteada exitosamente (a `VetifyReset2026!`, ver CP13)
- Cuando: se disparó un SEGUNDO reset sobre la misma cuenta, se cambió a `VetifyReset2026Bis!`, y luego se intentó iniciar sesión con la contraseña anterior (`VetifyReset2026!`, ya conocida por ser la que se acababa de establecer)
- Entonces: el sistema **rechaza el login** — UI: *"La contraseña y/o correo electrónico no es válido. ¿No tienes usuario?"*; red: `POST https://ike-webapp-staging.us.auth0.com/oauth/token` → `403` (mismo patrón de error que un email inexistente, ver `IMP-005`)
- Trazabilidad: AC-8 (negativo, gap de cobertura no explícito en HU pero crítico para seguridad)
- Nota de método: como esta sesión nunca tuvo la contraseña ORIGINAL de la cuenta (solo las credenciales IMAP), se resolvió encadenando un segundo reset — la contraseña "vieja" a probar pasó a ser una que la propia sesión ya conocía con certeza (la recién establecida en CP13), no una suposición.

---

## Resumen de cobertura vs. criterios de aceptación

| AC | Cubierto por | Estado |
|---|---|---|
| AC-1 Acceso a "Olvidé mi contraseña" | CP01 | ✅ Automatizable |
| AC-2 Envío en tiempo razonable | CP02, CP03, CP04, CP05, CP06 | ✅ CP06 verificado en vivo (27s) |
| AC-3 Recepción correcta del email | CP06, CP07, CP08 | ✅ Verificado en vivo 2026-08-28 |
| AC-4 Link válido en el contenido | CP09 | ✅ Verificado en vivo 2026-08-28 |
| AC-5 Redirección al flujo de reset | CP10, CP11, CP12 | ✅ CP10/CP12 verificados en vivo. CP11 (link expirado por tiempo) no probado literalmente — inferido con alta confianza a partir de CP12 (mismo mecanismo de Auth0) |
| AC-6 Nueva contraseña cumple política | CP13, CP14, CP15 | ✅ Los 3 verificados en vivo, política real documentada |
| AC-7 Confirmación del cambio | CP16 | ✅ Verificado en vivo |
| AC-8 Login con nueva contraseña | CP17, CP18 | ✅ Ambos verificados en vivo (CP18 vía un 2do reset encadenado) |
| AC-9 Sin errores funcionales/UI en todo el flujo | Implícito en todos los CP anteriores (asserts de UI en cada paso) | ✅ Ningún error encontrado en todo el flujo feliz de punta a punta |

**18 casos diseñados. Actualizado 2026-08-28: flujo completo de reseteo verificado en vivo de punta a punta** (`IMP-006` resuelto, `IMAS-4272` confirmado arreglado) — **17 de 18 casos en verde con datos 100% reales** (CP01-CP10, CP12-CP18), cuenta `alan.gonzalez@ingenia.la`. **Solo `CP11` queda sin confirmar literalmente** — requiere esperar 24hs reales (el TTL del link) o que alguien con acceso al backend fuerce la expiración; se infiere con alta confianza que se comporta igual que `CP12` (mismo mensaje genérico "Enlace caducado" de Auth0), pero no es lo mismo que haberlo visto. Falta además escribir un `.spec.ts` real que use `EmailClient` — todo lo de hoy fue verificación manual vía Playwright MCP + 3 resets encadenados, no quedó persistido como test automatizado de la suite.

**⚠️ Nota operativa**: la cuenta `alan.gonzalez@ingenia.la` quedó con la contraseña `VetifyReset2026Bis!` al cierre de esta sesión (se cambió/reconfirmó 3 veces en total: CP13, CP18, y al cerrar el link de CP14/CP15) — si se reusa esta cuenta más adelante, la contraseña vigente es esa, no la original.

## Retest 2026-08-07 — CP01-CP05 automatizados

Confirmados en vivo contra QA real y automatizados en `tests/projects/vetify-b2c/user-management.spec.ts` (`TS-04 IMAS-3215 - Olvidé contraseña`), 5/5 verdes en Desktop (este sitio — "Vetify Adquirente [B2C]" — no tiene proyecto mobile habilitado en `playwright.config.ts`, a diferencia de "Vetify WebApp"; pendiente decidir si se extiende).

- **CP01**: confirmado — el sub-formulario se expande inline en `/auth/login`, sin navegar a otra URL.
- **CP02/CP03**: confirmado — mismo mensaje genérico de éxito con email registrado y no registrado (previene user enumeration, comportamiento correcto).
- **CP04/CP05**: confirmados como hallazgos reales, no solo hipótesis — ver sección de hallazgos abajo.

**CP06-CP09 destrabados 2026-08-28** (ver sección TS-03 arriba, con datos reales) — evaluado en su momento que el token no aparece en la respuesta de `POST /api/passrecovery` (siempre el mensaje genérico), así que la única vía real es leer la casilla — ya construida (`EmailClient`).

**CP10-CP18 (redirección, cambiar contraseña, confirmar, loguearse con la nueva, vieja invalidada) siguen sin automatizar en un `.spec.ts` real** — la infraestructura para conseguir el link ya no es el bloqueo; falta decidir si se ejecuta el flujo completo (cambia la contraseña real de la cuenta de prueba usada) y escribir el spec que use `EmailClient` en vez del script puntual con el que se verificó hoy.

## Hallazgos de la exploración MCP (2026-08-06) — pendientes de decisión del usuario

**✅ Reportados en Jira 2026-08-07**, con OK explícito del usuario del proyecto, vinculados a IMAS-3215 con "Blocks" (aplica también a IMAS-3216/IMAS-3217 por ser la misma pantalla compartida). Ambos observados en `https://vetify-qa.ikeapp.com/auth/login`, endpoint `POST /api/passrecovery`:

1. **CP04 — Mensaje de error engañoso ante campo vacío** → **IMAS-4198**: el backend devuelve correctamente 400 `"email es requerido"`, pero el frontend ignora ese mensaje y muestra un texto de "problemas técnicos" (sugiere caída de sistema) en vez de indicar que falta completar el campo.
2. **CP05 — Falta validación de formato de email** → **IMAS-4199**: el campo de reseteo acepta cualquier string sin validar formato (`"noesunemail"` → 200 OK, mismo mensaje de éxito), a diferencia del formulario de registración que sí valida formato.

Ninguno de los dos impide el flujo end-to-end (ambos casos igual muestran algún mensaje), pero ambos violan el AC-2 tal como está redactado ("envía... correo electrónico válido" / experiencia sin errores confusos).
