import { expect, type Locator, type Page } from '@playwright/test';
import type { Plan } from '@models/vetify/institutional';

export class PlanCard {
  constructor(
    private readonly plansSection: Locator,
    private readonly page: Page,
    private readonly planName: string,
  ) {}

  get name(): string {
    return this.planName;
  }

  private get root(): Locator {
    return this.plansSection
      .getByRole('heading', { level: 3, name: this.planName, exact: true })
      .locator(
        'xpath=ancestor::div[.//button[contains(normalize-space(.),"Contratar")] and count(.//button)=1][1]',
      );
  }

  async read(): Promise<Plan> {
    const { priceText, features } = await this.root.evaluate(element => {
      const priceText = element.textContent?.match(/([\d.]+)\s*\/mes/i)?.[1] ?? '';
      const features = [...element.querySelectorAll('li')]
        .map(item => item.textContent?.trim())
        .filter((item): item is string => Boolean(item));

      return { priceText, features };
    });

    const price = Number(priceText.replace(/\./g, ''));
    if (!price) {
      throw new Error(`Could not parse price for plan "${this.planName}"`);
    }

    return {
      name: `Vetify ${this.planName}`,
      price,
      features,
    };
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.root.getByRole('heading', { level: 3, name: this.planName, exact: true })).toBeVisible();
  }

  async contract(): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
    await this.root.getByRole('button', { name: /^contratar$/i }).click();
  }
}
