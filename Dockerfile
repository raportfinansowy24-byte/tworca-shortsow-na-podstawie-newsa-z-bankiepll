FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       ffmpeg \
       fontconfig \
       fonts-dejavu-core \
       fonts-liberation \
       gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Stamped by the CI deployment workflow so health checks can prove the running commit.
ARG APP_GIT_SHA=unknown

# This repository tracks bun.lock, not package-lock.json; install from package.json.
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund

COPY . .
RUN npm run lint \
    && npm run build \
    && npm prune --omit=dev \
    && mkdir -p /app/exports /app/temp /app/fonts \
    && chown -R node:node /app

COPY docker/entrypoint.sh /usr/local/bin/app-entrypoint
RUN chmod 0755 /usr/local/bin/app-entrypoint

ENV NODE_ENV=production \
    PORT=8080 \
    APP_GIT_SHA=${APP_GIT_SHA}

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/app-entrypoint"]
