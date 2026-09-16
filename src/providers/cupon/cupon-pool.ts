import fs from 'fs';
import path from 'path';

import { SiteId } from '@config/environment';
import { Cupon, CuponType } from './types';

interface CuponState {
    cupons: Cupon[];
}

const LOCK_RETRY_INTERVAL_MS = 50;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_STALE_AGE_MS = 30_000;

const REUSABLE_CUPONS_STATE_FILE = path.resolve(process.cwd(), 'src/fixtures/cupons/reusable-cupons.json');
const ONE_TIME_CUPONS_STATE_FILE = path.resolve(process.cwd(), 'src/fixtures/cupons/one-time-cupons.json');
const ONE_TIME_CUPONS_LOCK_FILE = path.resolve(process.cwd(), 'src/fixtures/cupons/one-time-cupons.lock');

function ensureStateFile(stateFile: string): void {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(stateFile)) {
        fs.writeFileSync(stateFile, JSON.stringify({ cupons: [] }, null, 2), 'utf-8');
    }
}

function readState(stateFile: string): CuponState {
    ensureStateFile(stateFile);
    return JSON.parse(fs.readFileSync(stateFile, 'utf-8')) as CuponState;
}

function writeState(stateFile: string, state: CuponState): void {
    ensureStateFile(stateFile);
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

function getRandomItem<T>(items: T[]): T | undefined {
    if (items.length === 0) {
        return undefined;
    }
    return items[Math.floor(Math.random() * items.length)];
}

function matchesProject(cupon: Cupon, project?: SiteId): boolean {
    if (cupon.universal) {
        return true;
    }
    if (!project) {
        return false;
    }
    return !!cupon.projects?.includes(project);
}

function acquireLock(lockFile: string): void {
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            const fd = fs.openSync(lockFile, 'wx');
            fs.closeSync(fd);
            return;
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw err;
            }

            try {
                const stat = fs.statSync(lockFile);
                if (Date.now() - stat.mtimeMs > LOCK_STALE_AGE_MS) {
                    fs.unlinkSync(lockFile);
                }
            } catch {
                // Lock removed by another worker. Retry.
            }
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_INTERVAL_MS);
    }

    throw new Error(`Failed to acquire lock within ${LOCK_TIMEOUT_MS}ms`);
}

function releaseLock(lockFile: string): void {
    try {
        fs.unlinkSync(lockFile);
    } catch {
        // already released
    }
}

export class CuponPool {
    getReusableCupon(project?: SiteId): Cupon | undefined {
        const state = readState(REUSABLE_CUPONS_STATE_FILE);
        const matches = state.cupons.filter((cupon) => cupon.type === CuponType.Reusable && matchesProject(cupon, project));
        return getRandomItem(matches);
    }

    consumeOneTimeCupon(project?: SiteId): Cupon | undefined {
        acquireLock(ONE_TIME_CUPONS_LOCK_FILE);
        try {
            const state = readState(ONE_TIME_CUPONS_STATE_FILE);
            const matchingIndexes = state.cupons
                .map((cupon, index) => ({ cupon, index }))
                .filter(({ cupon }) => cupon.type === CuponType.OneTime && matchesProject(cupon, project));

            const selected = getRandomItem(matchingIndexes);
            if (!selected) {
                return undefined;
            }

            const [consumedCupon] = state.cupons.splice(selected.index, 1);
            writeState(ONE_TIME_CUPONS_STATE_FILE, state);
            return consumedCupon;
        } finally {
            releaseLock(ONE_TIME_CUPONS_LOCK_FILE);
        }
    }

    // Devuelve un cupón one-time al pool -- para cuando se lo consumió (splice) pero el registro
    // real terminó fallando por un motivo TRANSITORIO (no porque el token ya estuviera usado, ver
    // CuponAlreadyUsedError). Sin esto, cualquier falla de red/backend después de sacar el cupón del
    // pool lo pierde para siempre aunque nunca se haya usado de verdad. Hallazgo real 2026-09-14.
    releaseOneTimeCupon(cupon: Cupon): void {
        acquireLock(ONE_TIME_CUPONS_LOCK_FILE);
        try {
            const state = readState(ONE_TIME_CUPONS_STATE_FILE);
            state.cupons.push(cupon);
            writeState(ONE_TIME_CUPONS_STATE_FILE, state);
        } finally {
            releaseLock(ONE_TIME_CUPONS_LOCK_FILE);
        }
    }
}
