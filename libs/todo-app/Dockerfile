# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including @cleverbrush/* from npm)
RUN npm install --ignore-scripts

# Copy source and build config
COPY tsconfig.build.json tsup.config.ts ./
COPY src/ ./src/

# Build the application
    RUN npm run build
# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="ToDo Management API"
LABEL org.opencontainers.image.description="Production-ready ToDo REST API built with @cleverbrush/* framework"
LABEL org.opencontainers.image.licenses="BSD-3-Clause"

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what is needed at runtime
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/dist/         ./dist/

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
