# syntax=docker/dockerfile:1

# ---- Stage 1: dependencias (reutilizada también en desarrollo) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- Stage 2: build de la SPA ----
FROM deps AS build
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY . .
RUN npm run build

# ---- Stage 2: servir con Nginx ----
FROM nginx:1.27-alpine AS runner

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
