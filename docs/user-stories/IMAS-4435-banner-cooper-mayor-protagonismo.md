# IMAS-4435 — Implementación de Banner Cooper con mayor protagonismo en la experiencia Vetify

**Tipo:** Historia
**Estado (Jira, verificado 2026-08-31):** In Validation
**Assignee:** Alan David Gonzalez Guzman
**URL:** https://ikeasistencia-arg.atlassian.net/browse/IMAS-4435

Seguimiento directo de [`IMAS-4356`](IMAS-4356-banner-cooper-webapp-osde.md): esa Tarea excluyó explícitamente a Vetify B2C ("para los clientes b2c Vetify no tiene que verse nada de cooper... lo estamos construyendo en otra card"). Esta es esa otra card — extiende Cooper a B2C y agrega una sección nueva "Beneficios" en el menú.

## Descripción real (`customfield_11549` — campo distinto al de las Tareas, ver [[feedback-jira-tarea-customfield-description]])

> **Objetivo**: Diseñar, desarrollar y validar la incorporación de un banner de Cooper dentro de la experiencia digital de Vetify, otorgándole una mayor visibilidad y protagonismo que el banner actualmente destinado a Vetify+. La iniciativa busca facilitar la visibilidad de la propuesta de Cooper para los clientes de Vetify y favorecer el acceso a la promoción/beneficio mediante la redirección correspondiente.
>
> **Alcance** (de punta a punta): (1) Diseño UX/UI — nueva ubicación/jerarquía visual, mayor protagonismo que Vetify+, responsive; (2) Desarrollo — lógica de visualización, redirección al hacer clic; (3) Pruebas QA — funcionales, visualización en dispositivos/resoluciones, redirección, regresión sobre otros banners/componentes.

## Criterios de aceptación (pegados por Alan, 2026-08-31 — nunca antes leídos completos)

1. El banner de Cooper se encuentra disponible para los clientes de Vetify definidos dentro del alcance.
2. El diseño del banner de Cooper cuenta con mayor protagonismo visual y jerarquía que el banner de Vetify+.
3. La propuesta visual fue diseñada y validada previamente por los stakeholders correspondientes.
4. El banner respeta la identidad visual y los lineamientos de UX/UI de Vetify.
5. El diseño es responsive y se visualiza correctamente en los dispositivos contemplados.
6. Al hacer clic sobre el banner de Cooper, el usuario es redireccionado correctamente a la URL definida.
7. La implementación no afecta el funcionamiento ni la visualización de los demás banners existentes.
8. Se realizaron pruebas funcionales y de regresión sobre la implementación.
9. Los desvíos identificados durante las pruebas fueron corregidos antes del cierre de la tarea.
10. La funcionalidad cuenta con validación final de Negocio/Producto antes de su pase a producción.

## Subtareas (5) — estado real verificado 2026-08-31

| Key | Título | Estado |
|---|---|---|
| IMAS-4449 | Arquitectura de la nueva sección Beneficios en el menú | Hecho |
| IMAS-4448 | Diseño de la nueva sección Beneficios (mobile y desktop) | Hecho |
| IMAS-4436 | Desarrollo | Hecho |
| IMAS-4437 | Pruebas QA | Backlog |
| IMAS-4438 | Deploy Prod | Backlog |

## Comentarios reales

1. **Hernán Casabella (26/08)**: diseño terminado, Figma adjunto (link: https://www.figma.com/design/YfysBYoQZB2Y0J0pLf3nMb/Dev---Vetify---Iniciativas-y-solicitudes, sugiere mejorar colores para la webapp).
2. **Liliana Picinotti (26/08)**: aclara que ese Figma es para los clientes de Vetify que no son OSDE, relacionado al banner Cooper.

## Verificación QA (2026-08-31)

Confirmado en vivo contra `vetify-qa.ikeapp.com` que la arquitectura + desarrollo (IMAS-4449/4448/4436) ya están deployados en QA: existe una sección nueva "Beneficios" en el menú lateral, y el banner de Cooper se muestra también para Vetify B2C (además de OSDE).

Cruce contra los 10 AC — ver `.tests.md` para el detalle caso por caso. Resumen: los AC verificables por QA (1, 5, 6, 7, 9) están cubiertos con evidencia real, incluido Desktop y Mobile. Los AC de diseño/proceso (2, 3, 4, 8, 10) no son verificables por automatización — dependen de sign-off de diseño/negocio, ya reflejado en el estado Hecho de `IMAS-4448`/`IMAS-4449`.

**Único gap real, deliberado**: el menú de OSDE Adquirente no tiene una aserción fija, porque su comportamiento depende del `policyId` (producto real) de la cuenta, no del segmento — ver `docs/conocimiento-sistema.md` y [[project-imas4356-banner-cooper-osde]] para el detalle completo de este hallazgo (que resuelve, en retrospectiva, buena parte de la confusión de `IMAS-4356`).

**Falta para cerrar**: `IMAS-4437` (Pruebas QA) — casos posteados 2026-08-31 — y `IMAS-4438` (Deploy Prod), fuera del alcance de QA.
