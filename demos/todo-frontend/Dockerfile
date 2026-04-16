# ── Stage 1: builder ──────────────────────────────────────────────────────────
# Build context must be the monorepo root
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifest for dependency resolution
COPY package.json package-lock.json* ./

# Copy backend contract source (resolved by Vite alias at build time)
COPY demos/todo-backend/package.json ./demos/todo-backend/
COPY demos/todo-backend/src/ ./demos/todo-backend/src/

# Copy frontend package manifest
COPY demos/todo-frontend/package.json ./demos/todo-frontend/

# Install workspace dependencies
RUN npm install --ignore-scripts --workspace=demos/todo-frontend

# Copy frontend source
COPY demos/todo-frontend/ ./demos/todo-frontend/

# Build the Vite app
RUN npm run build --workspace=demos/todo-frontend

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="Todo App Frontend"

COPY --from=builder /app/demos/todo-frontend/dist/ /usr/share/nginx/html/
COPY demos/todo-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
