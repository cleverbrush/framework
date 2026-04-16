# ── Stage 1: builder ──────────────────────────────────────────────────────────
# Build context must be the monorepo root
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifest for npm workspaces resolution
COPY package.json package-lock.json* ./

# Copy shared package (source-only, no build needed)
COPY demos/todo-shared/ ./demos/todo-shared/

# Copy backend package
COPY demos/todo-backend/package.json ./demos/todo-backend/

# Install all workspace dependencies
RUN npm install --ignore-scripts --workspace=demos/todo-backend

# Copy backend source and build config
COPY demos/todo-backend/tsconfig.build.json demos/todo-backend/tsup.config.ts ./demos/todo-backend/
COPY demos/todo-backend/src/ ./demos/todo-backend/src/

# Build the application
RUN npm run build --workspace=demos/todo-backend
# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="ToDo Management API"
LABEL org.opencontainers.image.description="Production-ready ToDo REST API built with @cleverbrush/* framework"
LABEL org.opencontainers.image.licenses="BSD-3-Clause"

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what is needed at runtime
# Root node_modules contains hoisted workspace dependencies (e.g. knex)
COPY --from=builder /app/node_modules/                    ./node_modules/
COPY --from=builder /app/demos/todo-backend/node_modules/ ./node_modules/
COPY --from=builder /app/demos/todo-backend/dist/         ./dist/

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
