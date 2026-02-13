This is a monorepo consiting of 2 main apps where development is ongoing: apps/backend (API, Node.j, Fastify) and apps/frontend (UI). 

The frontend is a Vue.js application that interacts with the backend API. The codebase uses TypeScript and Zod for type safety and validation.

Shared libraries and utilities are located in the packages/shared directory, this is where Zod schemas and DTOs are defined. Localization files live in packages/shared/i18n directory. The project aims to be fully localized.
