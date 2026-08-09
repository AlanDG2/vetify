// Temporary standalone script (not part of the test suite) — generates fresh real users to
// revalidate BUG-001 (CP04 IMAS-3899) and unblock multi-pet coverage (IMAS-3889/3909, IMP-003).
// Delete after use.
import { SiteId } from '@config/environment';
import { UserFactory } from '@providers/user/user-factory';
import { activateFreshAccounts } from '../../tests/setup/account-activation-setup';

async function main() {
    console.log('Generating fresh users...');
    const created = await UserFactory.generateTestUsers([
        { siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 1, registration: true, configLabel: 'NO_PET single-plan (CP-21 formato inválido)' },
        { siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 1, registration: true, configLabel: 'NO_PET single-plan (CP-02 credencial sin foto)' },
    ]);
    console.log('Created:', created);

    // IMP-004 (docs/impedimentos-bloqueos.md): validar la póliza inmediatamente después de la compra
    // falla porque el backend todavía no vinculó la compra a la identidad — hace falta esperar unos
    // minutos de propagación real antes de reintentar. activateFreshAccounts() normalmente encadena
    // registro+validación sin espera; acá se fuerza la espera antes de esa llamada.
    const waitMinutes = 15;
    console.log(`Waiting ${waitMinutes} minutes for QA backend propagation before validating policy...`);
    await new Promise((resolve) => setTimeout(resolve, waitMinutes * 60_000));

    console.log('Activating fresh accounts (register + validate policy)...');
    await activateFreshAccounts();

    const accounts = UserFactory.getFreshAccounts();
    console.log('Fresh accounts after activation:');
    for (const acc of accounts) {
        console.log(`  ${acc.email} | plans=${acc.numberOfPlans} | tags=${acc.tags.join(',')}`);
    }
}

main().catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
});
