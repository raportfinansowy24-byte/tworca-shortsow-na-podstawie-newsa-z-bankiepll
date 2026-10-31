#!/usr/bin/env bash
set -Eeuo pipefail

# Production deployment for the RaportFinansowy24 finance-shorts pipeline.
# Secrets are never printed. The script only checks their names and runtime presence.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="${FLY_APP:-tworca-shortsow-na-podstawie-newsa-z-bankiepll}"
BASE_URL="${FLY_BASE_URL:-https://${APP_NAME}.fly.dev}"
HEALTH_PATH="${FLY_HEALTH_PATH:-/api/health}"
POLL_SECONDS="${FLY_DEPLOY_POLL_SECONDS:-5}"
POLL_ATTEMPTS="${FLY_DEPLOY_POLL_ATTEMPTS:-36}"
DRY_RUN=false
SKIP_TESTS=false
SKIP_BUILD=false

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'HELP'
Usage: scripts/deploy-production.sh [options]

Options:
  --dry-run       Validate repository, tests, build and Fly configuration, but do not deploy.
  --skip-tests    Skip local test suite (not recommended).
  --skip-build    Skip local production build (Fly still builds the Docker image).
  -h, --help      Show this help.

Environment overrides:
  FLY_APP, FLY_BASE_URL, FLY_HEALTH_PATH,
  FLY_DEPLOY_POLL_SECONDS, FLY_DEPLOY_POLL_ATTEMPTS.
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --skip-tests) SKIP_TESTS=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Nieznana opcja: $1" ;;
  esac
done

if command -v flyctl >/dev/null 2>&1; then
  FLY_BIN="flyctl"
elif command -v fly >/dev/null 2>&1; then
  FLY_BIN="fly"
else
  fail "Brak flyctl/fly. Zainstaluj Fly CLI i wykonaj fly auth login."
fi

command -v curl >/dev/null 2>&1 || fail "Brak curl."
command -v npm >/dev/null 2>&1 || fail "Brak npm."

[[ -f fly.toml ]] || fail "Uruchom skrypt z repozytorium zawierającego fly.toml."
[[ -f Dockerfile ]] || fail "Brak Dockerfile."
[[ -f package.json ]] || fail "Brak package.json."

CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "main" ]] || fail "Wdrożenie produkcyjne wymaga gałęzi main; aktualna: $CURRENT_BRANCH"
[[ -z "$(git status --porcelain)" ]] || fail "Repozytorium ma niezapisane zmiany. Zacommituj je przed deployem."

REMOTE_HEAD="$(git rev-parse origin/main 2>/dev/null || true)"
LOCAL_HEAD="$(git rev-parse HEAD)"
[[ -n "$REMOTE_HEAD" && "$LOCAL_HEAD" == "$REMOTE_HEAD" ]] || fail "Lokalny main nie jest zsynchronizowany z origin/main. Wykonaj git pull --ff-only."

CONFIGURED_APP="$({ grep -E '^app[[:space:]]*=' fly.toml || true; } | sed -E 's/.*=[[:space:]]*"([^"]+)".*/\1/')"
[[ -n "$CONFIGURED_APP" ]] || fail "Nie udało się odczytać app z fly.toml."
[[ "$CONFIGURED_APP" == "$APP_NAME" ]] || fail "FLY_APP ($APP_NAME) różni się od app w fly.toml ($CONFIGURED_APP)."

log "Sprawdzam dostęp do Fly.io dla aplikacji $APP_NAME."
"$FLY_BIN" status --app "$APP_NAME" >/dev/null || fail "Brak dostępu do aplikacji Fly.io albo aplikacja nie istnieje."

log "Sprawdzam nazwy wymaganych sekretów; wartości nie są wyświetlane."
SECRET_LIST="$($FLY_BIN secrets list --app "$APP_NAME")" || fail "Nie udało się odczytać listy sekretów Fly.io."
REQUIRED_SECRETS=(APP_AUTH_SECRET BANKIER_SHORTS_API_TOKEN GEMINI_API_KEY PEXELS_API_KEY ELEVENLABS_API_KEY SUPABASE_URL)
MISSING=()
for secret in "${REQUIRED_SECRETS[@]}"; do
  if ! grep -Eq "(^|[[:space:]])${secret}([[:space:]]|$)" <<<"$SECRET_LIST"; then
    MISSING+=("$secret")
  fi
done

if ! grep -Eq '(^|[[:space:]])(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_KEY)([[:space:]]|$)' <<<"$SECRET_LIST"; then
  MISSING+=("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY/SUPABASE_KEY)")
fi

if (( ${#MISSING[@]} > 0 )); then
  fail "Brak sekretów Fly.io: ${MISSING[*]}. Ustaw je przez fly secrets set --app $APP_NAME."
fi

if [[ "$SKIP_TESTS" == false ]]; then
  log "Uruchamiam testy kontraktowe i pipeline."
  npm run lint
  npm run test:short-pipeline
  npm run test:motion-sound
  npm run test:creative-director
  npm run test:scene-contract
else
  log "Pominięto testy na żądanie (--skip-tests)."
fi

if [[ "$SKIP_BUILD" == false ]]; then
  log "Buduję frontend i backend produkcyjny."
  npm run build
else
  log "Pominięto lokalny build na żądanie (--skip-build)."
fi

if [[ "$DRY_RUN" == true ]]; then
  log "Dry run zakończony. Deploy nie został uruchomiony."
  exit 0
fi

log "Wysyłam aktualny main do Fly.io przez zdalny builder."
"$FLY_BIN" deploy --app "$APP_NAME" --remote-only --yes

log "Czekam na zdrowy endpoint $BASE_URL$HEALTH_PATH."
for ((attempt=1; attempt<=POLL_ATTEMPTS; attempt++)); do
  if HEALTH_JSON="$(curl -fsS --max-time 10 "$BASE_URL$HEALTH_PATH" 2>/dev/null)"; then
    if printf '%s' "$HEALTH_JSON" | grep -q '"status"[[:space:]]*:[[:space:]]*"online"'; then
      log "Aplikacja online po wdrożeniu."
      printf '%s\n' "$HEALTH_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps({"status": d.get("status"), "service": d.get("service"), "activeJobsCount": d.get("activeJobsCount")}, ensure_ascii=False))' 2>/dev/null || true
      exit 0
    fi
  fi
  log "Próba $attempt/$POLL_ATTEMPTS nie potwierdziła gotowości; ponawiam za ${POLL_SECONDS}s."
  sleep "$POLL_SECONDS"
done

fail "Deploy zakończony, ale health check nie potwierdził statusu online. Sprawdź: $FLY_BIN logs --app $APP_NAME"
