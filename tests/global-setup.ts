import { UserFactory } from '@providers/user/user-factory';
import { setupGeneralCookiesStorageState } from './setup/cookies-setup';
import { activateFreshAccounts } from './setup/account-activation-setup';

export default async function globalSetup() {
    console.log('==================== Global Setup ====================');
    console.log('> Setting up general cookies storage state');
    await setupGeneralCookiesStorageState();
    console.log('  - Done ✅');

    console.log('> Fresh accounts activation');
    await activateFreshAccounts();
    console.log('  - Done ✅');

    // Reset the state of the UserFactory to ensure a clean slate for user reservations
    console.log('> Reset UserFactory state...');
    UserFactory.resetState();
    console.log('  - Done ✅');
    console.log('=======================================================');
}
