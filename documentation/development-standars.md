# Playwright Automation Framework Development Standards

## 1. Purpose

This document defines the development standards and naming conventions for the Playwright automation framework. Following these standards ensures consistency, readability, maintainability, and scalability across the project.

---

# 2. General Naming Conventions

| Item       | Convention       | Example            |
| ---------- | ---------------- | ------------------ |
| Folders    | kebab-case       | `api-clients`      |
| Files      | kebab-case       | `login-page.ts`    |
| Classes    | PascalCase       | `LoginPage`        |
| Interfaces | PascalCase       | `Customer`         |
| Types      | PascalCase       | `OrderResponse`    |
| Enums      | PascalCase       | `UserRole`         |
| Variables  | camelCase        | `customerId`       |
| Constants  | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT`  |
| Functions  | camelCase        | `createCustomer()` |
| Methods    | camelCase        | `searchCustomer()` |

---

# 3. Folder Structure

```text
src/
│
├── api/
│   ├── vetify/
│   │   ├── institutional/
│   │   └── webapp/
│   ├── ike/
│   └── auth0/
│
├── config/
│
├── fixtures/
│
├── helpers/
│
├── integrations/
│   ├── mercadopago/
│   ├── salesforce/
│   └── ...
│
├── pages/
│   ├── vetify/
│   │   ├── institutional/
│   │   └── webapp/
│   └── ike/
│
├── providers/
│   └── user/
│
├── report/
│   └── allure/
│
├── scripts/
│
└── types/

tests/
│
├── setup/
├── vetify/
├── ike/
└── .../
```

### Guidelines

- Organize folders by responsibility.
- Avoid generic folder names such as `common`, `misc`, or `temp`.
- Keep folder nesting to a maximum of three levels whenever practical.

---

# 4. File Naming

## Page Objects

```text
login-page.ts
checkout-page.ts
dashboard-page.ts
```

Suffix: `-page.ts`

---

## Components

```text
header-component.ts
shopping-cart-component.ts
```

Suffix: `-component.ts`

---

## API Clients

```text
customer-api.ts
orders-api.ts
```

Suffix: `-api.ts`

---

## API Helpers

```text
customer-helper.ts
order-helper.ts
```

Suffix: `-helper.ts`

---

## Fixtures

```text
authenticated-user.fixture.ts
api.fixture.ts
```

Suffix: `.fixture.ts`

---

## Test Data

```text
customer-data.ts
product-data.ts
```

Suffix: `-data.ts`

---

## Utilities

```text
date-utils.ts
string-utils.ts
```

Suffix: `-utils.ts`

---

# 5. Class Naming

Use PascalCase.

**Good**

```typescript
class LoginPage {}
class CustomerApi {}
class SalesforceClient {}
class CustomerHelper {}
```

**Avoid**

```typescript
class Helper {}
class Utils {}
class Manager {}
```

Class names should describe their responsibility.

---

# 6. Method Naming

Methods should describe an action.

**Good**

```typescript
login();
logout();
createCustomer();
deleteCustomer();
searchOrder();
```

**Avoid**

```typescript
doLogin();
execute();
performAction();
run();
```

---

# 7. Variable Naming

Use meaningful names.

**Good**

```typescript
customer;
customerId;
createdOrder;
expectedStatus;
```

**Avoid**

```typescript
obj;
temp;
value;
data;
x;
```

---

# 8. Test Naming

Tests should describe business behavior.

**Good**

```text
should create a customer successfully

should reject invalid credentials

should update the customer address
```

**Avoid**

```text
Login Test

Customer Test

Verify Login

Test 1
```

---

# 9. Locator Naming

Name locators after the UI element.

**Good**

```typescript
loginButton;
usernameInput;
passwordInput;
saveButton;
cartIcon;
```

**Avoid**

```typescript
btn;
elm;
div1;
locator;
```

Do not include the word "locator" in variable names.

---

# 10. Constants

Use uppercase snake case.

```typescript
DEFAULT_TIMEOUT;
MAX_RETRIES;
BASE_URL;
ADMIN_USER;
```

---

# 11. Interfaces and Types

Use PascalCase.

**Preferred**

```typescript
interface Customer {}

type OrderResponse = {};
```

Avoid interface prefixes.

```typescript
interface ICustomer {}
```

---

# 12. Test Files

Use feature-based naming.

```text
login.spec.ts
checkout.spec.ts
customer-api.spec.ts
```

Suffix: `.spec.ts`

---

# 13. Tags

Recommended tags:

```text
@smoke
@sanity
@regression
@critical
@ui
@api
@negative
@positive
```

Keep the number of custom tags limited.

---

# 14. Comments

Write self-documenting code whenever possible.

Use comments only for:

- Business rules
- Temporary workarounds
- Technical limitations
- Non-obvious implementation decisions

Avoid comments that simply describe what the code is doing.

---

# 15. Import Order

```typescript
// Node modules
import path from 'path';

// Third-party libraries
import { test, expect } from '@playwright/test';

// Internal framework imports
import { LoginPage } from '@pages/login-page';

// Types
import type { Customer } from '@api/models/customer';
```

---

# 16. Class Organization

Recommended order within a class:

```text
Imports

Constants

Constructor

Private locators

Public methods

Private methods
```

Keep related methods grouped together.

---

# 17. Naming Anti-Patterns

Avoid generic names.

| Avoid   | Prefer                |
| ------- | --------------------- |
| Helper  | CustomerHelper        |
| Manager | UserSessionManager    |
| Utils   | DateUtils             |
| Common  | AuthenticationService |
| Object  | CustomerRecord        |
| Temp    | PendingOrder          |
| Data    | CustomerData          |

Choose names that reflect the business domain.

---

# 18. Playwright Best Practices

- Keep Page Objects focused on user interactions.
- Avoid assertions inside Page Objects.
- Use fixtures to manage authentication and shared setup.
- Use API helpers to create and clean test data.
- Prefer explicit waits over hard-coded timeouts.
- Keep locators private to the Page Object.
- Use reusable components for shared UI elements.

---

# 19. Allure Reporting Standards

- Add Epic, Feature, and Story annotations where applicable.
- Use consistent severity levels.
- Attach screenshots only on failures.
- Attach request and response payloads for API tests.
- Include trace files for failed UI tests.
- Categorize failures using `categories.json`.
- Generate `environment.properties` and `executor.json` during CI execution.

---

# 20. GitLab CI Standards

- Use descriptive job names.
- Separate pipeline stages by responsibility.

Example:

```text
install
lint
build
test
report
deploy
```

- Store Playwright reports and Allure results as artifacts.
- Use pipeline variables for environment configuration.
- Avoid hardcoding credentials or URLs.
- Enable parallel execution whenever possible.

---

# 21. Code Review Checklist

Before merging, verify that:

- Naming conventions are followed.
- No duplicated code exists.
- Methods have a single responsibility.
- Page Objects contain no assertions.
- Tests are independent.
- API helpers are reused where appropriate.
- Constants are centralized.
- Imports are organized.
- Comments are meaningful.
- Allure metadata is included where applicable.
- CI pipeline passes successfully.
