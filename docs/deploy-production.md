# Wdrożenie produkcyjne Fly.io

Skrypt `scripts/deploy-production.sh` wdraża aktualny `main` do aplikacji Fly.io `tworca-shortsow-na-podstawie-newsa-z-bankiepll`. Przed deployem wymaga czystego repozytorium, synchronizacji z `origin/main`, dostępu do Fly.io, obecności Dockerfile i wymaganych nazw sekretów.

Skrypt uruchamia lint, testy pipeline’u oraz produkcyjny build. Następnie wykonuje `fly deploy --remote-only --yes`, czeka na `GET /api/health` ze statusem `online` i wypisuje wyłącznie niesekretne informacje diagnostyczne. Wartości sekretów nigdy nie są drukowane.

Wymagane sekrety Fly.io to `APP_AUTH_SECRET`, `BANKIER_SHORTS_API_TOKEN`, `GEMINI_API_KEY`, `PEXELS_API_KEY`, `ELEVENLABS_API_KEY`, `SUPABASE_URL` i `SUPABASE_KEY`. Ustawia się je wcześniej przez `fly secrets set`.

Najpierw można wykonać walidację bez wdrażania:

```bash
npm run deploy:production -- --dry-run
```

Pełne wdrożenie:

```bash
npm run deploy:production
```

Opcje `--skip-tests` i `--skip-build` istnieją tylko dla sytuacji awaryjnych i nie są zalecane dla normalnego deploya. Skrypt nie wykonuje automatycznego rollbacku. Jeśli health check po wdrożeniu nie przejdzie, sprawdź logi przez `fly logs --app tworca-shortsow-na-podstawie-newsa-z-bankiepll` i wykonaj rollback zgodnie z procedurą Fly.io.
