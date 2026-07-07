import type { Reporter, FullConfig, Suite } from '@playwright/test/reporter';

class PreExecuteReporter implements Reporter {
    onBegin(config: FullConfig, suite: Suite) {
        // Using a standard array to preserve all duplicates
        let allTags: string[] = [];
        const processedParentIds: string[] = [];

        suite
            .allTests()
            .filter((test) => test.expectedStatus !== 'skipped')
            .forEach((test: any) => {
                const currentParent: any | undefined = test.parent;

                allTags = allTags.concat(test._tags as string[]);

                // If there's no parent suite, skip parent-specific processing.
                if (!currentParent) return;

                // Build a stable key for the parent suite so we can skip duplicates.
                // Prefer internal _id when available, otherwise compose from file + title.
                const parentKey = `${currentParent._fileId}::${currentParent.location.line}::${currentParent.location.column}`;

                if (parentKey && processedParentIds.includes(parentKey)) return;

                // Concat the describe tags from this suite and all ancestor suites,
                // but skip ancestors already processed.
                let ancestor = currentParent;
                while (ancestor) {
                    const ancestorKey = `${ancestor._fileId ?? ancestor._id ?? 'unknown'}::${ancestor.location?.line ?? ''}::${ancestor.location?.column ?? ''}`;
                    if (ancestorKey && processedParentIds.includes(ancestorKey)) {
                        ancestor = ancestor.parent;
                        continue;
                    }

                    if (ancestor._tags) {
                        allTags = allTags.concat(ancestor._tags);
                    }

                    processedParentIds.push(ancestorKey);
                    ancestor = ancestor.parent;
                }
            });

        console.log(JSON.stringify(allTags, null, 2));
    }
}

export default PreExecuteReporter;
