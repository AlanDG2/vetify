# Test User Management Strategy

## Purpose

This document defines the strategy for managing test users within the Playwright automation framework.

The objective is to provide a scalable and maintainable approach that supports different types of test users while
keeping tests independent of the underlying provisioning mechanism.

This document describes the architectural decisions and guiding principles. It intentionally avoids implementation
details.

---

# Goals

The solution should:

- Provide a single, consistent mechanism for obtaining test users.
- Support both reusable and isolated users.
- Enable safe parallel execution.
- Keep test code focused on business scenarios rather than user management.
- Allow future evolution without impacting existing tests.

---

# User Types

Two categories of test users are supported.

## Pooled Users

Reusable accounts that are shared across test executions.

These users are pre-generated and maintained outside of the test execution lifecycle. They are intended for scenarios
where user isolation is not required.

## Fresh Users

Isolated accounts created specifically for a test execution.

Fresh users are provisioned during the test environment setup, before any tests begin running. Since user creation is a
lengthy process, provisioning is considered an infrastructure responsibility rather than part of test execution.

---

# Source Selection

Each test explicitly specifies the type of user it requires.

The framework does not automatically choose between pooled and fresh users.

This approach ensures:

- predictable behavior
- explicit test intent
- simpler framework logic
- easier troubleshooting

If the requested user type is unavailable, the request should fail rather than silently using an alternative.

---

# Architecture

The runtime architecture consists of a single public entry point responsible for retrieving test users from the
requested source.

The framework separates concerns as follows:

- **UserProvider** serves as the public entry point for all user requests.
- **PooledUserSource** manages reusable accounts and handles reservation/release lifecycle.
- **FreshUserSource** manages pre-provisioned isolated accounts and handles reservation only (fresh users are never
  released).

User provisioning is intentionally excluded from the runtime architecture and is performed during the test setup phase.

---

# Implementation

## File Structure

```
src/
├── providers/
│   └── user/
│       ├── readme.md              ← this file
│       ├── types.ts               ← UserSource enum, TestUser, UserRequest
│       ├── user-provider.ts       ← public API (tests import from here)
│       ├── user-pool.ts           ← PooledUserSource + FreshUserSource
│       ├── user-factory.ts        ← provisioning during setup phase
│       └── index.ts               ← barrel export
│
└── fixtures/
    └── users/
        ├── pooled-users.json      ← reusable user accounts
        ├── pooled-users.lock      ← parallel access lock (created/destroyed at runtime)
        ├── fresh-users.json       ← isolated user accounts
        └── fresh-users.lock       ← parallel access lock (created/destroyed at runtime)
```

Path alias: `@providers/user` → `./src/providers/user`

## User Fixture Format

Both `pooled-users.json` and `fresh-users.json` follow the same structure:

```json
{
    "users": {
        "VETIFY_ADQUIRENTE": [
            {
                "id": "user-001",
                "siteId": "VETIFY_ADQUIRENTE",
                "email": "user001@example.com",
                "password": "SecurePassword123",
                "source": "pooled",
                "reserved": false
            }
        ]
    }
}
```

Users are grouped by `siteId` under the `users` object, and each user still keeps its own `siteId` field.

The `reserved` flag is managed at runtime and is never persisted to disk.

## User Tags & Filtering

Users can be tagged to enable test selection of users with specific conditions.

All standard tags are defined in the `UserTag` enum for type-safe filtering.

### Centralized Tag Definitions

Tags are defined in [tags.ts](tags.ts):

```typescript
export enum UserTag {
    VERIFIED = 'VERIFIED', // User email verified
    KYC_PASSED = 'KYC_PASSED', // KYC validation complete
    REGISTERED = 'REGISTERED', // User has completed registration
    PREMIUM = 'PREMIUM', // Premium account tier
    STANDARD = 'STANDARD', // Standard account tier
    UNVERIFIED = 'UNVERIFIED', // User email not verified
}
```

### Tag Definition in Fixtures

Tags are optional string arrays on each user. Use `UserTag` enum values:

```json
{
    "users": {
        "VETIFY_ADQUIRENTE": [
            {
                "id": "pooled-001",
                "siteId": "VETIFY_ADQUIRENTE",
                "email": "user@example.com",
                "password": "password",
                "source": "pooled",
                "reserved": false,
                "tags": ["VERIFIED", "KYC_PASSED", "PREMIUM"]
            }
        ]
    }
}
```

### Tag Filtering in Tests

Request a user with specific tags using the `UserTag` enum:

```typescript
import { UserProvider, UserSource, UserTag } from '@providers/user';
import { SiteId } from '@config/environment';

// Get any pooled user (no tag filter)
const anyUser = UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE });

// Get a pooled user with specific tags (all tags must match)
const verifiedUser = UserProvider.getUser({
    source: UserSource.Pooled,
    siteId: SiteId.VETIFY_ADQUIRENTE,
    tags: [UserTag.VERIFIED, UserTag.KYC_PASSED],
});

// Works with fresh users too
const premiumFreshUser = UserProvider.getUser({
    source: UserSource.Fresh,
    siteId: SiteId.VETIFY_ADQUIRENTE,
    tags: [UserTag.PREMIUM],
});
```

### Matching Behavior

- **SiteId required in request**: Every request must specify `siteId` and only users from that site are considered
- **Tags optional in request**: If no tags are specified, any unreserved user from the requested site is returned
- **All tags required**: If tags are specified, the user must have ALL requested tags (AND logic)
- **Missing user**: If no user matches the criteria, an error is thrown with the requested tags in the message

### No Match Error Examples

```
No available pooled user with tags [VERIFIED, KYC_PASSED] in the pool
No available fresh user with tags [PREMIUM] in the pool
```

## Runtime Usage

Tests import the public API and request users explicitly:

```typescript
import { UserProvider, UserSource } from '@providers/user';
import { SiteId } from '@config/environment';

// Get a pooled user (reusable)
const pooledUser = UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE });
// ... test executes ...
UserProvider.releaseUser(pooledUser); // Returns user to pool

// Get a fresh user (isolated)
const freshUser = UserProvider.getUser({ source: UserSource.Fresh, siteId: SiteId.VETIFY_ADQUIRENTE });
// ... test executes ...
UserProvider.releaseUser(freshUser); // No-op for fresh users (remain reserved)
```

## Setup Phase Usage

The `UserFactory` provisions users during the global setup phase (`tests/global-setup.ts`):

```typescript
import { UserFactory } from '@providers/user/user-factory';

const factory = new UserFactory();

// Clear previous state
factory.resetState();

// Provision pooled users (reusable across runs)
factory.provisionPooledUsers([
    { id: 'pooled-001', email: 'pooled@example.com', password: 'pass123' },
    { id: 'pooled-002', email: 'pooled2@example.com', password: 'pass456' },
]);

// Provision fresh users (created externally before this run)
factory.provisionFreshUsers([
    { id: 'fresh-001', email: 'fresh@example.com', password: 'pass789' },
    { id: 'fresh-002', email: 'fresh2@example.com', password: 'pass000' },
]);

// Optionally reset reservations between test runs (in the same execution)
factory.resetPooledReservations();
factory.resetFreshReservations();
```

## Parallel Execution Safety

Each user source maintains its own lock file to ensure thread-safe access across parallel workers:

- **Lock file naming**: `{source}-users.lock` (e.g., `pooled-users.lock`, `fresh-users.lock`)
- **Lock acquisition**: Atomic file creation with exponential backoff (50ms intervals)
- **Lock timeout**: 10 seconds
- **Stale lock cleanup**: Locks older than 30 seconds are automatically removed
- **Supported parallelism**: Safe for 2+ workers on a single machine; higher concurrency benefits from a named mutex or
  external lock service

The lock mechanism ensures that:

- Only one worker reads/modifies the user state file at a time
- Concurrent workers do not receive duplicate user reservations
- Pooled users are properly returned to the pool when released

---

# Separation of Responsibilities

## Test Setup

Responsible for:

- provisioning fresh users
- preparing user datasets
- making users available before execution begins

## Test Execution

Responsible for:

- acquiring users
- reserving users for exclusive use
- releasing users when no longer needed

Runtime execution must never create users.

---

# Parallel Execution

The framework supports safe parallel execution across multiple Playwright workers without user conflicts.

Each user source maintains a separate JSON state file and lock file for atomic, concurrent access.

### Lock Mechanism

- **Atomic file creation**: Lock files are created exclusively (fails if exists) for thread-safe acquisition
- **Exponential backoff**: 50ms intervals between lock acquisition attempts
- **Timeout**: 10 seconds maximum wait time before failure
- **Stale lock cleanup**: Locks older than 30 seconds are automatically removed (recovery from crashed processes)

### Concurrent Behavior

1. **Worker A** requests a pooled user:
    - Acquires `pooled-users.lock`
    - Reads `pooled-users.json`
    - Marks a user as reserved
    - Writes changes back
    - Releases lock

2. **Worker B** requests a pooled user simultaneously:
    - Waits for lock (Worker A holds it)
    - Acquires lock after Worker A releases
    - Reads updated state (sees Worker A's reservation)
    - Selects a different unreserved user
    - Marks it reserved
    - Releases lock

3. **Worker A** releases the user after test completes:
    - Acquires lock
    - Marks user as unreserved
    - Releases lock
    - User becomes available for future reservations

### Scalability Notes

The current implementation is optimized for 2-4 workers on a single machine. For higher concurrency:

- Consider a named mutex or `proper-lockfile` npm package
- Implement a centralized lock service
- Use a lightweight database (SQLite) for state management

---

# Guiding Principles

## Explicit over Implicit

Tests declare the type of user they require. The framework does not infer or substitute user types.

## Separation of Concerns

Provisioning, storage, and user acquisition are independent responsibilities.

## Predictability

User acquisition should always produce deterministic behavior. The framework should never silently change strategies.

## Extensibility

The design should allow new user sources, provisioning mechanisms, or filtering capabilities to be introduced without
affecting test code.

## Test Simplicity

Tests should express business intent and remain unaware of how users are created, stored, or managed.

---

# Future Considerations

Potential future enhancements include:

- user metadata and filtering
- user lifecycle tracking
- additional user sources
- environment-specific provisioning strategies
- automated cleanup and recovery mechanisms

These capabilities should extend the existing architecture without changing how tests request users.
