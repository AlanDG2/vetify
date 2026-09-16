// Temporary standalone script (not part of the test suite) — genera 2 cuentas fresh NO_PET para
// destrabar credentials.spec.ts TS-03 TC-03/TC-04 (IMP-019, visibilidad de "Usar cámara"), cuyo
// pool Fresh estaba agotado. Delete after use.
import { SiteId } from '@config/environment';
import { UserFactory } from '@providers/user/user-factory';
import { activateFreshAccounts } from '../../tests/setup/account-activation-setup';

async function main() {
    console.log('Generating fresh users...');
    const created = await UserFactory.generateTestUsers([
        { siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 1, registration: true, configLabel: 'NO_PET single-plan (TC-03 camara disponible)' },
        { siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 1, registration: true, configLabel: 'NO_PET single-plan (TC-04 camara no disponible)' },
    ]);
    console.log('Created:', created);

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
