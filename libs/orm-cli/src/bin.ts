// @cleverbrush/orm-cli — bin entry point
//
// Node runs this file directly (#!/usr/bin/env node).
// We register tsx's ESM hook FIRST so that any subsequent dynamic `import()`
// call — including the user's `db.config.ts` — is handled by tsx.
//
// tsx/esm/api uses Node's `module.register()` API (Node 18.19+ / 20.6+).

import { register } from 'tsx/esm/api';

register();

// Now safe to import CLI logic (which will in turn import user TS config files)
const { run } = await import('./cli.js');
await run(process.argv.slice(2));
