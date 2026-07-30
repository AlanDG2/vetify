import type { FullConfig, Reporter, Suite } from '@playwright/test/reporter';

class PreExecuteReporter implements Reporter {
    onBegin(config: FullConfig, suite: Suite) {
        // Using a standard array to preserve all duplicates
        let allTags: string[] = [];
        const processedTests: Set<string> = new Set();
        const processedAncestors: Set<string> = new Set();

        suite
            .allTests()
            .filter((test) => test.expectedStatus !== 'skipped')
            .forEach((test: any) => {
                // Phase 1: Process test-level tags (avoid test duplication)
                const testKey = `${test._fileId}::${test.location?.line || 0}::${test.location?.column || 0}`;
                if (!processedTests.has(testKey)) {
                    allTags = allTags.concat((test._tags as string[]).filter((tag) => tag !== '@critical'));
                    processedTests.add(testKey);
                }

                // Phase 2: Process ancestor chains per test
                // Let each test walk its own ancestor chain, collecting tags from ancestors not yet processed.
                // To handle same-named describe blocks in different files, we include the file path in the key.
                let ancestor = test.parent;
                while (ancestor) {
                    // Find the file path ancestor to distinguish between same describe blocks in different projects
                    let filePath = '';
                    let ancestorForFilePath = ancestor;
                    while (ancestorForFilePath) {
                        if (ancestorForFilePath.title && ancestorForFilePath.title.includes('projects/')) {
                            filePath = ancestorForFilePath.title;
                            break;
                        }
                        ancestorForFilePath = ancestorForFilePath.parent;
                    }

                    // Build a unique key: file path + ancestor location
                    const ancestorKey = `${filePath}::${ancestor._fileId}::${ancestor.location?.line || 0}::${ancestor.location?.column || 0}`;

                    // Only collect tags from this ancestor node if we haven't processed it before
                    if (!processedAncestors.has(ancestorKey)) {
                        // Collect tags from ancestor, filtering out @critical
                        if (ancestor._tags && (ancestor._tags as string[]).length > 0) {
                            const ancestorTags = (ancestor._tags as string[]).filter((tag) => tag !== '@critical');
                            allTags = allTags.concat(ancestorTags);
                        }

                        processedAncestors.add(ancestorKey);
                    }

                    ancestor = ancestor.parent;
                }
            });

        console.log(JSON.stringify(allTags, null, 2));
    }
}

export default PreExecuteReporter;
