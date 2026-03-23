# Cleverbrush Libs Website

The official documentation website for the Cleverbrush open-source TypeScript libraries:

- **@cleverbrush/schema** — Immutable, composable schema definitions with built-in validation
- **@cleverbrush/mapper** — Type-safe object mapping between schemas
- **@cleverbrush/react-form** — Headless, schema-driven React forms

Built with [Next.js](https://nextjs.org/).

## Prerequisites

Build the framework libraries first (from the repository root):

```bash
npm install
npm run build_schema
npm run build_mapper
npm run build_react-form
```

## Development

```bash
cd examples/website
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

```bash
npm run build
npm run start
```

## Docker

Build and run from the repository root:

```bash
docker build -f examples/website/Dockerfile -t cleverbrush-website .
docker run -p 3000:3000 cleverbrush-website
```
