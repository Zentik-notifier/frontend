# syntax=docker/dockerfile:1

# --- Builder: create static PWA inside container ---
FROM node:22-alpine AS builder
WORKDIR /app
ENV EXPO_NO_TELEMETRY=1
COPY package*.json ./
COPY .npmrc ./.npmrc
# Install all deps (including dev for build tools like workbox-cli)
RUN npm ci || npm install
COPY . .
# Build static web output in dist/
RUN npm run build:web

# --- Runtime: serve with nginx ---
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html
# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built site from builder
COPY --from=builder /app/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]