# syntax=docker/dockerfile:1
# Production image: builds the app and runs the standalone Node server.
#
#   docker build -t google-nfc-connect .
#   docker run --env-file .env -p 3000:3000 -v nfc-storage:/app/storage google-nfc-connect
#
# Pending database migrations run on start (set RUN_MIGRATIONS=false to skip).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    STORAGE_DIR=/app/storage \
    RUN_MIGRATIONS=true
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY start.mjs ./
COPY scripts ./scripts
COPY db/migrations ./db/migrations
RUN mkdir -p /app/storage && chown -R node:node /app/storage
USER node
EXPOSE 3000
VOLUME ["/app/storage"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" != \"false\" ]; then node scripts/migrate.mjs || exit 1; fi; exec node start.mjs"]
