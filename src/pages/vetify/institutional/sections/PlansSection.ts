import { type Page } from '@playwright/test';
import type { Plan } from '@models/vetify/institutional';
import { PlanCard } from '../components/PlanCard';
import { BaseSection } from '../components/BaseSection';

export class PlansSection extends BaseSection {
    constructor(page: Page) {
        super(page, page.locator('section#planes'));
    }

    async expectLoaded(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async scrollIntoView(): Promise<void> {
        await this.root.scrollIntoViewIfNeeded();
    }

    plan(planName: string): PlanCard {
        return new PlanCard(this.root, this.page, planName);
    }

    async getPlanNames(): Promise<string[]> {
        const names = await this.root.getByRole('heading', { level: 3 }).allTextContents();
        return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    }

    async getAllPlans(): Promise<PlanCard[]> {
        const names = await this.getPlanNames();
        return names.map((name) => this.plan(name));
    }

    async contractRandomPlan(): Promise<Plan> {
        const plans = await this.getAllPlans();
        const selected = plans[Math.floor(Math.random() * plans.length)];
        const plan = await selected.read();
        await selected.contract();
        await this.page.waitForURL(/\/checkout\/form$/);
        return plan;
    }
}
