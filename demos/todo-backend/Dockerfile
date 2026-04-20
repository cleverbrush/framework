# ── Stage 1: builder ──────────────────────────────────────────────────────────
# Build context must be the monorepo root
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifest for npm workspaces resolution
COPY package.json package-lock.json* turbo.json tsconfig.build.json ./

# Copy all workspace package.json files for dependency resolution
COPY libs/async/package.json ./libs/async/
COPY libs/auth/package.json ./libs/auth/
COPY libs/deep/package.json ./libs/deep/
COPY libs/di/package.json ./libs/di/
COPY libs/env/package.json ./libs/env/
COPY libs/knex-clickhouse/package.json ./libs/knex-clickhouse/
COPY libs/knex-schema/package.json ./libs/knex-schema/
COPY libs/log/package.json ./libs/log/
COPY libs/mapper/package.json ./libs/mapper/
COPY libs/react-form/package.json ./libs/react-form/
COPY libs/schema/package.json ./libs/schema/
COPY libs/schema-json/package.json ./libs/schema-json/
COPY libs/scheduler/package.json ./libs/scheduler/
COPY libs/server/package.json ./libs/server/
COPY libs/server-openapi/package.json ./libs/server-openapi/
COPY libs/client/package.json ./libs/client/
COPY libs/benchmarks/package.json ./libs/benchmarks/
COPY demos/todo-backend/package.json ./demos/todo-backend/

# Install all workspace dependencies
RUN npm install --ignore-scripts

# Copy all lib sources (needed for workspace build)
COPY libs/ ./libs/

# Copy backend source and build config
COPY demos/todo-backend/tsconfig.build.json demos/todo-backend/tsup.config.ts ./demos/todo-backend/
COPY demos/todo-backend/src/ ./demos/todo-backend/src/

# Build the backend and its workspace dependencies via turbo
RUN npx turbo run build --filter=@cleverbrush/todo-backend

# Prepare a flat node_modules for the runtime stage:
# - dereference symlinks so workspace packages become real copies
# - remove @cleverbrush/* since they are bundled by tsup (noExternal)
RUN cp -rL /app/node_modules /app/runtime_modules && \
    rm -rf /app/runtime_modules/@cleverbrush
# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="ToDo Management API"
LABEL org.opencontainers.image.description="Production-ready ToDo REST API built with @cleverbrush/* framework"
LABEL org.opencontainers.image.licenses="BSD-3-Clause"

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what is needed at runtime
# @cleverbrush/* packages are bundled by tsup (noExternal), so only
# third-party deps (knex, pg, google-auth-library, etc.) are needed.
COPY --from=builder /app/runtime_modules/ ./node_modules/
COPY --from=builder /app/demos/todo-backend/dist/ ./dist/

# Create logs directory for file sink
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
