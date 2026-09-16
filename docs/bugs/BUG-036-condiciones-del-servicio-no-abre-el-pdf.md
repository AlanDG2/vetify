**ESTADO: RETRACTADO 2026-09-10 — NO ERA UN BUG, ERA UN FALSO POSITIVO DEL TEST.** Ver sección al final del documento para el detalle completo. Se llegó a crear brevemente en Jira (IMAS-4659) y se canceló el mismo día tras la reconfirmación en vivo.

Jira: IMAS-4659, creado 2026-09-10 y cancelado el mismo día (falso positivo, ver retractación al final).

[Título]: DEFECT | El botón "Condiciones del Servicio" no abre el documento del plan

[Severidad]: Alto — el cliente no puede consultar ni descargar las condiciones de su plan pese a que el documento existe y está disponible; afecta la transparencia contractual.

[Categoría]: Flujo

[HU relacionada]: N/A — encontrado en una corrida de regresión de `tests/projects/vetify-webapp/plans.spec.ts`, no está ligado a una historia puntual.

[Información del entorno]:
- Ambiente: QA — `https://vetify-qa.ikeapp.com`
- Fecha de detección: 2026-09-07
- Cuenta usada: pooled Vetify Adquirente, plan "VETIFY 100 EMERGENCIA x1" (grupo 0158, código de producto 2249)

[Descripción]:
En la sección "Planes y coberturas", al expandir un plan y presionar el botón "Condiciones del Servicio", se espera que se abra una pestaña nueva con el documento (PDF) de las condiciones de ese plan. En cambio, se abre una pestaña en blanco que nunca llega a mostrar nada — ni el documento, ni un mensaje de error, ni la pantalla de "ups, algo salió mal". El documento en sí existe y funciona perfectamente si se lo abre por su cuenta (probado directo, se descarga sin problema) — el problema es que el botón de la webapp nunca lleva ahí.

[Pasos para reproducir]:
1. Ir a `https://vetify-qa.ikeapp.com` e iniciar sesión con una cuenta que tenga un plan Vetify vigente.
2. Ir a la sección "Planes y coberturas".
3. Expandir el plan (tocar el nombre del plan para desplegarlo).
4. Presionar el botón "Condiciones del Servicio".
5. Mirar qué aparece en la pestaña nueva.

[Resultado esperado]:
Se abre una pestaña nueva mostrando el PDF real de las condiciones del plan, listo para leer o descargar.

[Resultado actual]:
Se abre una pestaña nueva que se queda completamente en blanco — nunca navega a ningún lado, ni siquiera muestra un error visible. Reproducido de forma consistente (3 de 3 intentos).

[Detalle técnico] (para el equipo de desarrollo):
- El botón "Condiciones del Servicio" es un `<button>` plano (no un `<a href="...">`), por lo que la navegación depende enteramente de JS (probablemente un `window.open(url)`).
- La pestaña nueva que se abre nunca dispara ningún evento `framenavigated` — su `.url()` queda fijo en el string literal `":"` (dos puntos solos, ni siquiera `about:blank`).
- La consola del navegador muestra `net::ERR_FAILED` al momento del click.
- El PDF de destino esperado (siguiendo el patrón `{grupo}-{código}.pdf` confirmado en `BUG-028`) sería `0158-2249.pdf` — confirmado por fuera de la webapp que existe y responde `HTTP 200`, `Content-Type: application/pdf`, 855KB, en `https://www.atencionike.com.ar/pdf/condicionados/0158-2249.pdf`. El documento está bien publicado; el problema es 100% del lado del click/JS de la webapp, no del CDN.
- **Distinto de BUG-028**: BUG-028 son PDFs de planes OSDE Adquirente que directamente no están publicados en el CDN (401/301 a una landing). Acá el PDF SÍ existe y responde 200 — el fallo es que la webapp nunca intenta navegar ahí. Grupo/producto además distinto (0158/2249, Vetify no-OSDE — el propio BUG-028 aclara que este grupo no está en su alcance).
- Reproducido con Chromium (Playwright, Desktop) en 3 corridas independientes, siempre el mismo síntoma exacto (`:` como URL final).

[Tabla CP de evidencia]:

| Spec | Caso | Cuenta | Síntoma observado |
| --- | --- | --- | --- |
| `plans.spec.ts:26` | TC-01 Consultar el condicionado | pooled VETIFY_ADQUIRENTE, plan VETIFY 100 EMERGENCIA x1 | La pestaña nueva nunca navega a `atencionike.com.ar` (timeout de 30s, URL final `:`) |
| `plans.spec.ts:55` | TC-02 Descargar el condicionado | misma cuenta | Mismo síntoma |

[Notas adicionales]:
- No se probó todavía con otros grupos/productos Vetify (solo grupo 0158) — no se puede confirmar si afecta a todos los planes Vetify no-OSDE o solo a este.
- `tests/projects/vetify-webapp/plans.spec.ts` (TS-01, TC-01/TC-02) ya tenía este comportamiento anticipado en comentarios propios del test ("el visor embebido de Chromium cuelga toda la maquinaria de detección de navegación") — pero el síntoma real confirmado hoy (URL fija en `:`, `net::ERR_FAILED`) es más específico que una simple lentitud del visor de PDF: es una navegación que nunca ocurre.
- Recomendación: antes de subir a Jira, sería bueno confirmar con el equipo de dev si esto es una regresión reciente o si el CP nunca pasó desde que se escribió (el comentario del test sugiere que el autor original ya sospechaba inestabilidad acá).

---

## RETRACTACIÓN 2026-09-10 — no era un bug, era un falso positivo del test

**Qué pasó**: este bug se subió a Jira (IMAS-4659, work item de impedimentos IMAS-4658) usando como única evidencia la corrida automatizada de arriba (2026-09-07). El usuario del proyecto probó manualmente el mismo link del PDF y reportó que le abría perfecto — y al insistir en que el botón real de la webapp también le funcionaba perfecto, se hizo la reconfirmación en vivo que faltaba antes de cargar el bug.

**Reconfirmación en vivo (misma cuenta, mismo plan, grupo 0158/producto 2249)**:
1. Se retesteó primero el spec automatizado sin cambios: **2/2 falló**, mismo síntoma exacto (`newPage.url()` fijo en `:`).
2. Se probó el botón real vía MCP (equivalente a un click humano, no el test compilado): la pestaña nueva **navegó de inmediato y correctamente** a `https://www.atencionike.com.ar/pdf/condicionados/0158-2249.pdf` — `200 OK`, confirmado con `browser_tabs` y la request de red real. Cero problema.

**Causa raíz real, confirmada**: el visor de PDF embebido de Chromium no dispara los eventos de carga/navegación (`load`, `framenavigated`) que Playwright usa para actualizar el getter `Page.url()` de la pestaña nueva — el propio autor original del test ya sospechaba esto en su comentario, pero se interpretó como "lentitud" en vez de "el getter nunca se actualiza, sin importar cuánto se espere". El botón y la navegación funcionan bien de punta a punta; lo que fallaba era el mecanismo de verificación del test (leer `newPage.url()`), no el producto.

**Fix aplicado** (`tests/projects/vetify-webapp/plans.spec.ts`, TC-01 y TC-02): en vez de esperar/leer `newPage.url()`, se escucha el evento `response` a nivel del contexto del browser (`page.context().waitForEvent('response', ...)`) filtrando por la URL del PDF — confiable independientemente de cómo Chromium renderice la pestaña nueva. **2/2 passed, 14.3s**, tras el fix.

**Acción en Jira**: IMAS-4659 comentado y cancelado por el usuario del proyecto (no es un Defect de producto). Se sacó del vínculo con IMAS-4658 (work item de impedimentos).

**Lección para no repetir**: antes de cargar un bug a Jira basado en una corrida automatizada, reproducir también a mano (o vía MCP) el mismo flujo — sobre todo cuando el propio test ya tiene un comentario previo sospechando de su propia máquina de detección, como era el caso acá.
