#!/bin/sh
set -eu

mkdir -p /app/exports /app/temp /app/fonts
chown node:node /app/exports /app/temp /app/fonts

exec gosu node:node node dist/server.cjs
