import { SiteId } from '@config/environment';
import { Cupon, CuponType } from '@providers/cupon/types';

export interface GenerateRegistrationCuponOptions {
    siteId: SiteId;
}

export class CuponFactory {
    static async generateRegistrationCupon(options: GenerateRegistrationCuponOptions): Promise<Cupon> {
        throw new Error('CuponFactory.generateRegistrationCupon is not implemented yet.');
        // TODO: Fix when this ticket is solved: https://ikeasistencia-arg.atlassian.net/browse/IMAS-3970

        return {
            code: 'TEST',
            projects: [options.siteId],
            type: CuponType.OneTime,
            universal: false,
        };
    }
}
