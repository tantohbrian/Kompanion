/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'Core is pure domain logic and must never import from features, ui, or app',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/(features|ui|app)' },
    },
    {
      name: 'features-never-import-each-other',
      comment: 'Feature slices must remain isolated and communicate via store or events',
      severity: 'error',
      from: { path: '^src/features/([^/]+)' },
      to: {
        path: '^src/features/([^/]+)',
        pathNot: '^src/features/$1',
      },
    },
    {
      name: 'ui-is-agnostic',
      comment: 'UI design-system primitives must not depend on features or app shell',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '^src/(features|app)' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
