# Build stage — builds the framework libraries and the Next.js website
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./
COPY typedoc.json ./
COPY scripts/ scripts/

# Copy the libraries the website depends on (schema, mapper, react-form)
COPY libs/schema/ libs/schema/
COPY libs/mapper/ libs/mapper/
COPY libs/react-form/ libs/react-form/

# Copy remaining libs needed for API docs generation
COPY libs/async/ libs/async/
COPY libs/deep/ libs/deep/
COPY libs/scheduler/ libs/scheduler/

# Copy the website app (includes committed versioned docs in public/api-docs/)
COPY examples/website/ examples/website/

# Install root workspace dependencies
RUN apk add --no-cache perl bash
RUN npm ci --ignore-scripts

# Build @cleverbrush/schema (required by mapper and react-form)
RUN cd libs/schema && npm run build

# Build @cleverbrush/mapper
RUN cd libs/mapper && npm run build

# Build @cleverbrush/react-form
RUN cd libs/react-form && npm run build

# Generate API reference docs (latest/) into website/public/api-docs/latest/
RUN npm run docs

# Install website dependencies and build
WORKDIR /app/examples/website
RUN npm install
RUN npm run build

# Production stage — lightweight Node.js server with Next.js standalone output
FROM node:22-alpine

WORKDIR /app

# Copy the self-contained Next.js server and its dependencies
# Standalone output preserves monorepo directory structure
COPY --from=build /app/examples/website/.next/standalone ./
COPY --from=build /app/examples/website/.next/static ./examples/website/.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "examples/website/server.js"]
