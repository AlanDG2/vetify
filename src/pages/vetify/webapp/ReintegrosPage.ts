import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export class VetifyWebappReintegrosPage extends VetifyWebappLoggedBasePage {
    readonly newReintegroBtn: Locator;
    readonly cuentasDeAcreditacionHeading: Locator;
    readonly misReintegrosHeading: Locator;
    readonly accederAlHistorialBtn: Locator;
    readonly pagadoCountLbl: Locator;
    readonly solicitadoCountLbl: Locator;
    readonly desaprobadoCountLbl: Locator;

    constructor(page: Page) {
        super(page, '/section/myreintegros');

        // .first(): confirmado en vivo 2026-08-30 que hay 2 botones reales "Nuevo reintegro" en
        // paralelo (uno con aria-label, otro con texto plano) -- ambos son puntos de entrada validos
        // al mismo flujo, no un duplicado responsive oculto/visible como en otras pantallas.
        this.newReintegroBtn = page.getByRole('button', { name: 'Nuevo reintegro' }).first();
        this.cuentasDeAcreditacionHeading = page.getByText('Cuentas de acreditación');
        this.misReintegrosHeading = page.getByText('Mis reintegros');
        this.accederAlHistorialBtn = page.getByRole('button', { name: 'Acceder al historial' });
        // Formato real confirmado en vivo 2026-08-30: "Pagado (4)", "Solicitado (1)", "Desaprobado (2)".
        this.pagadoCountLbl = page.getByText(/^Pagado \(\d+\)$/);
        this.solicitadoCountLbl = page.getByText(/^Solicitado \(\d+\)$/);
        this.desaprobadoCountLbl = page.getByText(/^Desaprobado \(\d+\)$/);
    }
}
