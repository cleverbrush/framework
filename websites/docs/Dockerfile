# Build stage — builds the framework libs, API docs, and the Next.js website
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./
COPY typedoc.json ./
COPY scripts/ scripts/

# Copy the libraries needed for API docs generation
COPY libs/schema/ libs/schema/
COPY libs/mapper/ libs/mapper/
COPY libs/react-form/ libs/react-form/
COPY libs/async/ libs/async/
COPY libs/deep/ libs/deep/
COPY libs/scheduler/ libs/scheduler/
COPY libs/schema-json/ libs/schema-json/
COPY libs/web/ libs/web/

# Copy the shared package and the docs website
COPY websites/shared/ websites/shared/
COPY websites/docs/ websites/docs/

# Install root workspace dependencies
RUN apk add --no-cache perl bash
RUN npm ci --ignore-scripts

# Build libs required for API docs
RUN cd libs/schema && npm run build
RUN cd libs/mapper && npm run build
RUN cd libs/react-form && npm run build

# Generate API reference docs into websites/docs/public/api-docs/latest/
RUN npm run docs

# Build the Next.js site
WORKDIR /app/websites/docs
RUN npm run build

# Production stage — lightweight Node.js server with Next.js standalone output
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/websites/docs/.next/standalone ./
COPY --from=build /app/websites/docs/.next/static ./websites/docs/.next/static
COPY --from=build /app/websites/docs/public ./websites/docs/public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "websites/docs/server.js"]
