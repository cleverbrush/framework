# Build stage — builds the schema libraries and the Next.js website
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./
COPY scripts/ scripts/

# Copy the libraries the schema site depends on
COPY libs/schema/ libs/schema/
COPY libs/mapper/ libs/mapper/
COPY libs/deep/ libs/deep/
COPY libs/async/ libs/async/

# Copy the shared package and the schema website
COPY websites/shared/ websites/shared/
COPY websites/schema/ websites/schema/

# Copy data files needed at build time
COPY bench-results.json ./
COPY bundle-sizes.json ./

# Install root workspace dependencies
RUN apk add --no-cache perl bash
RUN npm ci --ignore-scripts

# Build @cleverbrush/schema (required by mapper and playground)
RUN cd libs/schema && npm run build

# Build @cleverbrush/mapper
RUN cd libs/mapper && npm run build

# Generate playground bundles and declarations
WORKDIR /app/websites/schema
RUN node ../../scripts/build-playground-bundle.js && node ../../scripts/generate-playground-declarations.js

# Build the Next.js site
RUN npm run build

# Production stage — lightweight Node.js server with Next.js standalone output
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/websites/schema/.next/standalone ./
COPY --from=build /app/websites/schema/.next/static ./websites/schema/.next/static
COPY --from=build /app/websites/schema/public ./websites/schema/public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "websites/schema/server.js"]
