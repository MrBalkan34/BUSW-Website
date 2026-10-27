# Balkan Universal Account server, with the web app it serves. UNTESTED: written without Docker available.
# Build from the repository root:   docker build -f deploy/Dockerfile -t bu-account .

# ---- 1. build the web app (builder, account pages, dashboard, administration)
FROM node:24-slim AS web
WORKDIR /app/apps/website-builder
COPY apps/website-builder/package.json apps/website-builder/package-lock.json ./
RUN npm ci
COPY apps/website-builder/ ./
RUN npm run build

# ---- 2. the server
FROM node:24-slim
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=8787
WORKDIR /app

# The server imports the builder's validators and pricing from its source, so that source (and the builder's runtime
# dependencies, which its i18n code needs) travel with it. This keeps prices and validation identical in both.
COPY apps/website-builder/package.json apps/website-builder/package-lock.json apps/website-builder/
RUN cd apps/website-builder && npm ci --omit=dev
COPY apps/website-builder/src apps/website-builder/src

COPY apps/server/package.json apps/server/package-lock.json apps/server/
RUN cd apps/server && npm ci --omit=dev
COPY apps/server/src apps/server/src
COPY apps/server/tsconfig.json apps/server/

COPY --from=web /app/apps/website-builder/dist apps/website-builder/dist

# Everything the server stores (database, private images) lives in /data. Mount a persistent volume there.
RUN mkdir -p /data && chown -R node:node /data /app
VOLUME /data
USER node
WORKDIR /app/apps/server
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/index.ts"]
