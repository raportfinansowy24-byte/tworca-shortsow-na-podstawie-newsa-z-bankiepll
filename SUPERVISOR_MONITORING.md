# Nadzorca — monitoring, alarmy i bezpieczna obsługa błędów

## Włączanie monitoringu

Monitoring jest celowo opt-in. W sekretach Fly.io ustaw:

- `SUPERVISOR_MONITOR_ENABLED=true` — włącza kontrolę cykliczną.
- `SUPERVISOR_MONITOR_INTERVAL_MS=300000` — opcjonalny interwał; minimum 60 000 ms, domyślnie 5 minut.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `BANKIER_SHORTS_API_TOKEN` — istniejące ustawienia używane do wysłania alarmu i autoryzowanego odczytu statusu.

Nie dodawaj tych wartości do repozytorium ani do frontendu. Ustawiaj je jako sekrety aplikacji Fly.io. Nie zmieniaj `POSTIZ_AUTO_PUBLISH`.

## Jak działa monitoring

- Po starcie serwera wykonuje pierwszą kontrolę po 15 sekundach, potem według interwału.
- Odczytuje istniejący `/api/supervisor/status`; nie duplikuje diagnostyki aplikacji.
- Wysyła Telegramem nowy alarm tylko przy nowym/zmienionym zestawie problemów, a po ustąpieniu alarmu wysyła wiadomość o powrocie do normy.
- W razie awarii samej kontroli wysyła ogólny alarm bez ujawniania sekretów.
- `POST /api/supervisor/recheck` pozwala autoryzowanemu operatorowi wykonać ręczną kontrolę. Endpoint jest chroniony istniejącym middleware `/api`.

## Granice bezpieczeństwa

- Monitor jest diagnostyczny: nie publikuje postów, nie restartuje maszyny, nie zmienia sekretów i nie ponawia renderów automatycznie.
- Bezpieczne ponawianie renderu wymaga zapisania pełnego, zweryfikowanego payloadu wejściowego i idempotency key; obecny snapshot historii nie gwarantuje odtworzenia wszystkich parametrów. Dlatego retry nie jest udawane ani uruchamiane w ciemno.
- Błędy renderu nadal obsługuje istniejący system zadań i zatwierdzanie przez Telegram; operator dostaje alert i decyduje o następnym kroku.
- Alarmy w pamięci deduplikują się na czas życia procesu; po restarcie pamięć deduplikacji się resetuje.

## Kontrola jakości

GitHub Actions uruchamia lint, build i testy scen, autoryzacji, Telegrama oraz historii Supabase dla każdego PR i pushu do `main`. Status CI musi być zielony przed scaleniem.

## Po merge

1. Potwierdź, że Fly.io wdrożył najnowszy commit `main`.
2. Ustaw wymagane sekrety w Fly.io.
3. Sprawdź `GET /api/health` oraz autoryzowany `GET /api/supervisor/status`.
4. Włącz monitoring przez `SUPERVISOR_MONITOR_ENABLED=true` dopiero po skonfigurowaniu Telegrama.
5. Wywołaj ręczny `POST /api/supervisor/recheck` z autoryzacją i potwierdź otrzymanie alarmu testowego przy stanie wymagającym uwagi.