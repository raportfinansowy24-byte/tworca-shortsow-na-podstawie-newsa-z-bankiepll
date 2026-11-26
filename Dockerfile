FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       ffmpeg \
       fontconfig \
       libass9 \
       curl \
       fonts-dejavu-core \
       fonts-liberation \
       gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Public Google OAuth client ID is used by Vite during image build only.
ARG VITE_GOOGLE_CLIENT_ID

# Stamped by the CI deployment workflow so health checks can prove the running commit.
ARG APP_GIT_SHA=unknown
ARG APP_IMAGE_LABEL=local

LABEL org.opencontainers.image.title="RaportFinansowy24 - Tworca Shortsow" \
      org.opencontainers.image.revision="${APP_GIT_SHA}" \
      org.opencontainers.image.version="${APP_IMAGE_LABEL}"

# This repository tracks bun.lock, not package-lock.json; install from package.json.
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund

COPY . .

# Use the pinned, OFL-licensed font from the repository; builds do not depend on raw.githubusercontent.com.
RUN mkdir -p /app/fonts \
    && install -m 0644 assets/fonts/Montserrat-Black.ttf /app/fonts/Montserrat-Black.ttf \
    && install -m 0644 assets/fonts/OFL-Montserrat.txt /app/fonts/OFL-Montserrat.txt \
    && fc-cache -f /app/fonts \
    && fc-match -f '%{family} %{style}\\n' 'Montserrat:style=Black' | grep -qi Montserrat \
    && ffmpeg -hide_banner -filters 2>&1 | grep -Eq '[[:space:]]ass[[:space:]]'
RUN npm run lint \
    && VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID}" npm run build \
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
