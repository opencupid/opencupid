# AGENTS.md

## Project structure

### Frontend:

- apps/frontend

  * Stack: Vue3, Pinia stores, Bootstrap 5, SCSS
  * directory tree follows a feature based structure under `apps/frontend/features`

### Backend API:

- Subdirectory: `apps/backend`
- Runtime configuration schema lives in `apps/backend/lib/appConfig.ts`, this defines the configuration format of the `.env` files.  All new configuration variables must be added to this file, as well as to `/.env.example` documenting the full set of variables required to run the backend.

## Tests

Full test suite. Use this whilst working on a task.
```
pnpm test
```

Full CI suite (install, prisma generate, lint, test, type-check). This is expensive to run and takes a long time, run this only near/after completing a task and when `pnpm test` does not fail.
```
pnpm run ci:test
```

Run with coverage:
```
pnpm run test:coverage
```

Run build and type check:
```
pnpm build
```

* All completed work must pass full test suite
* For all new frontend components, API routes and services test files must be added in the `__tests__` subdirectory closest to the new file or existing file being modified
* Format new code using `prettier --write`. Never reformat existing code that is not in the current change set.
* From the package root you can just call `pnpm test`. The commit should pass all tests before you merge.
* To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`.
* Fix any test or type errors until the whole suite is green.
* After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure ESLint and TypeScript rules still pass.
* Add or update tests for the code you change, even if nobody asked.

