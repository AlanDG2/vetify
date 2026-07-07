const { defineConfig, defaultChartsConfig } = require('allure');

const filteredCharts = defaultChartsConfig.filter(
    (chart) =>
        ![
            'statusTransitions',
            'testingPyramid',
            'statusAgePyramid',
            'durationDynamics',
            'durations',
            'stabilityDistribution',
            'coverageDiff',
            'statusDynamics',
            'testBaseGrowthDynamics',
        ].includes(chart.type),
);

function hasProjectEnvironment(parameters = {}, value) {
    const environmentLabel = parameters.labels.find((entry) => entry.name === 'environment');
    return typeof environmentLabel?.value === 'string' && environmentLabel.value.includes(value);
}

module.exports = defineConfig({
    name: 'IKE - Reporte de Pruebas',
    hideLabels: [
        'titlePath',
        'host',
        'thread',
        'language',
        'framework',
        'package',
        'testClass',
        'testMethod',
        'epic',
        'feature',
        'story',
        'tag',
        'owner',
        'lead',
        'issue',
        'tmsLink',
    ],
    plugins: {
        awesome: {
            options: {
                singleFile: false,
                reportLanguage: 'es',
                // Suite-based hierarchy
                groupBy: ['parentSuite', 'suite', 'subSuite'],
                stepTreeExpansion: false,
                charts: filteredCharts,
            },
        },
    },
    environments: {
        desktop: {
            name: 'Desktop',
            matcher: (result) => hasProjectEnvironment(result, 'Desktop'),
        },
        android: {
            name: 'Android',
            matcher: (result) => hasProjectEnvironment(result, 'Android'),
        },
    },
    allowedEnvironments: ['desktop', 'android'],
});
