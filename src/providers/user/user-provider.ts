import fs from 'fs';
import path from 'path';
import type { TestUser, UserRequest } from './types';
import { UserSource } from './types';
import { UserPool } from './user-pool';

const pool = new UserPool();

const STORAGE_STATE_DIR = path.resolve(process.cwd(), 'playwright/auth/');

function getUserStorageStateFilePath(user: TestUser): string {
    return path.join(STORAGE_STATE_DIR, `${user.id}.json`);
}

// Encontrado 2026-08-31: un storageState cacheado con el JWT ya vencido (Auth0 los emite con
// expiresIn=86400, y este repo lo reusa sin chequear vencimiento) se aplicaba igual -- la app
// quedaba en un estado de auth roto que colgaba llamadas autenticadas (ej. pets/my-products) en vez
// de fallar rápido, y eso se veía indistinguible de una caída real de backend. Chequear el `exp` del
// access token antes de reusar el archivo evita ese falso positivo. Si el storageState no tiene la
// forma esperada (cookie "session" con accessToken JWT), se lo trata como vencido -- preferible un
// login de más a reusar algo que no se pudo validar.
function isStorageStateExpired(storageState: string): boolean {
    try {
        const parsed = JSON.parse(storageState);
        const sessionCookie = parsed.cookies?.find((c: { name: string }) => c.name === 'session');
        if (!sessionCookie) {
            return true;
        }
        const session = JSON.parse(decodeURIComponent(sessionCookie.value));
        const payload = JSON.parse(Buffer.from(session.accessToken.split('.')[1], 'base64').toString());
        if (typeof payload.exp !== 'number') {
            return true;
        }
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

export class UserProvider {
    static async getUser(request: UserRequest): Promise<TestUser | undefined> {
        return pool.reserveUser(request);
    }

    static releaseUser(user: TestUser): void {
        pool.releaseUser(user.source, user.email);
    }

    static async getUserStorageState(user: TestUser): Promise<string | undefined> {
        const filePath = getUserStorageStateFilePath(user);
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            const storageState = await fs.promises.readFile(filePath, 'utf-8');
            if (isStorageStateExpired(storageState)) {
                return undefined;
            }
            return storageState;
        } catch {
            return undefined;
        }
    }

    static saveUserStorageState(user: TestUser, storageState: string): string {
        const filePath = getUserStorageStateFilePath(user);
        fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
        fs.writeFileSync(filePath, storageState, 'utf-8');
        // Return the filepath where the storage state is saved
        return filePath;
    }

    // Un test que ejecuta logout real invalida la sesión cacheada — sin esto, el próximo test que
    // reuse este usuario aplicaría cookies muertas y aterrizaría en login sin explicación.
    static clearUserStorageState(user: TestUser): void {
        const filePath = getUserStorageStateFilePath(user);
        fs.rmSync(filePath, { force: true });
    }
}

export { UserSource };
export type { TestUser, UserRequest };
