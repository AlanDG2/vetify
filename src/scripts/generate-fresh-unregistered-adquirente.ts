// Fase 1 (docs/backlog-automatizacion.md, "Gestión de Usuario TS-03 CP-03/04/05 — pool
// Fresh/UNREGISTERED se agota"): repone el pool UNREGISTERED solo para Adquirente (sin costo de
// tokens Capitado, ver IMP-001) — se corre primero para confirmar que el flujo de compra
// institucional no está afectado por el outage activo (IMP-017) antes de gastar tokens Capitado
// escasos en la fase 2. Registration:false porque estos usuarios deben QUEDAR sin registrar —
// los CPs que los consumen (Documento no existente/ya registrado/Activación exitosa) ejercitan el
// registro en sí, no una cuenta ya activada.
// Script temporal, no forma parte de la suite - borrar después de usar.
import { SiteId } from '@config/environment';
import { UserFactory } from '@providers/user/user-factory';

async function main() {
    console.log('Generando usuarios UNREGISTERED (Adquirente) para reponer el pool...');
    const created = await UserFactory.generateTestUsers([
        { siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 1, registration: false, configLabel: 'UNREGISTERED (TS-03 CP-03/04/05 Vetify B2C)' },
        { siteId: SiteId.OSDE_ADQUIRENTE, numberOfPlans: 1, registration: false, configLabel: 'UNREGISTERED (TS-03 CP-03/04/05 OSDE Adquirente)' },
    ]);
    console.log('Created:', created);

    const accounts = UserFactory.getFreshAccounts();
    console.log('Fresh accounts en pool ahora:');
    for (const acc of accounts) {
        console.log(`  ${acc.email} | site=${acc.siteId} | tags=${acc.tags.join(',')}`);
    }
}

main().catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
});
