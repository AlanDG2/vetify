import fs from 'fs';
import path from 'path';

import { SiteId } from '@config/environment';
import { type TestUser, type UserRequest, UserSource } from './types';

interface UserRecord extends TestUser {
    reserved: boolean;
}

type UsersBySite = Record<string, UserRecord[]>;

interface UserState {
    users: UsersBySite;
}

interface ReserveUserOptions {
    siteId: SiteId;
    reserve?: boolean;
    ignoreReserved?: boolean;
    numberOfPlans?: number;
}

const LOCK_RETRY_INTERVAL_MS = 50;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_STALE_AGE_MS = 30_000;

function acquireLock(lockFile: string): void {
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            const fd = fs.openSync(lockFile, 'wx');
            fs.closeSync(fd);
            return;
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;

            // Remove a stale lock left by a crashed process
            try {
                const stat = fs.statSync(lockFile);
                if (Date.now() - stat.mtimeMs > LOCK_STALE_AGE_MS) {
                    fs.unlinkSync(lockFile);
                }
            } catch {
                // Lock was already removed by another worker; retry
            }
        }
        // Synchronous sleep — safe in Node.js worker processes
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_INTERVAL_MS);
    }
    throw new Error(`Failed to acquire lock within ${LOCK_TIMEOUT_MS}ms`);
}

function releaseLock(lockFile: string): void {
    try {
        fs.unlinkSync(lockFile);
    } catch {
        // Already released; ignore
    }
}

function readState(stateFile: string): UserState {
    if (!fs.existsSync(stateFile)) {
        return { users: {} };
    }
    const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf-8')) as { users?: unknown };

    if (parsed.users && typeof parsed.users === 'object') {
        return { users: parsed.users as UsersBySite };
    }

    return { users: {} };
}

function writeState(stateFile: string, state: UserState): void {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

function groupUsersBySite(users: UserRecord[]): UsersBySite {
    const grouped: UsersBySite = {};
    for (const user of users) {
        if (!grouped[user.siteId]) {
            grouped[user.siteId] = [];
        }
        grouped[user.siteId].push(user);
    }
    return grouped;
}

function getSiteUsers(state: UserState, siteId: SiteId): UserRecord[] {
    return state.users[siteId] ?? [];
}

function getAllUsers(state: UserState): UserRecord[] {
    return Object.values(state.users).flat();
}

// Pooled user fixture paths
const POOLED_USERS_STATE_FILE = path.resolve(process.cwd(), 'src/fixtures/users/pooled-users.json');
const POOLED_USERS_LOCK_FILE = path.resolve(process.cwd(), 'src/fixtures/users/pooled-users.lock');

// Fresh user fixture paths
const FRESH_USERS_STATE_FILE = path.resolve(process.cwd(), 'src/fixtures/users/fresh-users.json');
const FRESH_USERS_LOCK_FILE = path.resolve(process.cwd(), 'src/fixtures/users/fresh-users.lock');

class PooledUserSource {
    private stateFile: string;
    private lockFile: string;

    constructor() {
        this.stateFile = POOLED_USERS_STATE_FILE;
        this.lockFile = POOLED_USERS_LOCK_FILE;
    }

    reserveUser(tags: string[] | undefined, options: ReserveUserOptions): TestUser | undefined {
        const { siteId, reserve = true, ignoreReserved = false, numberOfPlans } = options;
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            const siteUsers = getSiteUsers(state, siteId);
            const record = siteUsers.find(
                (u) =>
                    u.siteId === siteId && (ignoreReserved || !u.reserved) && this.matchesTags(u.tags, tags) && (numberOfPlans === undefined || u.numberOfPlans === numberOfPlans),
            );
            if (!record) {
                const tagStr = tags?.length ? ` with tags [${tags.join(', ')}]` : '';
                const plansStr = numberOfPlans !== undefined ? ` and ${numberOfPlans} plans` : '';
                console.log(`No available pooled user for siteId ${siteId}${tagStr}${plansStr} in the pool`);
                return undefined; // Return undefined instead of throwing an error
            }
            record.reserved = reserve; // Mark the user as reserved if requested
            writeState(this.stateFile, state);
            const { reserved: _reserved, ...user } = record;
            return user;
        } finally {
            releaseLock(this.lockFile);
        }
    }

    releaseUser(userEmail: string): void {
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            const record = getAllUsers(state).find((u) => u.email === userEmail);
            if (record) {
                record.reserved = false;
                writeState(this.stateFile, state);
            }
        } finally {
            releaseLock(this.lockFile);
        }
    }

    addUsers(users: TestUser[]): void {
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            const records: UserRecord[] = users.map((u) => ({ ...u, reserved: false }));
            for (const record of records) {
                if (!state.users[record.siteId]) {
                    state.users[record.siteId] = [];
                }
                state.users[record.siteId].push(record);
            }
            writeState(this.stateFile, state);
        } finally {
            releaseLock(this.lockFile);
        }
    }

    resetReservations(): void {
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            for (const user of getAllUsers(state)) {
                user.reserved = false;
            }
            writeState(this.stateFile, state);
        } finally {
            releaseLock(this.lockFile);
        }
    }

    private matchesTags(userTags: string[] | undefined, requestedTags: string[] | undefined): boolean {
        if (!requestedTags || requestedTags.length === 0) {
            return true; // No filter = all users match
        }
        if (!userTags || userTags.length === 0) {
            return false; // User has no tags but filter requested
        }
        return requestedTags.every((tag) => userTags.includes(tag));
    }
}

class FreshUserSource {
    private stateFile: string;
    private lockFile: string;

    constructor() {
        this.stateFile = FRESH_USERS_STATE_FILE;
        this.lockFile = FRESH_USERS_LOCK_FILE;
    }

    async reserveUser(tags: string[] | undefined, options: ReserveUserOptions): Promise<TestUser | undefined> {
        const { siteId, reserve = true, ignoreReserved = false, numberOfPlans } = options;
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            const siteUsers = getSiteUsers(state, siteId);
            const record = siteUsers.find(
                (u) =>
                    u.siteId === siteId && (ignoreReserved || !u.reserved) && this.matchesTags(u.tags, tags) && (numberOfPlans === undefined || u.numberOfPlans === numberOfPlans),
            );
            if (!record) {
                const tagStr = tags?.length ? ` with tags [${tags.join(', ')}]` : '';
                const plansStr = numberOfPlans !== undefined ? ` and ${numberOfPlans} plans` : '';
                console.log(`No available fresh user for siteId ${siteId}${tagStr}${plansStr} in the pool`);
                return undefined; // Return undefined instead of throwing an error
            }
            record.reserved = reserve; // Mark the user as reserved if requested
            writeState(this.stateFile, state);
            const { reserved: _reserved, ...user } = record;
            return user;
        } finally {
            releaseLock(this.lockFile);
        }
    }

    // Fresh users are never released — intentionally accepts but ignores userEmail
    releaseUser(_userEmail: string): void {
        // No-op
    }

    addUsers(users: TestUser[]): void {
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            const records: UserRecord[] = users.map((u) => ({ ...u, reserved: false }));
            for (const record of records) {
                if (!state.users[record.siteId]) {
                    state.users[record.siteId] = [];
                }
                state.users[record.siteId].push(record);
            }
            writeState(this.stateFile, state);
        } finally {
            releaseLock(this.lockFile);
        }
    }

    updateFreshAccounts(users: TestUser[]): void {
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            state.users = groupUsersBySite(users.map((u) => ({ ...u, reserved: false })));
            writeState(this.stateFile, state);
        } finally {
            releaseLock(this.lockFile);
        }
    }

    resetReservations(): void {
        acquireLock(this.lockFile);
        try {
            const state = readState(this.stateFile);
            for (const user of getAllUsers(state)) {
                user.reserved = false;
            }
            writeState(this.stateFile, state);
        } finally {
            releaseLock(this.lockFile);
        }
    }

    private matchesTags(userTags: string[] | undefined, requestedTags: string[] | undefined): boolean {
        if (!requestedTags || requestedTags.length === 0) {
            return true; // No filter = all users match
        }
        if (!userTags || userTags.length === 0) {
            return false; // User has no tags but filter requested
        }
        return requestedTags.every((tag) => userTags.includes(tag));
    }
}

export class UserPool {
    private pooledSource = new PooledUserSource();
    private freshSource = new FreshUserSource();

    async reserveUser(request: UserRequest): Promise<TestUser | undefined> {
        const { source, siteId, tags, reserve = true, ignoreReserved = false, numberOfPlans } = request;
        if (source === UserSource.Pooled) {
            return this.pooledSource.reserveUser(tags, { siteId, reserve, ignoreReserved, numberOfPlans });
        } else {
            return this.freshSource.reserveUser(tags, { siteId, reserve, ignoreReserved, numberOfPlans });
        }
    }

    releaseUser(source: UserSource, userEmail: string): void {
        if (source === UserSource.Pooled) {
            this.pooledSource.releaseUser(userEmail);
        } else {
            this.freshSource.releaseUser(userEmail);
        }
    }

    addFreshUsers(users: TestUser[]): void {
        this.freshSource.addUsers(users);
    }

    resetPooledReservations(): void {
        this.pooledSource.resetReservations();
    }

    resetFreshReservations(): void {
        this.freshSource.resetReservations();
    }

    updateFreshAccounts(users: TestUser[]): void {
        this.freshSource.updateFreshAccounts(users);
    }

    getFreshAccounts(): TestUser[] {
        const state = readState(FRESH_USERS_STATE_FILE);
        return getAllUsers(state).map(({ reserved: _reserved, ...user }) => user);
    }
}
