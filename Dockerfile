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

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run lint \
    && npm run build \
    && npm prune --omit=dev \
    && mkdir -p /app/exports /app/temp /app/fonts \
    && chown -R node:node /app

COPY docker/entrypoint.sh /usr/local/bin/app-entrypoint
RUN chmod 0755 /usr/local/bin/app-entrypoint

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/app-entrypoint"]
