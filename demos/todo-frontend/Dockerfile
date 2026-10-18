# ── Stage 1: builder ──────────────────────────────────────────────────────────
# Build context must be the monorepo root
FROM node:24-alpine AS builder

WORKDIR /app

# Copy root workspace manifest for dependency resolution
COPY package.json package-lock.json turbo.json tsconfig.json tsconfig.build.json ./

# Copy every workspace manifest so npm ci validates the complete lockfile.
COPY libs/async/package.json ./libs/async/
COPY libs/auth/package.json ./libs/auth/
COPY libs/benchmarks/package.json ./libs/benchmarks/
COPY libs/client/package.json ./libs/client/
COPY libs/deep/package.json ./libs/deep/
COPY libs/di/package.json ./libs/di/
COPY libs/env/package.json ./libs/env/
COPY libs/knex-clickhouse/package.json ./libs/knex-clickhouse/
COPY libs/knex-schema/package.json ./libs/knex-schema/
COPY libs/log/package.json ./libs/log/
COPY libs/mapper/package.json ./libs/mapper/
COPY libs/orm/package.json ./libs/orm/
COPY libs/orm-cli/package.json ./libs/orm-cli/
COPY libs/otel/package.json ./libs/otel/
COPY libs/react-form/package.json ./libs/react-form/
COPY libs/scheduler/package.json ./libs/scheduler/
COPY libs/scheduler-postgres/package.json ./libs/scheduler-postgres/
COPY libs/schema/package.json ./libs/schema/
COPY libs/schema-json/package.json ./libs/schema-json/
COPY libs/server/package.json ./libs/server/
COPY libs/server-integration-tests/package.json ./libs/server-integration-tests/
COPY libs/server-openapi/package.json ./libs/server-openapi/
COPY libs/storage/package.json ./libs/storage/
COPY libs/storage-s3/package.json ./libs/storage-s3/
COPY demos/e2e/package.json ./demos/e2e/
COPY demos/todo-backend/package.json ./demos/todo-backend/
COPY demos/todo-frontend/package.json ./demos/todo-frontend/
COPY websites/docs/package.json ./websites/docs/
COPY websites/schema/package.json ./websites/schema/
COPY websites/shared/package.json ./websites/shared/
COPY scripts/api-docs/package.json ./scripts/api-docs/

# Install workspace dependencies
RUN npm ci --ignore-scripts

# Copy all lib sources (needed for workspace build)
COPY libs/ ./libs/

# Copy backend contract source (resolved by Vite alias at build time)
COPY demos/todo-backend/src/ ./demos/todo-backend/src/
COPY demos/todo-backend/tsconfig.build.json demos/todo-backend/tsup.config.ts ./demos/todo-backend/

# Copy frontend source
COPY demos/todo-frontend/ ./demos/todo-frontend/

# Build the frontend and its workspace dependencies via turbo
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_API_URL=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
RUN npx turbo run build --filter=@cleverbrush/todo-frontend

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="Todo App Frontend"

COPY --from=builder /app/demos/todo-frontend/dist/ /usr/share/nginx/html/
COPY demos/todo-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
