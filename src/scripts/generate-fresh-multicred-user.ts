// Temporary standalone script (not part of the test suite) — genera 1 cuenta fresh con 2 planes
// comprados y ninguna mascota cargada, para probar IMAS-4538 (pantalla de selección de plan
// cuando hay 2+ credenciales vacías). Delete after use.
import { SiteId } from '@config/environment';
import { UserFactory } from '@providers/user/user-factory';
import { activateFreshAccounts } from '../../tests/setup/account-activation-setup';

async function main() {
    console.log('Generating fresh multi-plan user...');
    const created = await UserFactory.generateTestUsers([{ siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 2, registration: true, configLabel: 'NO_PET multi-plan (IMAS-4538)' }]);
    console.log('Created:', created);

    const waitMinutes = 15;
    console.log(`Waiting ${waitMinutes} minutes for QA backend propagation before validating policy...`);
    await new Promise((resolve) => setTimeout(resolve, waitMinutes * 60_000));

    console.log('Activating fresh accounts (register + validate policy)...');
    await activateFreshAccounts();

    const accounts = UserFactory.getFreshAccounts();
    console.log('Fresh accounts after activation:');
    for (const acc of accounts) {
        console.log(`  ${acc.email} | password=${acc.password} | plans=${acc.numberOfPlans} | tags=${acc.tags.join(',')}`);
    }
}

main().catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
});
