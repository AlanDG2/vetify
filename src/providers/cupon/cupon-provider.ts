import { CuponPool } from './cupon-pool';
import type { Cupon, CuponRequest } from './types';
import { CuponType } from './types';

const pool = new CuponPool();

export class CuponProvider {
    static getCupon(request: CuponRequest): Cupon | undefined {
        if (request.type === CuponType.Reusable) {
            return pool.getReusableCupon(request.project);
        }

        return pool.consumeOneTimeCupon(request.project);
    }

    // Solo aplica a cupones one-time -- los reusable nunca se "consumen" del pool, no hace falta
    // devolverlos.
    static releaseCupon(cupon: Cupon): void {
        if (cupon.type === CuponType.OneTime) {
            pool.releaseOneTimeCupon(cupon);
        }
    }
}

export { CuponType };
export type { Cupon, CuponRequest };
