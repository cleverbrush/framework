---
"@cleverbrush/server": patch
"@cleverbrush/knex-schema": patch
"@cleverbrush/scheduler-postgres": patch
---

Build and validate the framework with the pinned TypeScript 7.1 native nightly.
Declare endpoint builder variance so large contracts stay within the native
compiler's instantiation limits, and preserve internal query and scheduler
schema types without changing their runtime behavior.
