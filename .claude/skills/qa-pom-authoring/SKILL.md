---
name: qa-pom-authoring
description: Cómo crear o extender un Page Object Model (POM) en automation-main — regla "extender nunca romper", jerarquía real BasePage → <Producto><App>BasePage → <Pantalla>Page, workflow MCP→snapshot→locators, checklist de autoría (locators cacheados, sin decorator @step, registro en el fixture `container`) y scoping de `.first()`/`.last()`. Invocar al crear o modificar cualquier archivo bajo `src/pages/`.
---

# Autoría de POMs (Page Object Models) — automation-main

> ⚠️ **Esta skill fue adaptada al patrón REAL de este proyecto** (verificado en `src/pages/BasePage.ts`, `src/pages/vetify/webapp/LoginPage.ts`, `tests/framework/vetify-base-test.ts`). No usa el decorator `@step` de otros proyectos QA — los pasos se marcan en el spec con el helper `step()` de `allure-js-commons` (ver skill `qa-spec-conventions`), no en el POM. Si esta skill contradice el código real, gana el código real.

## Jerarquía real de clases (no un solo `*Page.ts` plano)

```
BasePage (src/pages/BasePage.ts)
  → abstract class con `page` protegido y goto(path = '/')
  ↓ extendida por
<Producto><App>BasePage (ej. VetifyWebappBasePage en src/pages/vetify/webapp/BasePage.ts)
  → agrega el path relativo fijo de la sección + helpers comunes (load(), waitForPageLoaded())
  ↓ extendida por
<Producto><App><Pantalla>Page (ej. VetifyWebappLoginPage, VetifyWebappMyPetsPage, ...)
  → una clase por pantalla/flujo, locators cacheados en el constructor, métodos de acción
```

Carpetas reales por producto: `src/pages/vetify/{institutional,webapp}/`, `src/pages/osde/...`. **No** existe un patrón de 4 archivos (spec/page/locator/data) como en otros proyectos QA — acá es un único archivo `.ts` por pantalla con locators + métodos juntos.

> 🔗 Para decidir **si** explorar con MCP o leer el POM existente, ver skill [`qa-mcp-vs-pom`](../qa-mcp-vs-pom/SKILL.md). Esta skill cubre el **cómo** construir/extender.

---

## 1. Regla fundamental: Extender, nunca romper

Antes de modificar cualquier POM o spec existente:

1. **LEER** el archivo completo (Read tool) para entender qué ya existe
2. **IDENTIFICAR** métodos y locators ya existentes — **no duplicarlos**
3. **AGREGAR** solo lo que no existe — nunca reescribir código que funciona
4. **REUTILIZAR** locators existentes si sirven para el nuevo caso de uso
5. **COMPONER** — si un método cubre parcialmente la necesidad, crear uno nuevo que lo llame

### Ejemplos concretos (patrón real, sin decorator `@step`):

#### ✅ Ejemplo 1: Extender un POM de listado

**Contexto**: Necesitás agregar validación de paginación, pero `MyPetsPage` ya tiene filtros y búsqueda.

```typescript
// ❌ MAL: Duplicar locator que ya existe
private readonly petCards: Locator; // Ya existe en el constructor

// ✅ BIEN: Agregar solo lo nuevo, cacheado en el constructor
private readonly nextPageButton: Locator;
private readonly pageIndicator: Locator;

async goToNextPage(): Promise<void> {
  await this.nextPageButton.click();
  await this.waitForPageLoaded(); // Reutiliza método existente del POM padre
}
```

#### ✅ Ejemplo 2: Extender un POM con flujo compuesto

**Contexto**: `RegistrationPage` tiene un método `completeRegistration()` que hace todo el wizard. Necesitás agregar validación de un modal específico en un paso.

```typescript
// ❌ MAL: Reescribir completeRegistration() completo
async completeRegistrationWithValidation() {
  // ... copiar las 80+ líneas de completeRegistration()
}

// ✅ BIEN: Agregar método atómico para el modal nuevo
async validateWarningModal(): Promise<void> {
  await expect(this.page.locator('app-modal', { hasText: 'Advertencia' })).toBeVisible();
  await this.page.getByRole('button', { name: 'Entendido' }).click();
}

// Y crear un método de flujo que combine
async completeRegistrationValidatingModal(): Promise<void> {
  await this.clickStart();
  await this.waitForFirstStep();
  await this.validateWarningModal(); // NUEVO
  await this.clickContinue();
  // ... reutiliza el resto del flujo existente llamando a métodos atómicos
}
```

#### ✅ Ejemplo 3: Componer métodos existentes

**Contexto**: Necesitás filtrar por un estado y abrir el primer registro. `MyPetsPage` ya tiene ambos métodos.

```typescript
// ❌ MAL: Duplicar la lógica
async filterActiveAndOpen() {
  await this.statusFilterButton.click(); // Duplica método existente
  await this.page.locator('li').filter({ hasText: /^Activo$/ }).click(); // Duplica
  await this.clickFirstRow(); // Duplica
}

// ✅ BIEN: Reutilizar el método de composición que ya existe en el POM
await myPetsPage.filterAndOpenFirstWithStatus('Activo');
```

---

## 2. MCP Exploration & POM Authoring Workflow

Cuando se necesita automatizar una nueva pantalla o flujo, seguir estos pasos en orden:

**Paso 1 — NAVIGATE**
Usar `mcp__playwright__browser_navigate` con la URL de `@config/environment` (`environment.<siteId>...`) como base. Nunca hardcodear la URL en el POM ni en el spec.

**Paso 2 — SNAPSHOT**
`mcp__playwright__browser_snapshot` devuelve el árbol de accesibilidad con `[ref=eXX]` por elemento.
Para cada elemento interactivo anotar: `role`, nombre accesible exacto (la UI de este producto es en español — "Dejá su credencial lista", etc.), y ref.

**Paso 3 — SCREENSHOT** *(opcional)*
Solo cuando el snapshot no identifica suficientemente un elemento visual.

**Paso 4 — INTERACTUAR para exponer estados dinámicos**
Hacer clic en tabs, abrir dropdowns, enviar formularios vacíos (para ver mensajes de error).
Re-hacer snapshot después de cada interacción relevante antes de mapear locators.

**Paso 5 — MAPEAR LOCATORS** (orden de preferencia estricto)
1. `page.getByRole(role, { name: 'texto accesible exacto (español)' })`
2. `page.getByLabel('texto label')`
3. `page.locator('[data-cy="valor"]')` — este proyecto usa `data-cy` (ver `LoginPage.ts`: `button[data-cy="submitButton"]`), no `data-testid`
4. `page.locator('tag', { hasText: 'texto' })`
5. `page.locator('.css-class')` — último recurso

**Paso 6 — CONSTRUIR POM** (ver checklist abajo)

**Paso 7 — REGISTRAR** la página nueva en el fixture `container` correspondiente (`tests/framework/vetify-base-test.ts`, `tests/framework/osde-base-test.ts` o `tests/framework/base-test.ts` para el `TestContainer` global) para que quede disponible como `container.<producto>.<app>.<pagina>` en los specs.

---

## 3. POM Authoring Checklist

Al crear o extender un POM:

```
[ ] LEER el POM completo si ya existe (no asumir que está vacío)
[ ] Archivo: src/pages/<producto>/<app>/<NombrePantalla>Page.ts (respetar la carpeta del producto/app existente)
[ ] Clase extiende <Producto><App>BasePage (ej. VetifyWebappBasePage), no BasePage directo, salvo que sea la primera pantalla de esa app
[ ] Imports: Page, Locator, expect (si aplica) de @playwright/test
[ ] Locators: readonly <nombre>: Locator, nombrados por el elemento de UI (ver documentation/development-standars.md §9)
[ ] Locators cacheados en el constructor — NUNCA re-queried dentro de métodos
[ ] NO duplicar locators que ya existen — verificar líneas del constructor
[ ] Métodos públicos async, nombre en inglés, verbo + sustantivo (ej. clickLoginButton, loginWithUserRequest)
[ ] SIN decorator @step — el step visible en Allure lo pone el spec con step() (ver skill qa-spec-conventions), no el POM
[ ] Métodos atómicos primero; métodos de flujo compuesto al final (llaman a los atómicos)
[ ] Sin URLs hardcodeadas — el path relativo fijo va en el constructor del <Producto><App>BasePage, no en cada pantalla
[ ] Sin default export — export nombrado de la clase (PascalCase con prefijo de producto/app: VetifyWebappLoginPage)
[ ] Assertions con expect() dentro del POM cuando forman parte natural de una validación reutilizable; si es específica de un caso, exponer el Locator y dejar el expect() en el step() del spec
[ ] Si extiendes un POM, agregar comentario indicando qué sección agregaste
[ ] Registrar la pantalla nueva en el fixture container (paso 7 de arriba) si otros specs van a necesitarla
[ ] **Scoping obligatorio para `.first()` / `.last()` sobre roles/textos repetibles**:
    NUNCA usar `page.getByRole('button'/'link', { name }).first()` ni
    `page.getByText(...).first()` directamente al nivel `page.` cuando ese
    texto/rol pueda existir en múltiples cards/filas/modales. Anclar siempre
    a un padre único: `dialog`, `aside`, o tarjeta filtrada por heading.
    Patrón canónico:
        private cardByTitle(title: string): Locator {
          return this.page
            .getByRole('heading', { name: title, level: 3, exact: true })
            .locator('xpath=ancestor::div[descendant::button][1]');
        }
        // Uso:
        await this.cardByTitle('<Nombre de la tarjeta>')
          .getByRole('button', { name: '<Acción>' }).click();
```

---

## 4. Trabajar con POMs existentes adelantados

Algunos POMs en este proyecto pueden tener **trabajo adelantado** — métodos complejos que cubren flujos completos pero que pueden necesitar extensión (ej. `LoginPage.loginWithUserRequest()`, que ya orquesta pool de usuarios + caché de `storageState`, ver skill `qa-spec-conventions`).

### Caso especial: un POM con método de flujo completo

Supón que `RegistrationPage` tiene un método `completeRegistration()` que implementa un wizard multi-paso de extremo a extremo, por ejemplo:
1. Click Iniciar
2. Paso A (continuar)
3. Paso B (continuar)
4. Paso C (lógica condicional: si ya existe el sub-flujo, continuar; si no, crearlo)
5. Paso D (modales intermedios)
6. Paso E (interacción compleja: drag & drop, formulario)
7. Modal de confirmación
8. Paso final (guardar / publicar)

#### ¿Cuándo extender vs cuándo usar as-is?

**Usar as-is** si:
- La HU cubre exactamente el mismo flujo feliz
- No necesitás validaciones intermedias
- No hay variantes de comportamiento

**Extender** si:
- Necesitás validar mensajes de error en pasos específicos
- El flujo tiene variantes (ej: plan sin mascota vs plan con mascota, ver `credentials.spec.ts`)
- Necesitás validar estados intermedios
- Debés probar casos de error (validaciones fallidas)

#### Estrategia de extensión:

1. **Leer el método completo** `completeRegistration()` para entender el flujo actual
2. **Identificar puntos de extensión** — ¿qué pasos necesitan validaciones adicionales?
3. **Agregar métodos atómicos** para las validaciones nuevas:
   ```typescript
   async validateStepBEmptyError(): Promise<void> {
     await expect(this.page.getByText('<Texto exacto del mensaje de error>')).toBeVisible();
     await expect(this.continueButton).toBeDisabled();
   }
   ```
4. **Crear método de flujo específico** que combine lo existente con lo nuevo:
   ```typescript
   async completeRegistrationValidatingStepB(): Promise<void> {
     await this.clickStart();
     await this.waitForStepA();
     await this.clickContinue();
     await this.waitForStepB();
     await this.clearStepB(); // NUEVO método atómico
     await this.clickContinue();
     await this.validateStepBEmptyError(); // NUEVO método atómico
   }
   ```

**NO hacer**: Copiar y pegar `completeRegistration()` con pequeños cambios. Esto genera código duplicado difícil de mantener.
