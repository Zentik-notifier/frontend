# --- Builder: create static PWA inside container ---
FROM node:22-alpine AS builder
WORKDIR /app
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NO_CACHE=1
ENV NODE_ENV=production
COPY package*.json ./
COPY .npmrc ./.npmrc
# Install all deps (including dev for build tools like workbox-cli)
RUN npm ci || npm install
COPY . .
# Clear Metro bundler cache before building
RUN rm -rf .expo node_modules/.cache
# Build static web output in dist/
RUN npm run build:web

FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]