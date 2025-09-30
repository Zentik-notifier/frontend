# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install

FROM node:22-alpine AS builder
WORKDIR /app
ENV EXPO_NO_TELEMETRY=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Export static web build to dist
RUN npm run export:web

FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html
# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]