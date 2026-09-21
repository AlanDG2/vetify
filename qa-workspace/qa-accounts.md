# Catálogo de Cuentas de Prueba QA — Vetify

> **Última actualización**: 2026-09-06
> **Fuentes** (3 orígenes distintos, no mezclar):
> 1. `src/fixtures/users/pooled-users.json` + `documentation/Pruebas OSDE.xlsx` — pool histórico, ya existía antes de esta sesión.
> 2. `src/fixtures/users/fresh-users.json` — cuentas creadas por automatización (`UserFactory.generateTestUsers`) durante esta sesión, vía los tokens `TESTOSDE*`/`TESTFLUX*`.
> 3. Cuentas creadas **manualmente** por Alan directo en la web (formulario "Activá su plan") — **no están guardadas en ningún archivo del repo**, quedan documentadas solo acá.
> **Alcance**: cuentas reales para uso en pruebas manuales y automatizadas. Las cuentas sintéticas (`@automation.com`) no reciben emails reales y sirven solo para flujos que no requieren bandeja de correo.

---

## Backoffice Reintegros

| Email | Password | URL |
|---|---|---|
| `acastellano@ikeasistencia.com.ar` | `Veti123*` | https://reintegros-backoffice.ike.qa/ |

**Notas**: Usuario con acceso Calidad y Finanzas. Usar para verificar reintegros en cola de backoffice. Requiere VPN.

---

## Webapp — Iké (IKE_WEBAPP)

| Email | Password | Notas |
|---|---|---|
| `iketest@mail.com` | `Hola123#` | Dadas por Alan 2026-09-21. No confirmado todavía: DNI, plan/producto asociado, ni si están activadas — verificar en vivo antes de asumir estado. |
| `iketest3@mail.com` | `Hola123#` | Dadas por Alan 2026-09-21. Mismas salvedades que la de arriba. |

**Notas**: primeras cuentas registradas para este site — todavía no hay ninguna en `pooled-users.json` bajo `IKE_WEBAPP`. Si se confirma su estado (DNI, plan, tags) y se decide usarlas en la automatización, agregarlas también ahí siguiendo el mismo formato que las demás cuentas del pool.

---

## Cuentas creadas en la sesión 2026-09-04/06 (Fuente 2: `fresh-users.json` + Fuente 3: manuales)

| Email | Password | DNI | Segmento | Origen | Notas |
|---|---|---|---|---|---|
| `user_1788489677971_7593bc58@automation.com` | `Te1!a57dff05` | 1640770265 | OSDE_CAPITADO | `fresh-users.json`, token `TESTOSDE008842` | Mascota "TestCapitadoQA" agregada, credencial completa, `estado: OCUPADO` |
| `user_1788496974155_e81bb579@automation.com` | `Te1!e172f758` | 1713745663 | OSDE_CAPITADO | `fresh-users.json`, token `TESTOSDE868253` (corregido — la selección del pool es aleatoria, no secuencial) | Reprodujo el mismo `502 PLANS_UNAVAILABLE` que la anterior (confirma que es sistemático), luego se resolvió solo |
| `user_1788530353237_fb803d1d@automation.com` | `Te1!0687a996` | 147532164 | FLUX_CAPITADO | `fresh-users.json`, token consumido de la lista Flux | Mascota "TestFluxQA" agregada, credencial completa, `estado: OCUPADO` |
| `test.capitado.osde.qa@automation.com` | `Vetify15!` | — | OSDE_CAPITADO | **Manual** (Alan, formulario "Activá su plan") | **No está en ningún archivo del repo** — mascota "Shila" agregada por Alan, confirmó resolver bien |

**Tokens de alta restantes** (verificado en vivo en `src/fixtures/cupons/one-time-cupons.json`): **8 TESTOSDE** (`TESTOSDE920428, 485742, 840557, 325330, 117009, 576262, 731971, 776021`) y **9 TESTFLUX** (`TESTFLUX300926, 626415, 929671, 729103, 672194, 627310, 394678, 877223, 323075`) sin usar. Consumidos hasta ahora: `TESTOSDE008842`, `TESTOSDE868253`, `TESTFLUX256675`.

**Corrección importante a la sección de abajo**: la nota "IMAS-3970: generación de cupones Capitado es manual, no automatizable" (al final de este doc) **ya no es cierta** — se implementó `CuponFactory.generateRegistrationCupon()` esta sesión, consumiendo estos tokens reales del pool. Ver sección "Agregar cuentas nuevas" actualizada al final.

---

## Webapp — Vetify Adquirente (VETIFY_ADQUIRENTE)

**Total en pool: 40 cuentas (24 reales)**

### Cuentas principales (prioridad de uso)

| Email | Password | DNI | Nombre | Notas |
|---|---|---|---|---|
| `mariano.caresia@hotmail.com` | `Agrabah1` | 77654321 | Jazmin Aladdin | Con mascota |
| `caresia.mariano@saint-gobain.com` | `Eltiti01` | 44789456 | Poca Hontas | Con mascota |
| `acastellano@ikeasistencia.com.ar` | `Veti123*` | — | Alan Castellano | Mismo email que backoffice |
| `ayeperez@ikeasistencia.com.ar` | `Guatemala02!` | 5578955 | Thanos HDP | B2C |
| `cyntiaamaribel@hotmail.com` | `Vetify123!` | — | Cyntia | B2C |
| `alan.gonzalez@ingenia.la` | `Hola123#` | 16525485 | — | Vetify B2C. Usada constantemente en esta sesión para verificar el outage transversal — a veces se degrada a `[]` en mascotas, reintentar si falla |

### Cuentas del Excel Pruebas OSDE.xlsx (QA)

| Email | Password | DNI | Nombre | Notas |
|---|---|---|---|---|
| `68.sandra@gmail.com` | `Bajoelmar01` | 88765432 | Ariel Sirenita | Mascota Sebastian |
| `mrossi@ikeasistencia.com.ar` | `Scaloni26` | 99099099 | Selección Argentina | DNI 8 dígitos |
| `prueba321@hotmail.com` | `Escaloni12!` | 88899955 | Esca Loni | |
| `lilipicinotti@gmail.com` | `Vetify15%` | 30123456 | Marge Simpson | Cuenta de Liliana Picinotti (PO). Múltiples mascotas (Marge, Maggie, Selma, Patty, Ned) |
| `lpicinotti@ikeasistencia.com.ar` | `Vetify15%` | 80123456 | Seymour Skinner | Cuenta corporativa Iké |
| `cristiancastro@gmail.com` | `Vetify15%` | 78123456 | Cristian Castro | |
| `cieloestrellado@gmail.com` | `Vetify15%` | 50785421 | Cielo Estrellado | |
| `martin.anchordoqui@gmail.com` | `Indioeterno26` | 12345678 | Capitán América | Plan Cachorros, 2 planes |
| `delfina.galeano@hotmail.com` | `Probando123!` | 99998888 | Thor | 2 planes |
| `adquirenteosde@gmail.com` | `Vetify15%` | 45285456 | Liliana Adquirente Osde | |
| `prueba@gmail.com` | `Vetify15%` | 40123678 | Liliana Prueba Adquiriente | Mascota El Michi |
| `pruebasb2c@gmail.com` | `Vetify15%` | 21456789 | Liliana Prueba B2C | Mascota Snoopy |
| `julietatestpoggio@gmail.com` | `Vetify15%` | 42321654 | Jesica Poggio | Plan Emergencia |
| `aline.brunet@hotmail.fr` | `Vetify15%` | 96490191 | Aline Brunet | B2C, mascota Popi |
| `jimedelcanto@live.com.ar` | **pendiente** | 35066783 | Spider Man | Password no disponible en el Excel |

### Cuentas PROD (usar solo si la prueba requiere ambiente productivo)

| Email | Password | DNI | Notas |
|---|---|---|---|
| `ignacio@buda.tv` | `Atun1806` | 35992280 | Plan Emergencia PROD |
| `pruebasadquirentes@gmail.com` | `Vetify15%` | 42521456 | PROD |

---

## Webapp — OSDE Capitado (OSDE_CAPITADO)

**Total en pool: 17 cuentas (14 reales)**

### Cuentas principales

| Email | Password | DNI | Nombre | Notas |
|---|---|---|---|---|
| `patriciacarpinacci@gmail.com` | `Dalmatas101` | 98765499 | Cruella Devil | Mascota real "Kira". ✅ **Resuelto 2026-09-05**: llegó a estar días con `mascotaId: null` (IMAS-4578), ahora resuelve bien — confirmado con un reintegro real completo |
| `user_1783951005615@automation.com` (Popi) | `Te1!0685f68b` | 12540524 | Popi / "Shila" | Mascota real "Shila". ✅ **Reconfirmado sano 2026-09-11**: `GET /reintegros/mascotas` devuelve `200` con datos reales completos (`mascotaId`, nombre, raza, foto) — ya no `null`/vacío. **Historial de la cuenta, no confiar ciegamente todavía**: resolvió 2026-09-05 → recurrió 2026-09-08 → resuelto de nuevo 2026-09-11. Ya recurrió una vez después de darse por resuelta, así que antes de usarla como precondición de un caso nuevo, reverificar en vivo el mismo día. |
| `susanacarpinacci@gmail.com` | `Durmiente01` | 98765488 | Male Fica | |
| `multipet.qa.1789770402655@automation.com` | `Vetify15!` | 89631449 | Test AUTOMATION | **Creada y validada 2026-09-18 (IMAS-4546, caso especial 02 multi-mascota)**: 2 registros reales vía `/api/registro` con el mismo DNI/email, 2 tokens TESTOSDE distintos (`TESTOSDE776021`, `TESTOSDE840557`). Confirmado por API: 2 credenciales OSDE Esencial bajo el mismo tutor. **2 mascotas cargadas**: Rocky (Mestizo, macho, 3 años, plan OSDE Esencial, 1 videollamada agendada 21/09/2026 10:00h → cupo 1 de 2) y Luna (Siamés, hembra, 2 años, plan OSDE Esencial, cupo intacto 2 de 2). Cuenta reutilizable para más pruebas de IMAS-4546 o cualquier caso que necesite 2 mascotas con plan limitado. Quedó 1 solo token TESTOSDE sin usar en todo el pool tras esto. |

### Cuentas del Excel Pruebas OSDE.xlsx (QA)

| Email | Password | DNI | Nombre | Notas |
|---|---|---|---|---|
| `alazo@ikeasistencia.com.ar` | `Gotica01` | 89765489 | Elgua Son | Plan Esencial |
| `cx@ikeasistencia.com.ar` | `Elmatedegerardo!` | 35066784 | Dragon Ball | |
| `carlabagnati@yahoo.com.ar` | `Bugsbunny1` | 99999990 | Bugs Bunny | |
| `picssaras@gmail.com` | `Otromas123!` | 17525143 | Daenerys Targaryen | Mascota Scooby Doo |
| `cferrari908@gmail.com` | `Antoteamo26` | 22333777 | Lionel Messi | |
| `acastellano@ikeasistencia.com.ar` | `Veti123*` | — | Alan Castellano | Mismo email que backoffice/webapp. Capitado también. DNI no provisto en Excel |
| `juanamolina@gmail.com` | `Vetify15%` | 7856231 | Juana Molina | |
| `marcelotesttinelli@gmail.com` | `Vetify15%` | 17456789 | Marcelo Test | PRUEBA1 |
| `mirthalegrand@gmail.com` | `Vetify15%` | 1456789 | Mirtha Legrand | DNI 7 dígitos |
| `mauroicardi@gmail.com` | `Vetify15%` | 52356789 | Mauro Icardi | Plan Esencial OSDE |
| `pruebacapitadoosde@gmail.com` | `Vetify15%` | 13123456 | Liliana Prueba Capitado OSDE | Mascota Otis |

### Cuentas PROD

| Email | Password | DNI | Notas |
|---|---|---|---|
| `ayelenlaso@hotmail.com` | `Amargo01` | 87777878 | PROD |

---

## Webapp — Flux Capitado (FLUX_CAPITADO)

**Total en pool: 11 cuentas (10 reales)**

### Todas del Excel Pruebas OSDE.xlsx (QA)

| Email | Password | DNI | Nombre | Notas |
|---|---|---|---|---|
| `lucianayelengodoy@gmail.com` | `Minnieteamo04` | 99888778 | Mickey Mouse | |
| `lgodoy@ikeasistencia.com.ar` | `Vilma26!` | — | Pedro Picapiedra | DNI no provisto |
| `manuelbelgrano@gmail.com` | `Vetify15` | 30458789 | Manuel Belgrano | Mascota Banderín, plan Esencial |
| `corneliosaavedra@gmail.com` | `Vetify 15` | 45123456 | Cornelio Saavedra | ⚠️ Password tiene espacio al final. Mascota Escarapela |
| `mafalda@gmail.com` | `Vetify15%` | 78123963 | Mafalda Perez | Mascota Boby |
| `gale38sofia@gmail.com` | `Renatateamo!` | 44285735 | Mujer Maravilla | Mascota Garfield |
| `jesicacirio@gmail.com` | `Vetify15%` | 56126458 | Jesica Cirio | PRUEBA2 |
| `wandanara@gmail.com` | `Vetify15%` | 40325126 | Wanda Nara | Plan Esencial Flux |
| `pruebacapitadoflux@gmail.com` | `Vetify15%` | 28123456 | Liliana Prueba Capitado Flux | Mascota Droppy |

---

## Webapp — OSDE Adquirente (OSDE_ADQUIRENTE)

**Total: 3 cuentas sintéticas** (`@automation.com`). No hay cuentas reales en este site en el pool.

---

## Reglas de uso

1. **Las cuentas reales reciben emails reales** — usar para flujos que requieren bandeja de correo (reset password, confirmación de cuenta, etc.)
2. **Las cuentas @automation.com NO reciben emails** — usar solo para flujos automatizados que no necesitan correo
3. **No compartir passwords en canales públicos** — este documento es interno del equipo QA
4. **Cuentas PROD**: usar solo cuando la prueba requiera ambiente productivo; verificar que la prueba no afecte datos reales de clientes
5. **No hacer cambios en cuentas ajenas** — si una prueba modifica el estado de una cuenta (credenciales, mascotas, planes), crear una cuenta propia o usar una cuenta marcada como "de prueba" específicamente para eso
6. **Si una cuenta deja de funcionar**: reportar en `docs/impedimentos-bloqueos.md` con la etiqueta IMP-XXX y marcar la cuenta como `RESERVED` en `pooled-users.json`

---

## Bugs conocidos relacionados con cuentas

| Bug | Descripción | Estado |
|---|---|---|
| BUG-027 / IMAS-4578 / IMAS-4531 | `GET /api/bff/reintegros/mascotas` devuelve `[]`/identidad `null` para cuentas Capitado migradas | ⚠️ **RECURRIÓ 2026-09-08 en Popi** tras haberse dado por resuelto el 2026-09-05 — patriciacarpinacci sigue bien. Recompletar la mascota NO lo arregla. Ver `qa-workspace/decision-log.md` 2026-09-08 |
| BUG-007 / IMAS-4279 | DNI de 10 dígitos (con prefijo país) rechazado en registro | Sigue activo |
| ~~IMAS-3970~~ | Generación de cupones para Capitado era manual | ✅ **RESUELTO 2026-09-04** — ver sección de abajo |
| IMAS-4583 | Alta OSDE Capitado nueva daba `502 PLANS_UNAVAILABLE` | ✅ Se resuelve solo (demora de propagación, más larga en OSDE que en Flux) |

---

## Agregar cuentas nuevas

### Adquirente / Flux (sin cupón)

```bash
node scripts/qa/create-test-account.mjs --site VETIFY_ADQUIRENTE --plans 1 --add-pet
node scripts/qa/create-test-account.mjs --site FLUX_CAPITADO --plans 1
```

### Capitado OSDE / Flux (con cupón) — **actualizado 2026-09-04**

Ya NO hace falta hacerlo a mano. `CuponFactory.generateRegistrationCupon()` (`src/providers/cupon/cupon-factory.ts`) consume un token real del pool sembrado en `src/fixtures/cupons/one-time-cupons.json`:

```ts
import { UserFactory } from '@providers/user/user-factory';
import { SiteId } from '@config/environment';

await UserFactory.generateTestUsers([
  { siteId: SiteId.OSDE_CAPITADO, registration: true },
]);
```

Esto hace el alta real (`POST /api/registro`) y deja la cuenta en `fresh-users.json`. Después hace falta completar el registro en la webapp (`register()` + `validatePolicy()`, o a mano: login → `/validation/policy`) y, si se necesita mascota real, el flujo "Completar credencial" desde Inicio.

**Quedan tokens limitados** — cada uno es de un solo uso. Antes de gastar uno, contar cuántos quedan en `one-time-cupons.json`.
