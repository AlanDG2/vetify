import type { Plan } from '@models/vetify/institutional';
import { Locator, type Page } from '@playwright/test';
import { BaseSection } from '../components/BaseSection';
import { PlanCard } from '../components/PlanCard';

export class PlansSection extends BaseSection {
    readonly _planItemList: Locator;
    constructor(page: Page) {
        super(page, page.locator('section#planes'));

        this._planItemList = this.root.locator('div.container > div > div');
    }

    async expectLoaded(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async scrollIntoView(): Promise<void> {
        await this.root.scrollIntoViewIfNeeded();
    }

    plan(parent: Locator, index: number): PlanCard {
        return new PlanCard(parent, index);
    }

    async getPlanNames(): Promise<string[]> {
        const planItemList = await this._planItemList.all();

        for await (const p of planItemList) {
            console.log(await p.innerText());
        }

        const names = await this.root.getByRole('heading', { level: 3 }).allTextContents();
        return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    }

    async getAllPlans(): Promise<PlanCard[]> {
        const planItemList = await this._planItemList.all();
        return planItemList.map((item, index) => this.plan(item, index));
    }

    async contractRandomPlan(): Promise<Plan> {
        const plans = await this.getAllPlans();
        const selected = plans[Math.floor(Math.random() * plans.length)];
        const plan = await selected.parseContent();
        await selected.contract();
        await this.page.waitForURL(/\/checkout\/form\?from=osde$/);
        return plan;
    }
}
