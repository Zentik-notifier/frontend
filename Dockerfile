# syntax=docker/dockerfile:1

FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html
# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expect local PWA build to be provided at build time
COPY PWA/ ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]