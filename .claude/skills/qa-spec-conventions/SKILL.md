---
name: qa-spec-conventions
description: Convenciones reales de este proyecto para archivos .spec.ts (Playwright + fixtures `container`/`step`/Allure) — estructura TS-XX/TC-XX, bloques Precondiciones/Pasos/Resultado esperado, uso de `step()` + `setAllureDetails()`, pool de usuarios reales vía `UserProvider`, y las reglas de naming de `documentation/development-standars.md`. Invocar al escribir, editar o revisar cualquier `.spec.ts` en `tests/projects/`.
---

# Convenciones de specs (`.spec.ts`) — automation-main

> ⚠️ **Esta skill fue adaptada al patrón REAL de este proyecto** (verificado en `tests/projects/vetify-webapp/credentials.spec.ts` y `tests/framework/*.ts`). Si esta skill contradice el código real o `documentation/development-standars.md`, **gana el código real** — actualizar esta skill, no al revés.

## Diferencia clave con el template genérico

El template QA genérico (de donde viene esta skill) asume: comentarios prohibidos en el cuerpo del test, `@step` decorator en los métodos del POM, y 2 estrategias de auth (`storageState` global / `completeLogin`). **Nada de eso aplica acá.** El patrón real de automation-main es:

- Los tests **sí llevan comentarios** estructurados (`// Precondiciones:`, `// Pasos:`, `// Resultado esperado:`) — son parte del contrato de legibilidad, no una violación.
- No hay decorator `@step` en los POMs. En su lugar, cada paso del test se envuelve con el helper `step()` de `allure-js-commons`.
- La autenticación no es `storageState` global ni `completeLogin` — es un **pool de usuarios reales** servido por `UserProvider.getUser(userRequest)`, con caché de `storageState` por usuario.

## Estructura real de un spec

```typescript
import { environment, SiteId } from '@config/environment';
import { getRandomElement } from '@helpers/automation-utils';
import { expect, Page } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';

test.describe('<Feature> Test Suite', () => {
  // =========================================================================
  // CATEGORY: TS-01 <Nombre de la categoría>
  // =========================================================================
  test.describe('TS-01 <Nombre de la categoría>', () => {
    test.describe(() => {
      test.use({
        userRequest: {
          source: UserSource.Pooled,
          siteId: SiteId.VETIFY_ADQUIRENTE,
          tags: [UserTag.ACTIVE, UserTag.WITH_PET],
          reserve: false,
          ignoreReserved: true,
        },
      });

      test('TC-01 - <Producto> - <escenario en español>', { tag: ['@critical'] }, async ({ container, page }) => {
        // Precondiciones:
        // - <precondición 1>
        // - <precondición 2>
        await setAllureDetails({
          preconditions: ['<precondición 1>', '<precondición 2>'],
          steps: ['<paso 1>', '<paso 2>'],
          expectedResult: ['<resultado esperado 1>'],
        });
        // Pasos:
        await step('1. <acción del paso 1>', async () => {
          await container.vetify.webapp.myPetsPage.load();
        });
        // Resultado esperado:
        await step('<resultado esperado 1>', async () => {
          await expect(page.getByText('<texto exacto>')).toBeVisible();
        });
      });
    });
  });
});
```

## Reglas obligatorias (las que SÍ aplican acá)

1. **Título del suite y de los tests en español, con prefijo `TC-XX`.** Código (imports, nombres de POM, variables) en inglés — ver `documentation/development-standars.md` §6-8. No mezclar: el nombre del test describe el negocio en español; los identificadores de código son en inglés.
2. **`test.use({ userRequest })` en un `test.describe()` anidado y anónimo, justo antes del test.** Nunca hardcodear un usuario/credencial — siempre pedir un usuario del pool vía `UserProvider` (`source: UserSource.Pooled`, `siteId`, `tags`).
3. **Cada test documenta `preconditions`/`steps`/`expectedResult` con `setAllureDetails()`** al inicio del cuerpo, en español, antes de ejecutar cualquier acción. Esto alimenta el reporte Allure — no es opcional.
4. **Cada acción/verificación relevante va envuelta en `step('descripción', async () => {...})`.** No llamar métodos del POM sueltos fuera de un `step()` — el reporte pierde trazabilidad.
5. **Sin URLs hardcodeadas.** Usar `container.<producto>.<app>.<pagina>.load()` (cada `*Page` ya sabe su propia ruta relativa, definida en el constructor de su `BasePage` de producto — ej. `VetifyWebappBasePage`).
6. **Sin selectores inline en el spec.** Todo `page.locator(...)` / `page.getByRole(...)` vive en el POM, cacheado en el constructor. El spec solo llama métodos/propiedades del POM o hace `expect()` sobre un `Locator` expuesto por el POM.
7. **Nada de datos de negocio hardcodeados sueltos** (nombres de mascotas, emails, etc.) — usar `getRandomElement`, `getRandomInt`, `getPetAge` de `@helpers/automation-utils`, o el usuario/pet que trae el `userRequest`.
8. **Tag de criticidad** (`{ tag: ['@critical'] }` u otro) en cada `test(...)` cuando el caso lo amerite, para permitir runs filtrados en CI.

## Antes vs. después

❌ **Mal** — selector inline, sin `step()`, sin `setAllureDetails`, dato hardcodeado:
```typescript
test('TC-09 - Vetify - Login con credenciales inválidas', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('input[name="email"]').fill('test@test.com');
  await page.locator('button[data-cy="submitButton"]').click();
  await expect(page.locator('div[data-cy="messageBox"] p p')).toBeVisible();
});
```

✅ **Bien** — POM + `step()` + `setAllureDetails` + `userRequest`:
```typescript
test.describe(() => {
  test.use({ userRequest: { source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.ACTIVE] } });

  test('TC-09 - Vetify - Login con credenciales inválidas', { tag: ['@critical'] }, async ({ container }) => {
    await setAllureDetails({
      preconditions: ['Usuario existente en el sistema.'],
      steps: ['Intentar iniciar sesión con contraseña incorrecta.'],
      expectedResult: ['Se muestra un mensaje de error y no se autentica.'],
    });
    await step('1. Intentar iniciar sesión con contraseña incorrecta.', async () => {
      await container.vetify.webapp.loginPage.login('usuario@existente.com', 'contraseñaIncorrecta');
    });
    await step('Se muestra un mensaje de error y no se autentica.', async () => {
      await expect(container.vetify.webapp.loginPage.errorMessageLbl).toBeVisible();
    });
  });
});
```

## Autenticación real: pool de usuarios, no storageState global

No hay 2 estrategias tipo A/B de otros proyectos. El patrón único es:

```typescript
await container.vetify.webapp.loginPage.loginWithUserRequest(userRequest);
```

Internamente (`VetifyWebappLoginPage.loginWithUserRequest`, ver `src/pages/vetify/webapp/LoginPage.ts`):
1. Pide un usuario al pool: `UserProvider.getUser(userRequest)`.
2. Si existe `storageState` cacheado para ese usuario (`UserProvider.getUserStorageState`), lo aplica a las cookies del contexto y **evita loguearse de nuevo**.
3. Si no existe, hace `login()` real y guarda el `storageState` resultante con `UserProvider.saveUserStorageState` para la próxima corrida.

**No pedir usuarios "a mano"** (email/password literal) salvo que el propio caso de prueba sea sobre credenciales inválidas (ver ejemplo de arriba, donde el dato es justamente inválido a propósito).

## Naming — remitir siempre a la fuente única

No duplicar acá las reglas de naming de archivos/clases/métodos/variables/constantes — están completas y son la fuente de verdad en [`documentation/development-standars.md`](../../../documentation/development-standars.md). Resumen rápido para no tener que abrirlo cada vez:

- Archivos: kebab-case documentado como estándar, aunque el código legacy existente usa PascalCase (`LoginPage.ts`) — para archivos **nuevos**, seguir kebab-case (`login-page.ts`) salvo que el archivo viva junto a hermanos PascalCase ya establecidos en esa carpeta (extender-nunca-romper el patrón local del directorio).
- Clases/tipos: PascalCase.
- Métodos/variables: camelCase, nombres de negocio (`customerId`, no `x`).
- Tests: presente descriptivo del comportamiento (`should create a customer successfully`) para specs 100% en inglés; en este proyecto los títulos de negocio van en español con prefijo `TC-XX` (patrón real observado) — si hay ambigüedad sobre cuál aplica en una carpeta nueva, preguntar al usuario antes de asumir.
- Constantes: `UPPER_SNAKE_CASE`.
- Locators: nombrados por el elemento de UI (`submitButton`, `errorMessageLbl`), nunca `btn`/`elm`/`locator`.

## Por qué estas reglas

- **Trazabilidad en Allure**: `setAllureDetails` + `step()` son lo que hace que el reporte (consumido por el equipo y por CI) muestre precondiciones/pasos/resultado esperado de forma legible sin abrir el código.
- **Pool de usuarios real**: evita colisiones entre corridas paralelas y specs que dependen de un usuario fijo que otro test modificó.
- **POM como única fuente de selectores**: si la UI cambia, se corrige en un solo lugar.
