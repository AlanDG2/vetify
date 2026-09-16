[Título]: BUG | El registro rechaza casi todos los caracteres válidos de un email (incluido el "+")

[Severidad]: Medio — un usuario real cuyo email use alguno de estos caracteres (el "+" es el más común, mucha gente lo usa a propósito para organizar su casilla) no podría crear su cuenta, aunque su email sea perfectamente válido. No le pasa a la mayoría de los usuarios, pero a los que sí les pasa, quedan totalmente bloqueados sin ninguna forma de evitarlo.

[Categoría]: Validación

[HU relacionada]: IMAS-3215 — encontrado durante esa investigación (reseteo de contraseña), pero es un bug del formulario de registro en sí, no específico de esa historia.

[Información del entorno]:
- Ambiente: QA (https://vetify-qa.ikeapp.com/auth/sign-up)
- Fecha de detección: 2026-09-01
- Cómo se encontró: al intentar crear una cuenta de prueba usando un alias de Gmail (`usuario+prueba@gmail.com`)

[Descripción]: Cuando alguien se quiere registrar en el sitio y su email tiene ciertos símbolos especiales, el sistema le dice que el correo no es válido y no lo deja crear la cuenta — aunque esos formatos de email son perfectamente válidos y los acepta cualquier proveedor de correo real (Gmail, Outlook, Yahoo, etc.). El caso más importante en la práctica es el símbolo **"+"**: mucha gente lo usa a propósito en su email real (por ejemplo "juan+trabajo@gmail.com", para organizar su casilla o filtrar correo), así que alguien con ese tipo de dirección no podría registrarse nunca en el sitio, sin ninguna forma de evitarlo. Al revisar el resto de los símbolos que también son válidos según el estándar real de emails, se encontró que el sitio rechaza prácticamente todos — de 20 símbolos probados, **19 fueron rechazados** y solo 1 (el punto) funcionó.

[Pasos para reproducir]:
1. Entrar a la página de registro ("Crear cuenta").
2. Escribir un email con un "+" en el medio, por ejemplo: prueba+test@gmail.com
3. Escribir cualquier contraseña válida.
4. Apretar "Crear cuenta".

[Resultado esperado]: El sistema debería aceptar el email y crear la cuenta con normalidad, ya que ese formato de email es válido.

[Resultado actual]: El sistema marca el campo de email como inválido con el mensaje "El correo electrónico no es válido" y no permite continuar. Lo mismo pasa con casi cualquier otro símbolo especial válido, no solo el "+" (ver tabla completa en Detalle técnico).

[Notas adicionales]: Encontrado el 2026-09-01 mientras se evaluaba una forma de crear cuentas de prueba con casillas de correo real usando alias de Gmail (`usuario+algo@dominio.com`, una función estándar de Gmail/Google Workspace) — no se pudo usar ese método justamente por este bug (se optó por cuentas Gmail separadas en su lugar, ver IMAS-3480/IMAS-3476). El campo de "¿Olvidaste tu contraseña?" (login) sí deja tipear estos símbolos sin marcarlos inválidos al perder foco, pero no se confirmó si también los rechazaría al enviar — el bug confirmado y reproducido es específicamente en el formulario de registro (`/auth/sign-up`).

[Detalle técnico] (para el equipo de desarrollo)

**Fuentes verídicas (con link, para verificar directamente):**
- **[RFC 5322](https://www.rfc-editor.org/rfc/rfc5322) — Internet Message Format**, el estándar IETF que define el formato de una dirección de email. La [sección 3.2.3](https://www.rfc-editor.org/rfc/rfc5322#section-3.2.3) define "atext": la parte del email antes de la `@` puede incluir, además de letras y números y sin necesidad de comillas, estos caracteres:
  `! # $ % & ' * + - / = ? ^ _ \` { | } ~` y el punto (`.`) como separador (no al inicio/final ni consecutivo).
- **[WHATWG HTML Living Standard — "Valid e-mail address"](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)**, el estándar que implementan los navegadores para `<input type="email">`. Define exactamente la misma lista de caracteres, con esta expresión regular de referencia:
  `/^[a-zA-Z0-9.!#$%&'*+\/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/`
- El **"+"** en particular es ampliamente usado en la práctica real (Gmail, Outlook, Yahoo, iCloud y Google Workspace lo soportan como "sub-addressing"/alias — es una función documentada, no un caso exótico) — **es el caso que más nos importa a nosotros como equipo de QA**, porque bloquea la técnica de crear cuentas de prueba con alias de un mismo email real.

**Resultado probado en vivo (2026-09-01, Playwright MCP) — los 20 caracteres válidos según RFC 5322, uno por uno, contra `/auth/sign-up`:**

| Carácter | Nombre | ¿Aceptado? |
| --- | --- | --- |
| `+` | signo más | ❌ Rechazado |
| `!` | signo de exclamación | ❌ Rechazado |
| `#` | numeral | ❌ Rechazado |
| `$` | signo pesos/dólar | ❌ Rechazado |
| `%` | porcentaje | ❌ Rechazado |
| `&` | ampersand | ❌ Rechazado |
| `'` | apóstrofe | ❌ Rechazado |
| `*` | asterisco | ❌ Rechazado |
| `-` | guion | ❌ Rechazado |
| `/` | barra | ❌ Rechazado |
| `=` | igual | ❌ Rechazado |
| `?` | signo de pregunta | ❌ Rechazado |
| `^` | acento circunflejo | ❌ Rechazado |
| `_` | guion bajo | ❌ Rechazado |
| `` ` `` | acento grave | ❌ Rechazado |
| `{` | llave de apertura | ❌ Rechazado |
| `|` | barra vertical | ❌ Rechazado |
| `}` | llave de cierre | ❌ Rechazado |
| `~` | virgulilla | ❌ Rechazado |
| `.` | punto | ✅ Aceptado (único que funciona) |

- Reproducido en vivo: al escribir un email con cualquiera de los 19 símbolos marcados como rechazados y presionar "Crear cuenta", el campo se marca inválido con "El correo electrónico no es válido" sin que se dispare ningún request de red — es una validación 100% del lado del cliente, previa al backend. Con el punto, en cambio, el registro se completa con normalidad (redirige a "Verificá si tenés cobertura").
- Recomendación: ampliar el validador de email del formulario de registro para aceptar los caracteres listados arriba, idealmente alineándolo con la regex estándar de WHATWG citada arriba. Priorizar como mínimo el "+", por ser el más común en la práctica real.
- Ver `qa-workspace/decision-log.md`, entrada 2026-09-01 ("Alan resuelve el bloqueo de raíz..."), para el contexto completo de cómo se encontró.
