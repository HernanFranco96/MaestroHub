# syntax=docker/dockerfile:1

# ---- Stage 1: instalar dependencias de producción ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- Stage 2: imagen final ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Usuario no root
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY app.js ./
COPY src ./src

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "app.js"]
