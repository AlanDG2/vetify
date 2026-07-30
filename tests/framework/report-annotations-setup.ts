import { type TestInfo } from '@playwright/test';
import { description, displayName, label, parentSuite, Severity, severity, subSuite, suite } from 'allure-js-commons';

type AllureCaseDetails = {
    preconditions: string[];
    steps: string[];
    expectedResult: string[];
};

function getSiteNameFromFile(testInfo: TestInfo): string {
    return testInfo.project.name.replace(/\s+\S+$/, '') || 'General';
}

export async function setAllureDetails(details: AllureCaseDetails): Promise<void> {
    const preconditionsText = details.preconditions.map((item) => `- ${item}`).join('\n');
    const stepsText = details.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
    const expectedResultText = details.expectedResult.map((item) => `- ${item}`).join('\n');
    const divider = '\n---\n';

    await description(`Precondiciones:\n${preconditionsText}\n${divider}\nPasos:\n${stepsText}\n${divider}\nResultado Esperado:\n${expectedResultText}`);
}

export async function allureAnnotations(testInfo: TestInfo): Promise<void> {
    const testTags = testInfo.tags || [];
    const isCritical = testTags.includes('@critical');
    const environment = /android/i.test(testInfo.project.name) ? 'Android' : 'Desktop';
    const parentSuiteName = getSiteNameFromFile(testInfo);
    const suiteName = testInfo.titlePath[1] || 'Test Suite';
    const subSuiteName = testInfo.titlePath[2] || 'General';
    await label('environment', environment);
    await severity(isCritical ? Severity.CRITICAL : Severity.NORMAL);
    await parentSuite(parentSuiteName);
    await suite(suiteName);
    await subSuite(subSuiteName);
    await displayName(testInfo.title);
}
