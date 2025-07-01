# OpenCupid

The free, open dating application.

## Acknowledgements

Doodle Icons by Khushmeen

https://khushmeen.com/icons.html

## Running tests

Run `scripts/setup-tests.sh` to install dependencies, initialize the test database,
and execute the integration tests located in `apps/backend/src/__integration_tests__`.
If the database isn't reachable, the integration tests are skipped.
After the initial setup you can run `pnpm --filter backend test` to execute unit tests.
