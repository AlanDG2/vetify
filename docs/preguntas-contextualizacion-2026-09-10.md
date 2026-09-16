# Preguntas de contextualización listas para enviar — 2026-09-10

> **Qué es esto y en qué se diferencia de `docs/pedidos-para-enviar-2026-09-10.md`**: ese otro doc son pedidos técnicos (algo está roto, hay que arreglarlo o restaurarlo). Este doc son preguntas de **contexto/negocio/proceso** — el sistema ya hace exactamente lo que hace hoy, confirmado en vivo por nosotros; lo único que falta es que alguien que conoce el negocio o el proceso real responda una pregunta puntual. No hay código que QA pueda escribir para resolver esto solo.
>
> **Formato, pensado para copiar y pegar directo en un chat**: cada pregunta tiene Contexto (qué es esto, para alguien que nunca escuchó hablar del tema) → Qué ya investigamos (para que quede claro que no es un "¿probaron esto?") → la Pregunta exacta, tal cual se puede copiar → A quién → Qué cambia según la respuesta. La idea es que la persona la lea una sola vez y conteste directo, sin tener que preguntarnos nada de vuelta.
>
> **Excluida a propósito**: la pregunta sobre "proceso de autoservicio para plan Inactivo/Dado de baja" (relacionada a IMP-015) NO está acá porque **ya se hizo y ya se respondió** — se escaló a Oscar Tello el 2026-08-31 y la respuesta fue "no es posible por ahora". No tiene sentido volver a preguntarla; QA ya resolvió el caso de prueba por otra vía (mock de red). Ver `docs/impedimentos-bloqueos.md` (IMP-015) para el historial completo.
>
> Fuente completa de cada una: `docs/impedimentos-bloqueos.md`, sección "Preguntas pendientes de contextualización".

---

## 1. Cómo dar de alta un usuario de prueba en el sistema de identidad de Iké — IMP-005

**Para**: equipo/responsable del sistema de identidad de Iké (Auth0 `ike-webapp-staging.us.auth0.com`)
**Asunto sugerido**: Para terminar de probar el control de acceso Vetify/Iké (IMAS-3742), necesito saber cómo dar de alta un usuario en el sistema de identidad de Iké
**Tests bloqueados**: 5 (TC-02 a TC-06 de `access-control.spec.ts`, IMAS-3742)

**Contexto**: IMAS-3742 pide validar que el control de acceso a la WebApp de Iké funcione bien según qué plan tenga cada cliente (4 combinaciones posibles: solo Vetify, solo Iké, ambos, ninguno). Para probar las 4 combinaciones hacen falta usuarios de prueba reales en cada una — pero el sistema de identidad de Iké es un tenant de Auth0 totalmente separado del de Vetify (`ike-webapp-staging.us.auth0.com`), y no conozco ningún autoservicio para crear cuentas ahí.

**Qué ya investigué y descarté**: probé loguear con una cuenta real del pool de Vetify (que sí tiene plan exclusivo de Vetify) directamente en el login de Iké — fue rechazada con "La contraseña y/o correo electrónico no es válido." Confirmé por red que el error real de Auth0 dice literalmente "esta cuenta no existe en mi base" (`invalid_grant`) — es decir, ni siquiera llegó a evaluar el control de acceso por plan, porque la cuenta nunca tuvo alta en el sistema de identidad de Iké. Probé también con un email inventado que no existe en ningún lado: da exactamente el mismo error, así que no es un problema puntual de esa cuenta. También intenté la vía de autoprovisión (comprar un plan de Iké directamente) — la página de compra está caída ahora mismo.

**Mi pregunta exacta**: ¿cómo se da de alta un usuario en el sistema de identidad de Iké? Específicamente:
- ¿Qué panel o herramienta se usa?
- ¿Qué datos hace falta cargar?
- ¿Quién tiene permiso para hacerlo (para saber a quién recurrir la próxima vez)?

**Con qué me alcanzaría para destrabar todo ahora mismo**: 2 cuentas concretas — una con **solo** plan de Iké, y otra con **ambos** planes (Vetify + Iké). Con esas 2, quedan los 5 casos de prueba restantes de IMAS-3742 completamente automatizados.

**Actualización 2026-09-13**: tocado de pasada en llamada con Oscar Tello — reconoció que es "de Iké como tal, no de Vetify" (sistema distinto). Alan aclaró que no necesita solo una cuenta puntual, sino entender el proceso real de alta para no repetir el mismo bloqueo cada vez. La llamada se cortó antes de una respuesta concreta — sigue sin resolver.

---

## 2. Simular una videollamada real y confirmar el envío de notificaciones — IMP-018

**Para**: equipo dev de Videollamada / Turnos
**Asunto sugerido**: Necesito saber qué proveedor de videollamada usamos y si tiene sandbox, para poder automatizar la sala de espera y la confirmación de notificaciones
**Tests bloqueados**: 4 criterios de aceptación de IMAS-3894 (CA06, CA07, CA08, CA09) que nunca se llegaron a automatizar — 0 tests escritos hoy (se sacaron del código el 2026-09-08 por no ser viables sin esta info)

**Contexto**: cuando un cliente agenda una videollamada, hay 2 partes que hoy no puedo probar de forma automática: (1) que al entrar a la sala de espera, un profesional se conecte del otro lado y la consulta arranque de verdad; y (2) que al agendar/cancelar/reprogramar, le llegue realmente un email o notificación push al cliente.

**Por qué no lo puedo resolver solo**: para la parte 1, necesitaría poder simular a un "profesional" conectándose del otro lado — pero no sé qué tecnología de videollamada usa el producto por detrás, así que ni siquiera puedo evaluar si existe una forma de simular esto. Para la parte 2 (si el canal es push), no tengo forma de confirmar que la notificación se mandó de verdad, más allá de lo que muestra la pantalla del cliente.

**Mi pregunta exacta**:
1. ¿Qué proveedor de videollamada usa el producto (Twilio Video, Agora, Daily.co, o algún SDK propio)?
2. Ese proveedor, ¿ofrece algún modo de prueba (sandbox) con un participante automático (bot) que se conecte solo del otro lado? Si sí, ¿cómo consigo acceso/credenciales?
3. Para las notificaciones push en particular: ¿existe algún registro del lado del backend (un endpoint, un log, una tabla) que confirme que el envío se disparó, aunque no llegue físicamente al celular?

**Nota aparte**: si el canal de notificación es email (no push), no hace falta nada nuevo de tu lado — ya tengo infraestructura propia para leer emails reales (la construí para el flujo de reseteo de contraseña) y la puedo reusar acá directamente.

**Qué cambia según tu respuesta**: si hay sandbox/bot y una forma de verificar notificaciones, esto se puede automatizar. Si no existe nada de eso, queda documentado como definitivamente fuera de alcance (mismo criterio que ya se aplicó a otra parte de este mismo flujo, que se confirmó a mano pero no es viable automatizar sin volver el test lento).

**Actualización 2026-09-13 — respondido parcialmente por Oscar Tello**: confirmado que "videollamadas no tiene un sandbox." Alternativa propuesta: generar un "prestador" (veterinaria) de prueba y simular la llamada desde el lado cliente. Pero el módulo de Prestadores "es un mundo huérfano, nadie tiene contexto" (ni Oscar) — lo armó Alexis originalmente. Van a coordinar con ella para ver si se puede generar un prestador de prueba. Sigue sin resolver, sin fecha confirmada.

---

## 3. ¿Existe la encuesta "CE" que asume nuestro roadmap? — IMP-022

**Para**: Producto / Marketing (quien administra el panel de Hotjar)
**Asunto sugerido**: ¿Existe una encuesta configurada para aparecer justo después de cargar una credencial?
**Tests bloqueados**: 0 escritos (nunca hubo un caso real de esto — es 1 fila del roadmap, QA-AUTO-043, que asumía una funcionalidad que no encontré)

**Contexto**: QA mantiene una lista interna propia de funcionalidades de la app que todavía nos falta cubrir con pruebas automáticas — es un checklist nuestro, no un documento de Producto. Uno de esos ítems (llamado "Encuesta CE post carga") asume que, justo después de que un cliente termina de cargar la credencial de su mascota, aparece alguna encuesta de satisfacción. Necesitamos confirmar si eso existe de verdad para poder escribir la prueba, o si hay que sacarlo de nuestra lista porque no existe tal encuesta.

**Qué ya investigué**: revisé el código completo de la webapp (los 19 bundles de JavaScript que carga) buscando cualquier cosa relacionada a encuestas. Lo único que encontré es la librería de Hotjar (herramienta externa de analítica/encuestas de terceros) — pero la única llamada propia de la app a Hotjar en el código es para identificar al usuario para analytics, sin ningún disparador propio atado a "terminó de cargar la credencial". Si existe una encuesta así, tendría que estar configurada 100% del lado de Hotjar (por ejemplo, targeting por URL o por tiempo en la página), invisible para mí mirando el código.

**Mi pregunta exacta**:
1. ¿Existe realmente una encuesta en el panel de Hotjar configurada para dispararse al completar la credencial?
2. Si existe, ¿con qué condición se dispara (URL específica, tiempo en la página, algún evento)?

**Qué cambia según tu respuesta**: si existe, no es algo que pueda verificar de forma confiable con mi herramienta de automatización (Playwright) — quedaría para verificación manual o directamente desde el propio panel de Hotjar. Si no existe, lo saco de nuestra lista directamente, porque no hay nada que automatizar.

---

## 4. 3 funcionalidades de nuestro roadmap que no encontré en la app real — IMP-024

**Para**: Producto
**Asunto sugerido**: 3 ítems de mi roadmap de automatización no coinciden con lo que existe hoy en la app — necesito que me digan si están planeados o si hay que sacarlos
**Tests bloqueados**: 3 filas de `Casos de Prueba.xlsx` (Perfil "Cambio o selección de mascota activa"; Funcionalidades Pendientes "Detalle de una veterinaria" y "Atención de Red") + 3 filas del roadmap (QA-AUTO-037/056/058) — ningún caso escrito todavía, dependen de esta respuesta

**Contexto**: QA mantiene una lista interna propia de funcionalidades de la app que todavía nos falta cubrir con pruebas automáticas (un checklist nuestro, no un documento de Producto). 3 ítems de esa lista describen algo que, al explorar la app real a fondo para poder escribir la prueba, no encontramos que exista tal como está descripto:

1. **"Cambio/selección de mascota"**: esa lista asume que existe un selector para elegir "cuál es la mascota activa" durante toda la sesión. En la práctica, no existe tal concepto — cada pantalla (Mascotas, Credenciales) simplemente lista todas las mascotas del cliente como tarjetas individuales. El único lugar donde SÍ hay que elegir para qué mascota es algo, es específicamente dentro del flujo de Videollamada — y eso ya está cubierto por sus propios casos de prueba.
2. **"Detalle de veterinaria"**: esa lista asume que existe una pantalla con la ficha de un prestador veterinario específico (dirección, teléfono, horarios), a la que se llega haciendo click en un resultado de búsqueda. En la práctica, "Buscar veterinaria" hoy es solo un mapa de Google Maps centrado en una dirección — no hay lista de veterinarias reales cercanas, ni ficha de detalle de ningún prestador.
3. **"Atención de Red"**: revisé los 15 ítems reales del menú lateral de la app, uno por uno, y ninguno se llama "Atención de Red" ni parece corresponder a algo distinto de lo que ya está cubierto bajo otros nombres (Emergencias, Asistencia presencial, Asistencia a domicilio, Historial de Atención, Veterinarias).

**Mi pregunta exacta, una por una**:
1. ¿Está planeado construir un selector de mascota activa fuera del flujo de Videollamada?
2. ¿Está planeada una pantalla de detalle de veterinaria con información real de prestadores?
3. "Atención de Red" — ¿es una funcionalidad propia que todavía no se construyó, o esa lista se refería en realidad a alguno de los ítems que ya mencioné arriba (Emergencias/Asistencia/Historial)?

**Qué cambia según tu respuesta**: con cualquiera de las 2 respuestas posibles para cada ítem (se va a construir, o se saca de nuestra lista porque ya está cubierto/no aplica), esos 3 ítems dejan de quedar indefinidos para siempre sin ningún motivo real detrás.

---

## 5. ¿Existe un mecanismo para cambiar el DNI de una cuenta, más allá del 0800? — IMP-026 — ✅ RESUELTO 2026-09-13, no hace falta enviar

**Para**: equipo que atiende el 0800 de soporte (122 1183)
**Asunto sugerido**: Necesito saber si el cambio de DNI de una cuenta se hace con algún panel interno, o es 100% manual
**Tests bloqueados**: 2 (Perfil, "Nueva compra con el DNI viejo" / "Nueva compra con el DNI nuevo")

**Contexto**: tengo 2 casos de prueba de Perfil que necesitan una cuenta cuyo DNI ya haya sido cambiado (para probar qué pasa si se intenta comprar de nuevo con el DNI viejo, y qué pasa si se compra con el DNI nuevo). Confirmé en vivo que la app en sí NO tiene ningún campo para editar el DNI — la única opción real que ofrece la pantalla de "Editar datos" en Perfil es Teléfono y Dirección. El único camino real que conozco es llamar al 0800 para que un agente de soporte lo cambie del otro lado.

**Mi pregunta exacta**: cuando un agente de soporte cambia el DNI de una cuenta por teléfono, ¿lo hace a través de algún panel o sistema interno? Si existe, me gustaría pedir acceso (de solo consulta/edición puntual, lo que corresponda) para poder generar esta condición de prueba yo mismo cuando la necesite. Si NO existe ningún panel y es 100% manual, también me sirve saberlo.

**Qué cambia según tu respuesta**: si hay un panel, pido acceso y genero esa condición cuando la necesite (mismo patrón ya resuelto antes para casos parecidos). Si no hay nada, esos 2 casos de prueba quedan permanentemente imposibles de automatizar — no por falta de esfuerzo, sino porque no existe ningún camino repetible para llegar a esa condición, y así lo voy a documentar.

**RESUELTO 2026-09-13 — respondido por Oscar Tello en llamada**: confirmado que no existe ninguna API ni panel para cambiar el DNI desde Vetify — todo vive en SISE, sin opción de modificación desde la webapp. *"El DNI no es uno de los datos que nosotros permitimos modificar."* Los 2 casos de prueba quedan permanentemente no-automatizables. **No hace falta enviar esta pregunta, ya está contestada.**

---

## 6. Dónde se configura si un plan tiene o no el PDF de condicionado cargado — IMP-020

**Para**: equipo de backend/catálogo
**Asunto sugerido**: ¿Dónde o cómo se configura si un producto/plan tiene o no cargado el PDF de condicionado? Necesito poder generar esa condición de datos yo mismo
**Tests bloqueados**: 1 (`plans.spec.ts` TC-03 "Plan sin condicionado disponible") — está escrito, pero depende de un mock temporal mientras no tenga esta respuesta

**Contexto**: uno de los estados que necesito poder probar es "el plan no tiene cargado el PDF de condicionado" (el documento que explica qué cubre el seguro, visible en "Planes y coberturas"). Revisé las 5 cuentas con sesión cacheada que tengo disponibles y ninguna está en ese estado.

**Qué hice mientras tanto**: como no depende de nadie más para poder probar el comportamiento de la pantalla, intercepté la respuesta real del endpoint que trae los datos del plan y forcé el campo correspondiente a vacío, para poder escribir el test sin esperar esta respuesta.

**Mi pregunta exacta**: ¿dónde o cómo se configura, del lado del negocio, si un producto/plan tiene o no cargado ese PDF? ¿Existe un panel de administración del catálogo de productos, o se carga por otro medio que no conozco?

**Qué cambia con tu respuesta**: con eso, puedo generar esta condición de datos real cuando la necesite (para este caso, y para cualquier otro futuro que dependa de lo mismo), en vez de depender siempre de un mock técnico como parche.

**Actualización 2026-09-13 — mecanismo explicado, acceso operativo pendiente**: Oscar Tello explicó que el PDF es estático, se pre-genera con los datos cargados en SISE en el momento en que se arma — no hay ninguna API para esto. Lo que en realidad hace falta (aclarado con Oscar) es el mapeo plan→link de PDF, no que esté actualizado. Oscar lo va a ver con "Juanchi o Pau" la semana del 2026-09-14 para identificar todos los PDFs disponibles. Sin resolución todavía.

---

## 7. Canal real para pedir builds Debug de la app mobile Android — IMP-009

**Para**: equipo dev mobile (Android) — mismo contacto que dio el build actual
**Asunto sugerido**: ¿Cuál es el canal para pedir un build Debug del apk cada vez que la app se actualice?
**Tests bloqueados**: toda verificación mobile que dependa específicamente de un celular físico real (no emulador) — hoy conseguí un build Debug una sola vez, como pedido puntual

**Contexto**: para poder automatizar contra un celular físico real (no el emulador), hace falta un build especial de la app llamado "Debug" — el build normal (release) no permite inspeccionar lo que pasa adentro del WebView en un dispositivo real. Ya conseguí uno, una sola vez, pidiéndolo puntualmente. Confirmé que con ese build, el mismo mecanismo que ya funciona en el emulador funciona también en celular físico.

**Mi pregunta exacta**: cada vez que la app se actualice, ¿cuál es el canal real para pedir un build Debug nuevo? ¿Hay algún proceso automático (un job de CI que yo mismo pueda disparar) que lo genere, o siempre va a ser un pedido manual a una persona?

**Qué cambia con tu respuesta**: si hay un canal reproducible, puedo pedirlo yo mismo cada vez que lo necesite. Si no, cada actualización de la app va a requerir volver a pedir este mismo favor de nuevo, a la misma persona.

**Actualización 2026-09-13**: Oscar Tello no supo decir quién puede resolver esto directamente. Quedó agendada una reunión el **lunes 2026-09-14 a las 14hs** para tratar esto (junto con el tema de iOS) — el objetivo es que orienten con quién seguir la conversación, no resolverlo en esa reunión.

---

## 8. Proceso real para conseguir cupones de alta Capitado cuando se agote el lote actual — IMP-001 (para más adelante, no urgente todavía)

**Para**: el mismo contacto que dio los 20 tokens originales (2026-09-03)
**Asunto sugerido**: Cuando se agote el lote de cupones de alta Capitado, ¿cuál es el proceso real para conseguir uno nuevo?
**Tests bloqueados**: ninguno todavía — hoy quedan 7 tokens OSDE + 8 Flux sin usar (confirmado en vivo). Esta pregunta se activa recién cuando se agoten.

**Contexto**: para dar de alta una cuenta nueva en los productos Capitado (OSDE/Flux), hace falta un código de "cupón" de un lote que me dieron una sola vez (20 códigos, el 2026-09-03). Ya usé varios en distintas sesiones de automatización; el día que se terminen, no voy a poder seguir probando altas nuevas de esos productos hasta conseguir más.

**Mi pregunta exacta, para cuando llegue el momento**: ¿cuál es el proceso real para conseguir/generar un cupón nuevo? ¿Hay un panel, un endpoint interno que yo pueda usar, o hay que pedirte un lote nuevo cada vez?

**Qué cambia con tu respuesta**: si hay un mecanismo propio (panel o endpoint), se puede automatizar la generación on-demand — que es lo que se había pedido originalmente en IMAS-3970. Si no lo hay, al menos queda documentado el proceso real, para no tener que volver a averiguarlo de cero la próxima vez que se corte el lote.

**Nota**: no hace falta mandar esto todavía — quedó acá listo para el día que los tokens se agoten, así no hay que redactarlo de nuevo con apuro.

**Actualización 2026-09-13**: Alan ya planteó esto en llamada con Oscar Tello, aclarando el pedido real (aprender el flujo, no que le den cupones sueltos). Confirmado que los 20 tokens originales los dio Alexis. Oscar va a coordinar con ella para explicar el flujo real. Sin fecha confirmada, pero ya en curso.
