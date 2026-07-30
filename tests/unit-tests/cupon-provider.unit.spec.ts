import { SiteId } from '@config/environment';
import { expect, test } from '@playwright/test';
import { CuponProvider, CuponType } from '@providers/cupon';
import fs from 'fs';
import path from 'path';

const REUSABLE_STATE_FILE = path.resolve(process.cwd(), 'src/fixtures/cupons/reusable-cupons.json');
const ONE_TIME_STATE_FILE = path.resolve(process.cwd(), 'src/fixtures/cupons/one-time-cupons.json');
const ONE_TIME_LOCK_FILE = path.resolve(process.cwd(), 'src/fixtures/cupons/one-time-cupons.lock');

function ensureFixtureDir(): void {
    const dir = path.dirname(REUSABLE_STATE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeState(filePath: string, cupons: unknown[]): void {
    ensureFixtureDir();
    fs.writeFileSync(filePath, JSON.stringify({ cupons }, null, 2), 'utf-8');
}

test.describe('CuponProvider', () => {
    let reusableBackup: string | undefined;
    let oneTimeBackup: string | undefined;

    test.beforeAll(() => {
        ensureFixtureDir();
        reusableBackup = fs.existsSync(REUSABLE_STATE_FILE) ? fs.readFileSync(REUSABLE_STATE_FILE, 'utf-8') : undefined;
        oneTimeBackup = fs.existsSync(ONE_TIME_STATE_FILE) ? fs.readFileSync(ONE_TIME_STATE_FILE, 'utf-8') : undefined;
    });

    test.afterEach(() => {
        if (fs.existsSync(ONE_TIME_LOCK_FILE)) {
            fs.unlinkSync(ONE_TIME_LOCK_FILE);
        }
    });

    test.afterAll(() => {
        if (reusableBackup !== undefined) {
            fs.writeFileSync(REUSABLE_STATE_FILE, reusableBackup, 'utf-8');
        } else if (fs.existsSync(REUSABLE_STATE_FILE)) {
            fs.unlinkSync(REUSABLE_STATE_FILE);
        }

        if (oneTimeBackup !== undefined) {
            fs.writeFileSync(ONE_TIME_STATE_FILE, oneTimeBackup, 'utf-8');
        } else if (fs.existsSync(ONE_TIME_STATE_FILE)) {
            fs.unlinkSync(ONE_TIME_STATE_FILE);
        }

        if (fs.existsSync(ONE_TIME_LOCK_FILE)) {
            fs.unlinkSync(ONE_TIME_LOCK_FILE);
        }
    });

    test('returns random reusable cupon matching project and keeps it reusable', () => {
        writeState(REUSABLE_STATE_FILE, [
            {
                code: 'UNIVERSAL-REUSE-10',
                type: CuponType.Reusable,
                universal: true,
                percentageDiscount: 10.5,
            },
            {
                code: 'OSDE-REUSE-20',
                type: CuponType.Reusable,
                universal: false,
                projects: [SiteId.OSDE_ADQUIRENTE],
                percentageDiscount: 20.0,
            },
        ]);
        writeState(ONE_TIME_STATE_FILE, []);

        const first = CuponProvider.getCupon({ type: CuponType.Reusable, project: SiteId.OSDE_ADQUIRENTE });
        const second = CuponProvider.getCupon({ type: CuponType.Reusable, project: SiteId.OSDE_ADQUIRENTE });

        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect([first!.code, second!.code]).toEqual(expect.arrayContaining([first!.code]));
        expect(first!.percentageDiscount).toBeDefined();
    });

    test('consumes one-time cupon when retrieved and cannot reuse it', () => {
        writeState(REUSABLE_STATE_FILE, []);
        writeState(ONE_TIME_STATE_FILE, [
            {
                code: 'ONETIME-OSDE-25',
                type: CuponType.OneTime,
                universal: false,
                projects: [SiteId.OSDE_ADQUIRENTE],
                percentageDiscount: 25.0,
            },
        ]);

        const first = CuponProvider.getCupon({ type: CuponType.OneTime, project: SiteId.OSDE_ADQUIRENTE });
        const second = CuponProvider.getCupon({ type: CuponType.OneTime, project: SiteId.OSDE_ADQUIRENTE });

        expect(first?.code).toBe('ONETIME-OSDE-25');
        expect(second).toBeUndefined();
    });

    test('supports concurrent one-time consumption without duplicating cupons', async () => {
        writeState(REUSABLE_STATE_FILE, []);
        writeState(ONE_TIME_STATE_FILE, [
            {
                code: 'ONETIME-CONCURRENT-1',
                type: CuponType.OneTime,
                universal: true,
            },
        ]);

        const [resultA, resultB] = await Promise.all([
            Promise.resolve(CuponProvider.getCupon({ type: CuponType.OneTime, project: SiteId.VETIFY_ADQUIRENTE })),
            Promise.resolve(CuponProvider.getCupon({ type: CuponType.OneTime, project: SiteId.VETIFY_ADQUIRENTE })),
        ]);

        const definedResults = [resultA, resultB].filter((value) => value !== undefined);
        expect(definedResults).toHaveLength(1);
        expect(definedResults[0]?.code).toBe('ONETIME-CONCURRENT-1');
    });
});
