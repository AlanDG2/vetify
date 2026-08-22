# Contexto del proyecto

> Qué es el producto, sus módulos, sus actores, sus reglas macro. Lo que un QA nuevo necesita para ubicarse.

`automation-main` automatiza la QA E2E de varios productos/sitios agrupados bajo `tests/projects/`:

- **Vetify** — plataforma de gestión veterinaria/mascotas.
  - `vetify-b2c` — sitio de cara al dueño de mascota (adquirente).
  - `vetify-webapp` — panel interno (login, credenciales, gestión de mascotas — `myPetsPage`, etc.).
  - Institucional (`src/pages/vetify/institutional/`).
- **OSDE** — dos frentes: `osde-adquirente` y `osde-capitado`.
- **Flux** — `flux-capitado`.

Cada producto/sitio tiene su propio `SiteId` (`src/config/sites.ts`) y su propia jerarquía de POMs bajo `src/pages/<producto>/<app>/`. Los fixtures de Playwright exponen todo a través de un objeto `container` inyectado (DI), agrupado por producto/app (`container.vetify.webapp.loginPage`, `container.osdeAdquiriente.landingPage`, etc.), definido en `tests/framework/base-test.ts` + variantes por producto (`vetify-base-test.ts`, `osde-base-test.ts`).

**Actores de test**: no hay un único "admin QA" fijo. Los tests piden usuarios de un **pool real** (`UserProvider`, `src/providers/user/`) filtrados por `siteId` + `tags` (ej. `UserTag.ACTIVE`, `UserTag.WITH_PET`), con caché de sesión (`storageState`) por usuario para evitar logins repetidos.

**Reporte**: Allure es la fuente de verdad para precondiciones/pasos/resultado esperado de cada test (`setAllureDetails()` + `step()`), no comentarios sueltos en el código (aunque el código SÍ mantiene comentarios `// Precondiciones:` / `// Pasos:` / `// Resultado esperado:` como estructura legible).

**Gestión de tickets**: Jira (proyecto real, sin Xray/Zephyr) — el adaptador `adapters/jira/` envuelve `scripts/jira/jira-client.mjs` (ya funcional de una sesión previa: fetch de historias, creación de subtareas tipo Bug, comentarios, chequeo de links de bugs abiertos).

**Cadencia y KPIs de producto** (del squad "Betify"/Mascotas, no de QA — contexto de negocio para priorizar): sprints de 2 semanas, review con demo en QA seguida de pase a Producción. KPIs medidos por feature (CES, escala 1-7, objetivo mínimo 6): Compra 6,5 (jul-2026), Videollamadas 4 (veniendo de meses "con mucho ruido"), Credenciales "muy buen número", Reintegros sin métrica todavía (recién en migración/implementación). NPS a nivel compañía: 75 (jul-2026). CSAT: 100% (base 33 encuestas). Toda mejora/queja que entra por encuesta se convierte automáticamente en tarjeta de sprint (backlog o en curso, según si es incidente). Fuente: review de sprint 2026-08-21 (`transcripciones/MASCOTAS - Review-20260821_100549-Grabación de la reunión.vtt`).

## Quiénes somos — organigrama del squad (fuente: onboarding oficial "Onboarding_Vetify_Puki_.docx.pdf")

| Persona | Rol |
|---|---|
| Luciana Godoy | Scrum Master |
| Liliana Picinotti | Product Owner |
| Juan Cruz Triventi | Developer |
| **Oscar Tello** | **Technical Owner** (no es "solo" un dev — explica por qué se le reasignan tickets como responsable técnico) |
| Mariana Navarro | Developer |
| Cyntia Ferrari | Analista CX (Customer Experience) |
| Paula Scalzo | Developer (aunque en demos suele operar como Calidad/QA manual) |
| Belen Gonzalez | Content Designer |
| **Alan David Guzman** | **QA** (yo / el usuario del proyecto) |
| Hernan Casabella | Product Designer |
| Mariana Minutella | Business Owner |
| Gadia Trenes | Business Expert |

**Referentes adicionales** (a quién recurrir por tema):
- **Alexis Castellano** — Consultor técnico Vetify (es "Alex"/`acastellano@ikeasistencia.com.ar`, la cuenta QA que usamos para Reintegros y Prestadores — no es solo una cuenta de test, es una persona real del equipo).
- Laura De Carli — Base de Datos · Andres Vergani — IT · Gerardo Sireix — Infra · Lucía Cabaña — CDS (Centro de Servicios) · Agustín Calcagno — Marketing · Jonathan Peña — Salesforce · Milagros Sce — Campañas · Fatima Fernandez — Finanzas · **Ariamis Cadenas — Calidad** (la fuente de la factura de prueba mencionada en la review de Reintegros) · **Melisa Lorea — Prestadores** ("Meli", confirmó que el rediseño de videollamada no requiere aviso a prestadores) · Leandro Segovia — Capital Humano · Damián Franco — Core.

## Convenciones reales de Jira del equipo (no son las genéricas del template QA)

**Flujo de estados** (5, no confundir con los que asume el template genérico):
`Tareas por hacer` → `En progreso` → `En validación` (dev ya mandó a QA) → `Pending Validation` (etapa previa a Producción, el cambio está por deployarse) → `Hecho` (llegó a Producción **y** cumple la Definición de Hecho — las dos condiciones a la vez).

Esto confirma un patrón que veníamos observando empíricamente: varios tickets quedan "atascados" en `Pending Validation` con la subtarea "Deploy a Prod" en Backlog — es exactamente lo que este estado significa (ya validado, esperando el deploy), no un error ni un ticket mal cerrado.

**Tipos de tarjeta** (4):
- **Historia de usuario**: aporta valor directo al usuario.
- **Bug**: error detectado internamente por el equipo.
- **Incidente productivo**: problema detectado o **reportado por un cliente** en Producción (distinto de un Bug interno).
- **Tarea**: trabajo que no encaja en las categorías anteriores.

**Acuerdos del equipo sobre Jira**: linkear cada tarjeta con su épica · no subir trabajo a un sprint sin consultar antes con la PO (Liliana) · crear las subtareas necesarias. Una buena tarjeta incluye: Objetivo, Descripción, Criterios de aceptación, DoD, Evidencias con imágenes, links a Figma, subtareas/dependencias.

**Ceremonias**: Daily (sync breve) · Refinamiento (preparar trabajo futuro) · Planning (definir objetivo/alcance del sprint) · Review (demo del incremento — es la reunión que ya analizamos, `transcripciones/MASCOTAS - Review-*.vtt`) · Retrospectiva.

**Deploys**: el equipo sigue un acuerdo documentado en SharePoint, "GitFlow de la Plataforma Webapp.docx" (no tenemos acceso directo desde este repo, solo la referencia).

## Arquitectura real — repos y apps (fuente: mismo onboarding)

| Componente | Repo / referencia |
|---|---|
| E-commerce / landing institucional | `ike-asistencia/ike-bapi-vetify` · `ike-asistencia/ike-platform-vetify-institucional` |
| Webapp frontend (Vetify WebApp) | `webapp-ike/ike-webapp` (Bitbucket) |
| Webview / app mobile del tutor | `grupo-flux/webapp/ike-webapp-mobile` (GitLab — nota: bajo el grupo "flux", no "ike-arg") |
| Backend / microservicios core | `webapp-ike/services-service` · `webapp-ike/brands-service` · `webapp-ike/users-service` · `webapp-ike/ike-service` (Bitbucket) |
| Pet Services (mascotas/prestaciones/credenciales) | `grupo-ike-arg/webapp-mascotas/backend` (GitLab) |
| **App Prestadores** (app mobile nativa del veterinario/prestador — Expo) | `grupo-ike-arg/webapp-mascotas/app-mobile` — build vía Expo, APK en Google Play "Vetify Prestadores" |
| **Webapp Prestadores** (web — la que ya probamos para IMAS-3728, `qa.prestadores.ike.ar`) | `grupo-ike-arg/webapp-mascotas/webapp-proveedores-mascotas` (front) + `backend-prestadores` |
| Reintegros | `grupo-ike-arg/webapp-mascotas/reintegros-terraform` · `.../reintegros-backoffice` · `.../reintegros-backend` |

**Importante — no confundir App Prestadores con Webapp Prestadores**: son dos apps distintas. La **App** (mobile, Expo) es la que recibe la notificación de un turno de videollamada agendado. La **Webapp** (`qa.prestadores.ike.ar`) es la que usamos para validar el token de atención presencial (`IMAS-3728`).

## Viaje del usuario (fuente: podcast de onboarding, `transcripciones/ElevenLabs Podcast Vetify.vtt`)

Recorre el mismo journey que el onboarding PDF pero agrega detalle funcional útil para diseño de casos:

**4 canales de alta** (no solo "compra web"):
1. **E-commerce** — landing pública, compra directa.
2. **Agente IA** — vía automatizada/bot que asiste la contratación.
3. **CDS** — alta asistida por operador de atención telefónica.
4. **Capitado OSDE** — el usuario NO compra: el beneficio ya viene integrado por el acuerdo con la prepaga OSDE, se activa desde una landing especial de activación. "Capitado" = jerga del sector: el usuario adquiere el servicio por medio de otra prestación que ya tiene (OSDE, un banco, etc.), no por compra directa — modelo corporativo con beneficio integrado.

Tras el alta (cualquier canal): mail de confirmación de compra → invita a activar cuenta en la webapp → **primer paso obligatorio: cargar la credencial de la mascota** (nombre, raza, edad, etc.) antes de poder operar cualquier otra funcionalidad.

**Arquitectura confirmada** (coincide con la tabla de repos de arriba): webapp tutor (frontend propio) + webview embebido en la app mobile → backend/microservicios → servicio central **PetServices** (gestiona la lógica técnica de servicios de mascotas, incluida la credencial).

**Flujo videollamada** — 100% autogestionado: Ana agenda desde la webapp → confirmación a Ana + alerta a la vet en su **app prestadores** (mobile) → recordatorios a ambos lados → videollamada integrada → encuesta automática post-consulta.

**Flujo presencial — dato clave para cobertura de tests**: el agendamiento presencial **NO es autogestionado hoy** desde la webapp del tutor. Ana tiene que llamar al CDS para coordinar el turno en una veterinaria de la red — está en el roadmap para cambiar esto a futuro, pero hoy CDS es parte obligatoria del circuito. Implica que no existe (ni debería buscarse) un flujo E2E automatizable de "agendar turno presencial" en la webapp — es un límite de producto, no un bug ni un gap de automatización.

Al llegar físicamente a la veterinaria: la validación de cobertura usa un **token temporal alfanumérico de corta duración**, generado en la webapp del tutor y validado por el prestador en la **webapp prestadores** (la de `qa.prestadores.ike.ar`, distinta de la app mobile de videollamadas). Tras validar, atienden sin cobrar la consulta de cobertura y el prestador sube la factura al sistema para que IKE le pague.

**Circuito de reintegros** — 3 pasos, dos backoffices distintos:
1. Ana paga de su bolsillo en cualquier centro calificado → sube factura/documentación desde la webapp.
2. La solicitud viaja al **back office de Calidad**, que valida contra los límites del plan y aprueba/rechaza.
3. Si Calidad aprueba, pasa automáticamente al **back office de Finanzas**, que procesa el pago (transferencia bancaria).

Ana puede seguir el estado del trámite en todo momento desde su webapp. (Nota: Reintegros todavía no tiene métrica CES — está recién en migración/implementación, según `project-context.md` arriba.)
