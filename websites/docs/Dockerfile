# Build stage — builds the framework libs, API docs, and the Next.js website
FROM node:24-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./
COPY typedoc.json tsconfig.json tsconfig.build.json turbo.json ./
COPY README.md LICENSE SECURITY.md ./
COPY docs/ docs/
COPY .changeset/ .changeset/
COPY scripts/ scripts/

# Include every workspace so npm ci and TypeDoc see the complete monorepo.
COPY libs/ libs/
COPY demos/ demos/
COPY websites/ websites/

# Install root workspace dependencies
RUN apk add --no-cache perl bash
RUN npm ci --ignore-scripts

# Build all published libraries in dependency order, excluding demo apps.
RUN npx turbo run build --filter='./libs/*'

# Generate API reference docs into websites/docs/public/api-docs/latest/
RUN npm run docs

# Build the Next.js site
WORKDIR /app/websites/docs
RUN npm run build

# Production stage — lightweight Node.js server with Next.js standalone output
FROM node:24-alpine

WORKDIR /app

COPY --from=build /app/websites/docs/.next/standalone ./
COPY --from=build /app/websites/docs/.next/static ./websites/docs/.next/static
COPY --from=build /app/websites/docs/public ./websites/docs/public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "websites/docs/server.js"]
