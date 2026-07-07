import { type Locator } from '@playwright/test';
import type { Plan } from '@models/vetify/institutional';

export class PlanCard {
    readonly container: Locator;
    readonly planIndex: number;

    readonly titleLbl: Locator;
    readonly priceLbl: Locator;
    readonly buyBtn: Locator;

    constructor(root: Locator, planIndex: number) {
        this.container = root;
        this.planIndex = planIndex;
        this.titleLbl = this.container.getByRole('heading', { level: 3 });
        this.priceLbl = this.container.locator('//div[contains(@class, "_price")]').first();
        this.buyBtn = this.container.getByRole('button', { name: 'CONTRATAR' });
    }

    async parseContent(): Promise<Plan> {
        const name = await this.titleLbl.innerText();
        const priceTxt = await this.priceLbl.innerText();
        return {
            name,
            price: Number(priceTxt.replace(/[^\d.]/g, '').replace(/\./g, '')),
            features: [],
        };
    }

    async contract(): Promise<void> {
        await this.container.scrollIntoViewIfNeeded();
        await this.buyBtn.click();
    }
}
