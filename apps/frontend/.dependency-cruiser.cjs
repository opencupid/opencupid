/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig[.]json$',
          '(^|/)(?:babel|webpack)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$',
        ],
      },
      to: {},
    },
    {
      name: 'no-cross-feature-imports',
      severity: 'error',
      comment: 'Features must not import from each other directly.',
      from: { path: '^features/([^/]+)/' },
      to: {
        path: '^features/([^/]+)/',
        pathNot: '^features/\\1/',
      },
    },
    {
      name: 'no-legacy-components',
      severity: 'warn',
      comment: 'Do not import from src/components/, use shared modules instead.',
      from: {},
      to: { path: '^components/' },
    },
    {
      name: 'composables-in-shared',
      severity: 'warn',
      comment: 'All composables should live under features/shared/composables/',
      from: {},
      to: { path: 'components/.*/composables/' },
    },
    {
      name: 'allow-shared-access',
      severity: 'info',
      comment: 'Features are allowed to import from features/shared.',
      from: { path: '^features/[^/]+/' },
      to: { path: '^features/shared/' },
    },
    // ... (other forbidden rules)
  ],

  options: {
    doNotFollow: {
      path: ['node_modules'],
    },
    exclude: {
      path: ['assets/', 'node_modules|\\.test\\.|\\.spec\\.|\\.d\\.ts'],
    },
    enhancedResolveOptions: {
      extensions: ['.js', '.ts', '.vue'],
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    tsPreCompilationDeps: true,
    skipAnalysisNotInRules: true,
    tsConfig: {
      fileName: 'tsconfig.app.json',
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',
      },
      archi: {
        collapsePattern:
          '^(?:packages|src|lib(s?)|app(s?)|bin|test(s?)|spec(s?))/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
