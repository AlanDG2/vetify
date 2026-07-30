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
            return fs.promises.readFile(filePath, 'utf-8');
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
}

export { UserSource };
export type { TestUser, UserRequest };
