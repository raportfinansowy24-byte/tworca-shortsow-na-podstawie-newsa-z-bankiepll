# Wdrożenie RaportFinansowy24 na Fly.io

## Stan przed pierwszym wdrożeniem

- Docelowa aplikacja Fly `tworca-shortsow-na-podstawie-newsa-z-bankiepll` istnieje i działa w regionie Frankfurt (`fra`).
- Konfiguracja używa jednej maszyny `shared-cpu-8x` (2 GB) oraz jednego trwałego wolumenu 10 GB pod `/app/exports`; cache Pexels jest przechowywany w Supabase.
- Szacunkowy koszt z konfiguracji: około **17,06 USD/miesiąc** przy 730 godzinach pracy (maszyna i wolumen), plus transfer i ewentualne podatki. Maszyna jest skonfigurowana jako stale uruchomiona, aby render i webhook nie zależały od wybudzania.
- Sekrety `BANKIER_SHORTS_API_TOKEN`, `ELEVENLABS_API_KEY`, `GEMINI_API_KEY_1`–`GEMINI_API_KEY_7` (oraz opcjonalny starszy `GEMINI_API_KEY`) i pozostałe wcześniej przygotowane sekrety są w Fly jako **staged**; zostaną udostępnione maszynie podczas deployu. Nie zapisuj ich w repozytorium, `fly.toml`, promptach ani czacie.

## Zabezpieczenia i funkcje

- Prywatny panel loguje się hasłem `APP_LOGIN_PASSWORD`; serwer podpisuje 12-godzinną sesję kluczem `APP_AUTH_SECRET`.
- API weryfikuje podpis sesji po stronie serwera. Automatyzacja używa oddzielnego `BANKIER_SHORTS_API_TOKEN`; webhook Telegrama ma własny sekret.
- Google Drive i Sheets używają Google Identity Services (GIS) oraz publicznego `VITE_GOOGLE_CLIENT_ID`. To osobna zgoda do zasobów Google, niezależna od logowania do panelu.
- Skrypt automatyzacji używa osobnego, losowego tokenu Bearer z `/home/ubuntu/.user_env`; plik jest ograniczony do właściciela. Skrypt dołącza token zarówno do żądań API, jak i pobrania MP4.
- Prośba o akceptację Telegram wysyła rzeczywisty MP4 jako załącznik z przyciskami akceptacji/odrzucenia; akceptacja zapisuje decyzję, ale nie publikuje filmu. Limit załącznika wynosi 45 MB.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` i `TELEGRAM_WEBHOOK_SECRET` nie są jeszcze skonfigurowane. Rejestracja webhooka pozostaje wyłączona. Nie włączaj jej bez potwierdzenia, że bot jest dedykowany tej aplikacji.

## Po wdrożeniu

1. Sprawdź `/api/health` oraz publiczną odpowiedź `401` dla niezalogowanego żądania do chronionej trasy API.
2. Sprawdź logowanie hasłem panelu. Dla Google Drive/Sheets dodaj origin `https://tworca-shortsow-na-podstawie-newsa-z-bankiepll.fly.dev` oraz lokalny origin developerski do Google Cloud Console → OAuth 2.0 Web Client → Authorized JavaScript origins. Sprawdź też, czy build zawiera `VITE_GOOGLE_CLIENT_ID`.
3. Sprawdź autoryzację tokenem automatyzacji bez wypisywania tokenu w logach.
4. Nie uruchamiaj renderu produkcyjnego jako testu, dopóki nie są gotowe usługi AI/TTS i wymagana konfiguracja akceptacji Telegram.
5. Pełny test Telegrama wykonaj dopiero po ustawieniu sekretów bota, włączeniu webhooka dla dedykowanego bota i dostępie do prywatnego czatu.
6. Cache Pexels jest zapisywany w prywatnej tabeli Supabase `pexels_search_cache` i nie jest wystawiany przez Fly.

## Uwaga o harmonogramie

Zaplanowane zadanie powinno przed wywołaniem skryptu załadować `/home/ubuntu/.user_env` bez wyświetlania wartości. Do czasu skonfigurowania i wdrożenia Telegrama ma zatrzymać się przed renderem i zgłosić blokadę; nie może sugerować, że prośba o akceptację została wysłana.
