import path from 'path';

export const TEST_USER_FIST_NAME = 'TEST';
export const TEST_USER_LAST_NAME = 'AUTOMATION';

export const AUTH_DIR_STORAGE_STATE_PATH = path.resolve(process.cwd(), 'playwright/auth/');
export const GENERAL_COOKIES_STORAGE_STATE_PATH = path.resolve(process.cwd(), 'playwright/storageState.json');
