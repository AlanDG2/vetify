// Temporary standalone script (not part of the test suite) — provisiona una cuenta REGISTERED
// genuina para TS-03 "Asociación de Compra con Usuario" (tests/projects/vetify-b2c/purchase-flow.spec.ts).
// La única cuenta REGISTERED preexistente en el pool tiene identification:null en el backend real
// (nunca completó `validatePolicy()` con éxito) — ver qa-workspace/decision-log.md 2026-08-14.
// Delete after use.
import { SiteId } from '@config/environment';
import { UserFactory } from '@providers/user/user-factory';
import { activateFreshAccounts } from '../../tests/setup/account-activation-setup';

async function main() {
    console.log('Generating fresh user (REGISTERED, para TS-03)...');
    const created = await UserFactory.generateTestUsers([{ siteId: SiteId.VETIFY_ADQUIRENTE, numberOfPlans: 1, registration: true, configLabel: 'REGISTERED account for TS-03 (Asociación de Compra)' }]);
    console.log('Created:', created);

    // IMP-004: validar la póliza inmediatamente después de la compra falla porque el backend
    // todavía no vinculó la compra a la identidad — hace falta esperar la propagación real antes
    // de llamar a activateFreshAccounts() (que hace register + validatePolicy).
    const waitMinutes = 15;
    console.log(`Waiting ${waitMinutes} minutes for QA backend propagation before validating policy...`);
    await new Promise((resolve) => setTimeout(resolve, waitMinutes * 60_000));

    console.log('Activating fresh account (register + validate policy)...');
    await activateFreshAccounts();

    const accounts = UserFactory.getFreshAccounts();
    console.log('Fresh accounts after activation:');
    for (const acc of accounts) {
        console.log(`  ${acc.email} | plans=${acc.numberOfPlans} | tags=${acc.tags.join(',')} | identification=${JSON.stringify(acc.identification)}`);
    }
}

main().catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
});
