import { SiteId } from '@config/environment';
import { CuponProvider } from './cupon-provider';
import { Cupon, CuponType } from './types';

export interface GenerateRegistrationCuponOptions {
    siteId: SiteId;
}

export class CuponFactory {
    // IMAS-3970: no existe un endpoint de generación de cupones para Capitado -- los cupones de
    // registro se consiguen manualmente y se cargan en src/fixtures/cupons/one-time-cupons.json.
    // `generateRegistrationCupon` consume uno de esa pool en vez de generarlo on-demand.
    static async generateRegistrationCupon(options: GenerateRegistrationCuponOptions): Promise<Cupon> {
        const cupon = CuponProvider.getCupon({ type: CuponType.OneTime, project: options.siteId });

        if (!cupon) {
            throw new Error(`No hay cupones de registro one-time disponibles para siteId: ${options.siteId}`);
        }

        return cupon;
    }

    // Llamar cuando el registro con este cupón falló por un motivo TRANSITORIO (no porque el token
    // ya estaba usado -- ver CuponAlreadyUsedError) para que otra corrida lo pueda reintentar en vez
    // de perderlo para siempre. Hallazgo real 2026-09-14 (ver docs/impedimentos-bloqueos.md IMP-001).
    static releaseRegistrationCupon(cupon: Cupon): void {
        CuponProvider.releaseCupon(cupon);
    }
}
