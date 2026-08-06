# Diseño de casos — IMAS-3215 Reseteo de Contraseña B2C Vetify

> Diseño basado en riesgo (qa-risk-test-design). Riesgo del flujo: **ALTO** (impacto alto — afecta acceso/seguridad de cuenta; probabilidad media-alta — flujo nuevo, multi-paso, con dependencia externa de email). Cobertura mínima aplicada: 1 feliz + 3+ por sub-área.
>
> Estado de automatización por caso: **✅ Automatizable ahora** (una vez confirmados locators vía MCP) / **🔴 BLOQUEADO** (depende de IMAS-3467 — lectura de casilla de correo, ver `docs/impedimentos-bloqueos.md` IMP-006).
>
> Textos exactos (asunto del email, remitente, mensajes de error, reglas de política de contraseña) están marcados como `[CONFIRMAR]` — no están en la HU y deben verificarse contra UI/backend real antes de escribir el spec final.
>
> **Actualizado 2026-08-06 tras exploración MCP en `https://vetify-qa.ikeapp.com/auth/login`** — ver TS-01/TS-02 para el comportamiento real confirmado, incluye 2 hallazgos que parecen bugs (CP04, CP05).

## TS-01 Acceso a "Olvidé mi contraseña" (AC-1)

**CP01 - Verificar acceso al flujo de reseteo desde login** ✅ CONFIRMADO
- Dado: usuario en `/auth/login` (sin sesión iniciada)
- Cuando: hace click en el botón "¿Olvidaste tu contraseña?" (texto exacto confirmado)
- Entonces: **no hay navegación a otra URL** — se expande un sub-formulario inline en la misma pantalla `/auth/login`, con un input "Correo electrónico" (`#emailPassRecovery`) y botón "Enviar". El diseño previo asumía una pantalla separada; es incorrecto, corregir el POM en consecuencia.
- Trazabilidad: AC-1

## TS-02 Solicitud de reseteo (AC-2, AC-3)

**CP02 - Verificar solicitud de reset con email registrado** ✅ (mecánica confirmada con email no registrado, pendiente repetir con un email real del pool para confirmar que el comportamiento no cambia)
- Dado: usuario con el sub-formulario de reseteo expandido; existe un usuario registrado (pool `UserTag.REGISTERED`)
- Cuando: ingresa el email del usuario y presiona "Enviar"
- Entonces: `POST /api/passrecovery` responde **200** con body `{"message":"Si el email está registrado, recibirás instrucciones para recuperar tu contraseña."}`; la UI muestra el mensaje **"Te hemos enviado un correo para que puedas resetear tu contraseña"** (texto de UI, distinto al texto del body de la API — ambos confirmados, documentar los dos)
- Trazabilidad: AC-2, AC-3

**CP03 - Verificar comportamiento con email no registrado** ✅ CONFIRMADO
- Dado: usuario con el sub-formulario de reseteo expandido
- Cuando: ingresa un email no asociado a ningún usuario (probado con `no-existe-este-usuario-qa-test@automation.com`)
- Entonces: **idéntico a CP02** — `POST /api/passrecovery` responde 200 con el mismo mensaje genérico, la UI muestra el mismo mensaje de éxito. **Confirmado: el sistema no revela si el email existe o no** (buen patrón de seguridad, evita user enumeration). No es un gap, es comportamiento esperado — se retira la nota `[CONFIRMAR]` anterior.
- Trazabilidad: AC-2 (comportamiento de seguridad confirmado)

**CP04 - Verificar campo email obligatorio** 🐛 HALLAZGO — posible bug
- Dado: usuario con el sub-formulario de reseteo expandido
- Cuando: presiona "Enviar" sin ingresar email
- Entonces (comportamiento REAL observado): `POST /api/passrecovery` responde **400** con body `{"message":"email es requerido"}` (correcto en el backend) — pero el **frontend no muestra ese mensaje**. En su lugar muestra: **"En este momento estamos con problemas técnicos, te pedimos disculpas, si puedes contactanos al 0800-122-6238"** — un mensaje de error genérico de "sistema caído" que es engañoso para un simple campo vacío. No hay validación client-side previa al submit tampoco (el botón no está deshabilitado).
- Trazabilidad: AC-2 (borde) — **candidato a bug report** (UX: mensaje de error incorrecto/engañoso ante un error de validación, no un error de sistema)

**CP05 - Verificar formato de email inválido** 🐛 HALLAZGO — posible bug
- Dado: usuario con el sub-formulario de reseteo expandido
- Cuando: ingresa `"noesunemail"` (sin `@`, formato inválido) y presiona "Enviar"
- Entonces (comportamiento REAL observado): **no hay validación de formato**. `POST /api/passrecovery` responde **200** con el mismo mensaje genérico de éxito, la UI muestra "Te hemos enviado un correo...". Contrasta con `RegistrationPage` donde sí existe validación de formato ("El correo electrónico no es válido", ver `user-management.spec.ts` TC-05). El AC de la HU dice explícitamente "Ingreso de un correo electrónico **válido**" — este campo no lo exige.
- Trazabilidad: AC-2 (borde) — **candidato a bug report** (falta validación de formato de email, inconsistente con el resto del sitio)

## TS-03 Recepción y contenido del email (AC-2, AC-3, AC-4)

**CP06 - Verificar tiempo de envío del correo de recuperación** 🔴 BLOQUEADO
- Dado: se solicitó un reseteo para un email registrado
- Cuando: se espera un tiempo razonable `[CONFIRMAR SLA — la HU no define "razonable" en segundos/minutos]`
- Entonces: el correo llega a la casilla del usuario
- Trazabilidad: AC-2
- Bloqueo: requiere lectura de casilla real (IMAP/API) — IMP-006

**CP07 - Verificar remitente y asunto del correo** 🔴 BLOQUEADO
- Dado: se recibió el correo de recuperación
- Cuando: se inspecciona el mensaje
- Entonces: remitente = `[CONFIRMAR]`, asunto = `[CONFIRMAR]`
- Trazabilidad: AC-3
- Bloqueo: IMP-006

**CP08 - Verificar estructura y contenido del correo** 🔴 BLOQUEADO
- Dado: se recibió el correo de recuperación
- Cuando: se inspecciona el cuerpo del mensaje
- Entonces: el mensaje contiene la estructura esperada (saludo, instrucciones, botón/link de reset, vigencia del link si aplica) `[CONFIRMAR]`
- Trazabilidad: AC-3

**CP09 - Verificar existencia y validez del link de reset dentro del correo** 🔴 BLOQUEADO
- Dado: se recibió el correo de recuperación
- Cuando: se extrae el link de reset del cuerpo del mensaje
- Entonces: el link existe, apunta al dominio esperado y contiene un token `[CONFIRMAR formato del token/param]`
- Trazabilidad: AC-4

## TS-04 Redirección al flujo de reset vía link (AC-5)

**CP10 - Verificar redirección correcta al hacer click en el link del correo** 🔴 BLOQUEADO (requiere obtener el link de CP09)
- Dado: se cuenta con un link de reset válido y vigente
- Cuando: se navega al link
- Entonces: el sistema redirige a la pantalla de cambio de contraseña (no a login ni a error)
- Trazabilidad: AC-5

**CP11 - Verificar comportamiento con link expirado** ✅ (parcial — requiere backend para generar/forzar expiración, o esperar el TTL real)
- Dado: se cuenta con un link de reset vencido `[CONFIRMAR TTL]`
- Cuando: se navega al link
- Entonces: el sistema muestra un mensaje de link expirado/inválido y no permite continuar `[CONFIRMAR texto exacto]`
- Trazabilidad: AC-5 (negativo — no está explícito en la HU, gap de cobertura de seguridad)

**CP12 - Verificar comportamiento con link ya utilizado (reuso)** ✅ (parcial — depende de poder generar 2 solicitudes)
- Dado: un link de reset ya fue usado exitosamente una vez
- Cuando: se navega nuevamente al mismo link
- Entonces: el sistema rechaza el reuso `[CONFIRMAR comportamiento — no está en la HU]`
- Trazabilidad: AC-5 (negativo, gap de seguridad)

## TS-05 Establecer nueva contraseña (AC-6)

**CP13 - Verificar cambio exitoso de contraseña cumpliendo política** ✅ (desde la pantalla de reset, asumiendo llegada por otro medio mientras IMP-006 esté abierto)
- Dado: usuario en la pantalla de cambio de contraseña (post-link)
- Cuando: ingresa una nueva contraseña válida (`getRandomPassword()` o equivalente que cumpla política) y confirma
- Entonces: el sistema acepta el cambio
- Trazabilidad: AC-6

**CP14 - Verificar rechazo de contraseña débil** ✅
- Dado: usuario en la pantalla de cambio de contraseña
- Cuando: ingresa una contraseña débil (`'weak'`, patrón ya usado en TC-02 de registración)
- Entonces: el sistema no permite continuar y muestra "Seguridad: Débil" (mismo patrón verificado en `user-management.spec.ts`) `[CONFIRMAR si aplica igual en este flujo]`
- Trazabilidad: AC-6 (borde)

**CP15 - Verificar campo de nueva contraseña obligatorio** ✅
- Dado: usuario en la pantalla de cambio de contraseña
- Cuando: confirma sin ingresar contraseña
- Entonces: el sistema no permite continuar y muestra mensaje de campo obligatorio `[CONFIRMAR texto exacto]`
- Trazabilidad: AC-6 (borde)

## TS-06 Confirmación e inicio de sesión (AC-7, AC-8)

**CP16 - Verificar confirmación del cambio de contraseña** ✅
- Dado: se completó el cambio de contraseña exitosamente
- Cuando: se observa la respuesta del sistema
- Entonces: se muestra confirmación visual `[CONFIRMAR texto exacto]` y/o respuesta de API exitosa `[CONFIRMAR status]`
- Trazabilidad: AC-7

**CP17 - Verificar login exitoso con la nueva contraseña** ✅
- Dado: la contraseña fue reseteada exitosamente
- Cuando: el usuario inicia sesión en `/auth/login` con el nuevo password
- Entonces: login exitoso (mismo patrón que `TC-03 Email existente - Contraseña correcta` de `user-management.spec.ts`)
- Trazabilidad: AC-8

**CP18 - Verificar que la contraseña anterior deja de ser válida** ✅
- Dado: la contraseña fue reseteada exitosamente
- Cuando: el usuario intenta iniciar sesión con la contraseña vieja
- Entonces: el sistema rechaza el login (mismo patrón que `TC-01 Email existente - Contraseña Incorrecta`)
- Trazabilidad: AC-8 (negativo, gap de cobertura no explícito en HU pero crítico para seguridad)

---

## Resumen de cobertura vs. criterios de aceptación

| AC | Cubierto por | Estado |
|---|---|---|
| AC-1 Acceso a "Olvidé mi contraseña" | CP01 | ✅ Automatizable |
| AC-2 Envío en tiempo razonable | CP02, CP03, CP04, CP05, CP06 | 🟡 Parcial (CP06 bloqueado) |
| AC-3 Recepción correcta del email | CP06, CP07, CP08 | 🔴 Bloqueado — IMP-006 |
| AC-4 Link válido en el contenido | CP09 | 🔴 Bloqueado — IMP-006 |
| AC-5 Redirección al flujo de reset | CP10, CP11, CP12 | 🟡 Parcial (CP10 bloqueado, CP11/CP12 automatizables con datos mockeados/backend) |
| AC-6 Nueva contraseña cumple política | CP13, CP14, CP15 | ✅ Automatizable |
| AC-7 Confirmación del cambio | CP16 | ✅ Automatizable |
| AC-8 Login con nueva contraseña | CP17, CP18 | ✅ Automatizable |
| AC-9 Sin errores funcionales/UI en todo el flujo | Implícito en todos los CP anteriores (asserts de UI en cada paso) | 🟡 Parcial — depende de que el flujo completo esté desbloqueado |

**18 casos diseñados. 4 bloqueados de punta a punta (CP06-CP09) por IMP-006. 2 parcialmente bloqueados (CP10, y AC-2/AC-9 dependen transitivamente).** El resto (12 casos) es automatizable ya, condicionado a: (a) confirmar textos/locators exactos vía MCP contra la UI real, (b) definir cómo llegar al link de reset sin lectura de casilla real mientras IMP-006 sigue abierto (ej. capturar el link vía intercepción de la request de backend en QA, si el equipo de dev puede exponerlo — a confirmar, no asumir).

## Hallazgos de la exploración MCP (2026-08-06) — pendientes de decisión del usuario

No se cargaron a Jira todavía (requiere preview + OK explícito según `jira/update-rules.md`). Ambos observados en `https://vetify-qa.ikeapp.com/auth/login`, endpoint `POST /api/passrecovery`:

1. **CP04 — Mensaje de error engañoso ante campo vacío**: el backend devuelve correctamente 400 `"email es requerido"`, pero el frontend ignora ese mensaje y muestra un texto de "problemas técnicos" (sugiere caída de sistema) en vez de indicar que falta completar el campo.
2. **CP05 — Falta validación de formato de email**: el campo de reseteo acepta cualquier string sin validar formato (`"noesunemail"` → 200 OK, mismo mensaje de éxito), a diferencia del formulario de registración que sí valida formato.

Ninguno de los dos impide el flujo end-to-end (ambos casos igual muestran algún mensaje), pero ambos violan el AC-2 tal como está redactado ("envía... correo electrónico válido" / experiencia sin errores confusos). Reportar como bugs queda a criterio del usuario del proyecto.
