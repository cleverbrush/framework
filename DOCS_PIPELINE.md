# API Documentation Pipeline

## Overview

API reference docs are generated with [TypeDoc](https://typedoc.org/) (v0.28) from TSDoc comments in the source code. The output lives in `website/public/api-docs/` and is served as static files by the Next.js website.

```
website/public/api-docs/
  index.html        ← version picker page (committed)
  versions.json     ← version manifest (committed)
  latest/           ← always regenerated, gitignored
  v1.1.10/          ← committed snapshot
  v1.2.0/           ← committed snapshot (example)
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run docs` | Generate latest docs + inject GTM |
| `npm run docs:snapshot` | Snapshot latest → `v{version}/`, update picker |
| `VERSION=1.2.3 npm run docs:snapshot` | Snapshot with explicit version |

## Day-to-Day Workflow

### Regenerate docs after code changes

```bash
npm run docs
```

This runs TypeDoc → `website/public/api-docs/latest/`, then `scripts/inject-gtm.sh` adds Google Tag Manager to all HTML files. The `latest/` directory is gitignored and always regenerated fresh.

### Snapshot docs for a release

After bumping the version in root `package.json`:

```bash
npm run docs            # regenerate latest
npm run docs:snapshot   # copies latest/ → v{version}/, updates picker
git add website/public/api-docs/
git commit -m "docs: snapshot v1.2.0 API reference"
```

The snapshot script:
1. Copies `latest/` → `v{version}/`
2. Rebuilds `versions.json` from existing `v*/` directories
3. Regenerates `index.html` (version picker page with GTM)
4. Refuses to overwrite an existing snapshot (delete first if intentional)

### Historical versions with different packages

If a past version had fewer packages (e.g., v1.1.10 had no mapper/react-form), generate it with a custom config:

```bash
npx typedoc --options typedoc.custom.json
./scripts/inject-gtm.sh website/public/api-docs/v1.1.10
```

## Key Files

| File | Role |
|------|------|
| `typedoc.json` | Root TypeDoc config: entry points, output dir, nav links |
| `libs/*/typedoc.json` | Per-package TypeDoc config (entry points, excludePrivate) |
| `scripts/inject-gtm.sh` | Injects GTM-WRLXDMG into all HTML files in a directory |
| `scripts/snapshot-docs.sh` | Snapshots latest docs as a versioned release |
| `.gitignore` | Ignores `website/public/api-docs/latest` only |

## How It All Fits Together

1. **TSDoc comments** in source → TypeDoc reads them
2. **TypeDoc** generates static HTML into `website/public/api-docs/latest/`
3. **inject-gtm.sh** adds GTM tracking to every HTML page (idempotent, skips already-injected files)
4. **Next.js** serves `public/api-docs/` as static files
5. **next.config.ts** has redirects: `/api-docs` → `/api-docs/index.html`, `/api-docs/latest` → `/api-docs/latest/index.html`
6. **Navbar** links to `/api-docs` (the version picker)
7. **TypeDoc header** has "← Back to Website" and "All Versions" nav links

## Adding a New Library to Docs

1. Create `libs/newlib/typedoc.json`:
   ```json
   {
       "$schema": "https://typedoc.org/schema.json",
       "entryPoints": ["src/index.ts"],
       "excludePrivate": true
   }
   ```
2. Add `"libs/newlib"` to the `entryPoints` array in root `typedoc.json`
3. Run `npm run docs` to verify

## Docker Build

The `website/Dockerfile` handles docs generation in the build stage:
- Copies `scripts/`, `typedoc.json`, and all `libs/`
- Installs `perl` and `bash` (needed by inject-gtm.sh on Alpine)
- Runs `npm run docs` to generate latest docs
- Committed versioned snapshots (`v*/`) come in via the website COPY step

## GTM Tracking

All API docs pages include Google Tag Manager (`GTM-WRLXDMG`). The `inject-gtm.sh` script adds:
- **Head snippet**: GTM loader script before `</head>`
- **Body snippet**: `<noscript>` iframe after `<body>`

The script is idempotent — safe to run multiple times on the same directory. To use a different GTM ID:

```bash
./scripts/inject-gtm.sh website/public/api-docs/latest CUSTOM-GTM-ID
```
