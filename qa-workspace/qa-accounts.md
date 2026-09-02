# Catálogo de Cuentas de Prueba QA — Vetify

> **Última actualización**: 2026-09-01
> **Fuente**: `src/fixtures/users/pooled-users.json` + `documentation/Pruebas OSDE.xlsx`
> **Alcance**: cuentas reales para uso en pruebas manuales y automatizadas. Las cuentas sintéticas (`@automation.com`) no reciben emails reales y sirven solo para flujos que no requieren bandeja de correo.

---

## Backoffice Reintegros

| Email | Password | URL |
|---|---|---|
| `acastellano@ikeasistencia.com.ar` | `Veti123*` | https://reintegros-backoffice.ike.qa/ |

**Notas**: Usuario con acceso Calidad y Finanzas. Usar para verificar reintegros en cola de backoffice.

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
| `patriciacarpinacci@gmail.com` | `Dalmatas101` | 98765499 | Cruella Devil | Mascota Manchitas (dálmata). **Usada para CP02 de IMAS-4092. ⚠️ BUG-027: GET /api/bff/reintegros/mascotas devuelve []** |
| `susanacarpinacci@gmail.com` | `Durmiente01` | 98765488 | Male Fica | |

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

| Bug | Descripción | Cuentas afectadas |
|---|---|---|
| BUG-027 / IMAS-4531 | `GET /api/bff/reintegros/mascotas` devuelve `[]` aunque la mascota existe | Cruella Devil (`patriciacarpinacci@gmail.com`) y todas las cuentas Capitado testeadas |
| BUG-007 / IMAS-4279 | DNI de 10 dígitos (con prefijo país) rechazado en registro | Cualquier cuenta nueva que intente registrarse con DNI largo |
| IMAS-3970 | Generación de cupones para Capitado es manual | Todas las cuentas Capitado nuevas (no se pueden crear por API sin cupón) |

---

## Agregar cuentas nuevas

Ver `scripts/qa/create-test-account.mjs` para crear cuentas Adquirente por API:

```bash
node scripts/qa/create-test-account.mjs --site VETIFY_ADQUIRENTE --plans 1 --add-pet
node scripts/qa/create-test-account.mjs --site FLUX_CAPITADO --plans 1
```

Para Capitado OSDE es necesario un cupón real (vía el flujo de canje de OSDE), no automatizable actualmente.
