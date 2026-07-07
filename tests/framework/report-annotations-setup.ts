import path from 'node:path';
import { description, displayName, label, parentSuite, Severity, severity, subSuite, suite } from 'allure-js-commons';
import { type TestInfo } from '@playwright/test';
import { toTitleCase } from '@helpers/automation-utils';

type AllureCaseDetails = {
    preconditions: string[];
    steps: string[];
    expectedResult: string[];
};

function normalizeName(value: string): string {
    return toTitleCase(
        value
            .replace(/\.spec$/i, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
    );
}

function getSiteNameFromFile(filePath: string): string {
    const testsRoot = path.join(process.cwd(), 'tests');
    const relative = path.relative(testsRoot, filePath);
    const [siteSegment] = relative.split(path.sep);

    if (!siteSegment || siteSegment.startsWith('..')) {
        return 'E2E';
    }

    return normalizeName(siteSegment) || 'E2E';
}

function getSuiteNameFromFile(testInfo: TestInfo): string {
    return testInfo.project.name.replace(/\s+\S+$/, '') || 'General';
}

export async function setAllureDetails(details: AllureCaseDetails): Promise<void> {
    const preconditionsText = details.preconditions.map((item) => `- ${item}`).join('\n');
    const stepsText = details.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
    const expectedResultText = details.expectedResult.map((item) => `- ${item}`).join('\n');
    const divider = '\n---\n';

    await description(`Preconditions:\n${preconditionsText}\n${divider}\nSteps:\n${stepsText}\n${divider}\nExpected Result:\n${expectedResultText}`);
}

export async function allureAnnotations(testInfo: TestInfo): Promise<void> {
    const testTags = testInfo.tags || [];
    const isCritical = testTags.includes('@critical');
    const tsSuite = testInfo.titlePath[2] || 'General';
    const suiteName = getSuiteNameFromFile(testInfo);
    const siteName = getSiteNameFromFile(testInfo.file);
    const environment = /android/i.test(testInfo.project.name) ? 'Android' : 'Desktop';

    await label('environment', environment);
    await severity(isCritical ? Severity.CRITICAL : Severity.NORMAL);
    await parentSuite(siteName);
    await suite(suiteName);
    await subSuite(tsSuite);
    await displayName(testInfo.title);
}
