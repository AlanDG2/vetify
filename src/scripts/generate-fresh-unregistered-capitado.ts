// Fase 2 (docs/backlog-automatizacion.md, "Gestión de Usuario TS-03 CP-03/04/05 — pool
// Fresh/UNREGISTERED se agota"): repone el pool UNREGISTERED para OSDE Capitado y Flux Capitado.
// Corrida DESPUÉS de confirmar en fase 1 (generate-fresh-unregistered-adquirente.ts) que el flujo
// institucional de registro no está afectado por el outage activo (IMP-017) — esta fase consume
// tokens reales y escasos de IMP-001 (quedaban 8 OSDE + 9 Flux al 2026-09-10), no vale la pena
// gastarlos si el flujo estuviera roto. Registration:false: estos usuarios deben quedar SIN
// registrar, los CPs que los consumen ejercitan el registro en sí.
// Script temporal, no forma parte de la suite - borrar después de usar.
import { SiteId } from '@config/environment';
import { UserFactory } from '@providers/user/user-factory';

async function main() {
    console.log('Generando usuarios UNREGISTERED (Capitado) para reponer el pool...');
    const created = await UserFactory.generateTestUsers([
        { siteId: SiteId.OSDE_CAPITADO, numberOfPlans: 1, registration: false, configLabel: 'UNREGISTERED (TS-03 CP-03/04/05 OSDE Capitado)' },
        { siteId: SiteId.FLUX_CAPITADO, numberOfPlans: 1, registration: false, configLabel: 'UNREGISTERED (TS-03 CP-03/04/05 Flux Capitado)' },
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
