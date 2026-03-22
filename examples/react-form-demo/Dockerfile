# Build stage — builds the framework libraries and the demo app
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./

# Copy the libraries the demo depends on (schema, react-form)
COPY libs/schema/ libs/schema/
COPY libs/react-form/ libs/react-form/

# Copy the demo app
COPY examples/react-form-demo/ examples/react-form-demo/

# Install root workspace dependencies
RUN npm ci --ignore-scripts

# Build @cleverbrush/schema (required by react-form)
RUN cd libs/schema && npm run build

# Build @cleverbrush/react-form
RUN cd libs/react-form && npm run build

# Install demo app dependencies and build
WORKDIR /app/examples/react-form-demo
RUN npm install
RUN npm run build

# Production stage — lightweight nginx to serve static files
FROM nginx:alpine

COPY --from=build /app/examples/react-form-demo/dist /usr/share/nginx/html
COPY examples/react-form-demo/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
