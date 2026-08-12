import type {} from '@wdio/types';

// Config común a Android e iOS. wdio.android.conf.ts / wdio.ios.conf.ts hacen
// spread de esto y solo agregan `capabilities` + `services` específicos de plataforma.
export const sharedConfig: Omit<WebdriverIO.Config, 'capabilities'> = {
    runner: 'local',
    specs: ['../specs/**/*.spec.ts'],
    exclude: [],
    maxInstances: 1,
    logLevel: 'info',
    bail: 0,
    waitforTimeout: 30_000,
    connectionRetryTimeout: 120_000,
    connectionRetryCount: 3,
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 120_000,
    },
    reporters: [
        'spec',
        [
            'allure',
            {
                outputDir: 'allure-results-mobile',
                disableWebdriverStepsReporting: false,
                disableWebdriverScreenshotsReporting: false,
            },
        ],
    ],
};
