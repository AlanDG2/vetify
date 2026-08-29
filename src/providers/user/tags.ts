/**
 * Standard tags for categorizing and filtering test users.
 *
 * Tests can request users with specific tags:
 * UserProvider.getUser({ source: UserSource.Pooled, siteId: SiteId.VETIFY_ADQUIRENTE, tags: [UserTag.VERIFIED] })
 */
export enum UserTag {
    /** Error on account registration/activation */
    ERROR = 'ERROR',

    /** User email has been verified */
    VERIFIED = 'VERIFIED',

    /** User has completed registration */
    REGISTERED = 'REGISTERED',

    /** User has not completed registration */
    UNREGISTERED = 'UNREGISTERED',

    /** User has completed registration but has not activated their plan */
    PENDING_ACTIVATION = 'PENDING_ACTIVATION',

    /** User has completed registration and has a valid plan */
    ACTIVE = 'ACTIVE',

    /** User has completed registration but does not have a valid plan */
    NO_PLAN = 'NO_PLAN',

    /** User has completed registration and has a valid plan, but the plan is not active */
    INACTIVE_PLAN = 'INACTIVE_PLAN',

    /** User has completed registration and has a valid plan, but the plan does not have a pet associated */
    PLAN_WITHOUT_PET = 'PLAN_WITHOUT_PET',

    /** All the plans have one pet associated */
    NO_EMPTY_PLAN = 'NO_EMPTY_PLAN',

    /** User doesn't have a pet associated with any plan */
    NO_PET = 'NO_PET',

    /** User has a pet associated with at least one plan */
    WITH_PET = 'WITH_PET',

    /**
     * Account's email is a real, monitored mailbox (IMAP, ver EmailClient/TEST_MAILBOX_* en .env) —
     * a diferencia de los emails sintéticos `user_<timestamp>@automation.com`, que nunca reciben
     * correo real. Solo debería haber 1-2 cuentas con este tag: la casilla real monitoreada hoy es
     * una sola (IMP-006). Usar `reserve: true` (default) al pedir esta cuenta — mutar su contraseña
     * de verdad requiere exclusividad, no compartirla con otro test en paralelo.
     */
    REAL_EMAIL = 'REAL_EMAIL',
}
