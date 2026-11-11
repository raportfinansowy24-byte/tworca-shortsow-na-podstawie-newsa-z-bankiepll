# RaportFinansowy24 — Generator Shortsów z Newsa Bankier.pl 🚀

Zaawansowany silnik automatyzacji produkcji pionowych filmów krótkometrażowych (YouTube Shorts, TikTok, Instagram Reels) dla redakcji **RaportFinansowy24**, w pełni zintegrowany z **Bankier.pl**, **Make.com**, **n8n**, **Google Drive**, **Telegram Bot API**, **Supabase** oraz silnikami syntezy mowy **ElevenLabs**.

Aplikacja zawiera pełny stos:
1. **Silnik Renderera & API (Node.js + Express + FFmpeg)** — automatyczny montaż 9:16, animacja napisów, podkład muzyczny, plansze wykresów i QA faktograficzne.
2. **Nowoczesny Dashboard Webowy (React 19 + Vite + Tailwind CSS)** — panel Auto-Pilota, podgląd scenorysów, kolejka zadań z wbudowanym odtwarzaczem HTML5 MP4, monitor usług i integracje.
3. **Natywna aplikacja mobilna (Android / Kotlin + Jetpack Compose)** — mobilny monitoring autopilota, kolejki zadań i celów monetyzacji CPA.

---

## 📋 Spis treści

- [Architektura Systemu](#-architektura-systemu)
- [Kluczowe Moduły i Funkcje](#-kluczowe-moduły-i-funkcje)
  - [1. Rygorystyczne Bramki Jakości (Shorts QA & Source Fact QA)](#1-rygorystyczne-bramki-jakości-shorts-qa--source-fact-qa)
  - [2. Wizualizacje Danych Giełdowych i Wykresy SVG](#2-wizualizacje-danych-giełdowych-i-wykresy-svg)
  - [3. Typografia Anton & Plansze Wyróżnień (Highlight Boards)](#3-typografia-anton--plansze-wyróżnień-highlight-boards)
  - [4. Adaptacyjny Dobór Muzyki Tła](#4-adaptacyjny-dobór-muzyki-tła)
  - [5. Odtwarzacz Wideo MP4 w Historii Zadań (JobVideoPreview)](#5-odtwarzacz-wideo-mp4-w-historii-zadań-jobvideopreview)
  - [6. Monitor Gotowości Usług (FFmpeg, Pexels, ElevenLabs)](#6-monitor-gotowości-usług-ffmpeg-pexels-elevenlabs)
- [Kontrakty API i Endpointy](#-kontrakty-api-i-endpointy)
- [Zasady Bezpieczeństwa i Zgodności](#-zasady-bezpieczeństwa-i-zgodności)
- [Uruchomienie i Testy](#-uruchomienie-i-testy)
- [Wdrożenie Produkcyjne (Fly.io)](#-wdrożenie-produkcyjne-flyio)
- [Architektura Aplikacji Android](#-architektura-aplikacji-android)
- [Zmienne Środowiskowe (.env)](#-zmienne-środowiskowe-env)

---

## 🏗️ Architektura Systemu

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite + Tailwind CSS)       │
│  - Auto-Pilot AI: scraping newsów Bankier.pl, scoring wiralowości      │
│  - Storyboard Draft Preview: podgląd scen, tekstu i plansz przed renderem│
│  - Rendering Queue: pasek postępu renderu, podgląd HTML5 MP4 inline    │
│  - Monitor Usług: latencja i stan FFmpeg, Pexels API, ElevenLabs API   │
│  - Zarządzanie eksportem do Google Drive, Google Sheets i Postiz        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ REST / SSE
┌────────────────────────────────────▼───────────────────────────────────┐
│                     BACKEND & SERWER (Node.js / Express / TS)          │
│  - Source Fact QA: weryfikacja liczb, spółek i kierunków z artykułem   │
│  - Shorts Editor QA: blokada publikacji przy statusie innym niż pass   │
│  - Wykresy Giełdowe SVG: dynamiczne generowanie wektorowych sparklines │
│  - Adaptacyjna Muzyka: automatyczne dopasowanie nastroju podkładu      │
│  - Renderer FFmpeg: libass (Anton-Regular.ttf), miksowanie audio, 9:16 │
│  - ElevenLabs Voice Synthesizer: stały profil lektorski, synchronizacja│
│  - Webhook Telegram: interaktywna autoryzacja z plikiem MP4            │
│  - Supabase Job Store: trwała historia zadań i telemetria pipeline'u   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Kluczowe Moduły i Funkcje

### 1. Rygorystyczne Bramki Jakości (Shorts QA & Source Fact QA)
- **Kontrola dowodów źródłowych (`src/server/sourceFactQa.ts`)**: Każda scena faktograficzna musi zawierać dosłowny cytat z artykułu źródłowego. Liczby, procenty (z polskimi separatorami przecinkowymi), podmioty (np. GPW, KNF, WIG20, spółki giełdowe) oraz kierunki zmian (wzrost vs spadek) są walidowane względem artykułu.
- **Twarda blokada renderu (`src/server/shortsEditorQa.ts`)**: W trybie ścisłym (`strictQa: true` lub przy obecności tekstu artykułu), jeśli QA zwróci status inny niż `pass` (np. `blocked` lub `review`), proces montażu wideo zostaje bezpiecznie zatrzymany, zapobiegając publikacji niesprawdzonych treści.
- **Brandowa plansza CTA**: Ostatnia scena filmu to dedykowana plansza marki RaportFinansowy24 z wezwaniem do działania, zamiast losowych ujęć stockowych.

### 2. Wizualizacje Danych Giełdowych i Wykresy SVG
- **Moduł `src/server/financeChartVisual.ts`**: Generuje dynamiczne, wektorowe plansze 9:16 (720x1280) z wykresem giełdowym (sparkline), tickerem spółki, oficjalnymi notowaniami GPW/NBP oraz strzałkami trendu (zielona `▲` dla wzrostów, czerwona `▼` dla spadków).
- Wszystkie plansze przechodzą restrykcyjną walidację bezpieczeństwa `isSafeFinanceDataVisualSvg()`.

### 3. Typografia Anton & Plansze Wyróżnień (Highlight Boards)
- **Napisy w stylu referencyjnym**: Zastosowanie skondensowanego krojów **Anton** (`Anton-Regular.ttf`) dla centralnych napisów z dwuwierszowym wyróżnieniem kluczowych słów w kolorze czerwonym (`#FF2020`).
- **Pobieranie i weryfikacja czcionki**: Funkcja `ensureAntonFont()` automatycznie pobiera czcionkę z oficjalnego repozytorium Google Fonts (z lustrem jsDelivr) i rejestruje ją dla FFmpeg/libass.
- **Dynamiczne plansze faktów (`src/server/highlightBoards.ts`)**: Tworzy nakładki ASS z kluczowymi liczbami i terminami finansowymi.

### 4. Adaptacyjny Dobór Muzyki Tła
- **Moduł `src/server/adaptiveMusicStrategy.ts`**: Analizuje sentyment artykułu i automatycznie dobiera odpowiednią ścieżkę dźwiękową:
  - `urgent_tension` — dla krachów, spadków, tąpnięć i kryzysów,
  - `bullish_growth` — dla hossy, rekordowych zysków i dywidend,
  - `analytical_neutral` — dla decyzji RPP, stóp procentowych i danych makroekonomicznych GUS/NBP.

### 5. Odtwarzacz Wideo MP4 w Historii Zadań (`JobVideoPreview`)
- Wbudowany w kartę zadania odtwarzacz HTML5 dla ukończonych renderów (format pionowy 9:16).
- Funkcjonalności:
  - Automatyczne wykrywanie i ładowanie pliku z `/api/exports/:filename`,
  - Kontrolki Play/Pause, wyciszanie/dźwięk,
  - Interaktywny pasek osi czasu z dokładnym czasem trwania,
  - Przycisk ponawiania próby z mechanizmem cache-busting (`?_retry=...`),
  - Bezpośrednie pobieranie pliku MP4 na dysk oraz tryb pełnoekranowy.

### 6. Monitor Gotowości Usług (`ServiceStatusMonitor`)
- Dedykowany endpoint `GET /api/services/health` monitorujący:
  - **FFmpeg**: wersję, latencję i gotowość czcionki Anton,
  - **Pexels API**: autoryzację klucza i czas odpowiedzi wyszukiwarki,
  - **ElevenLabs API**: ważność tokenu, latencję i skonfigurowany identyfikator głosu (`voiceId`).
- Wizualny panel w zakładce "Monitor Usług" w aplikacji React.

---

## 📡 Kontrakty API i Endpointy

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/api/health` | Lekki endpoint zdrowia (FFmpeg, czcionka Anton, aktywne zadania, deployment Fly.io) |
| `GET` | `/api/healthz` | Bezzwłoczny probe liveness dla load balancera Fly.io |
| `GET` | `/api/services/health` | Szczegółowa diagnostyka połączeń z FFmpeg, Pexels i ElevenLabs |
| `POST` | `/api/combine-scenes` | Główny endpoint montażu wideo z pełnym storyboardem i QA |
| `POST` | `/api/auto-pilot-shorts` | Automatyczne pobranie newsu, wygenerowanie 4 scen i render |
| `GET` | `/api/jobs/:jobId` | Status zadania renderowania (`queued`, `processing`, `completed`, `failed`) |
| `GET` | `/api/jobs/:jobId/stream` | Strumień Server-Sent Events (SSE) dla paska postępu w czasie rzeczywistym |
| `GET` | `/api/jobs/recent-completed` | Lista ostatnich 5 ukończonych filmów z linkami do pobrania |
| `GET` | `/api/exports/:filename` | Pobieranie i strumieniowanie wygenerowanego pliku MP4 |
| `POST` | `/api/telegram/webhook` | Webhook interaktywnej akceptacji/odrzucenia wygenerowanego wideo |

---

## 🔒 Zasady Bezpieczeństwa i Zgodności

- **Sekrety**: Żadne klucze API (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `PEXELS_API_KEY`) nie wyciekają do kodu klienta przeglądarki — wszelkie integracje zewnętrzne działają wyłącznie po stronie serwera Node.js.
- **Bezpieczeństwo logowania błędów**: Błędy SDK modeli AI są sanityzowane przed wypisaniem do konsoli (`sanitizeModelErrorSummary`), aby nie ujawniać surowych tokenów ani nie wywoływać fałszywych alarmów skanera błędów.
- **Rzetelność finansowa**: Aplikacja nie generuje niesprawdzonych wskaźników RRSO/oprocentowania. Dane dynamiczne są kontrolowane przez moduł `sourceFactQa`, a materiały przykładowe są oznaczone redakcyjnie jako niemające charakteru rekomendacji inwestycyjnej.

---

## 💻 Uruchomienie i Testy

### Wymagania:
- Node.js >= 18
- Narzędzia `ffmpeg` oraz `ffprobe` zainstalowane w środowisku

### Środowisko deweloperskie:
```bash
# Instalacja zależności
npm install

# Uruchomienie aplikacji w trybie dev (Express + Vite na porcie 3000)
npm run dev
```

### Uruchomienie testów:
Repozytorium posiada kompleksowy zestaw 25 pakietów testowych sprawdzających poprawność całej domeny:
```bash
# Sprawdzenie typów TypeScript
npm run lint

# Kluczowe testy pipeline'u i QA
npm run test:short-pipeline
npm run test:shorts-editor-qa
npm run test:source-fact-qa
npm run test:finance-chart
npm run test:adaptive-music
npm run test:highlight-boards
npm run test:services-health
```

---

## 🚀 Wdrożenie Produkcyjne (Fly.io)

Wdrożenie produkcyjne realizowane jest za pomocą oficjalnego skryptu weryfikacyjnego:
```bash
# Test walidacyjny przed wdrożeniem (dry-run)
bash scripts/deploy-production.sh --dry-run

# Pełny deploy produkcyjny na Fly.io
npm run deploy:production
```

Skrypt automatycznie:
1. Sprawdza czystość gałęzi `main` i synchronizację z `origin/main`.
2. Weryfikuje konfigurację aplikacji w `fly.toml`.
3. Sprawdza obecność wymaganych sekretów na Fly.io (bez ujawniania ich wartości).
4. Uruchamia testy kontraktowe (`npm run lint`, `test:short-pipeline`, `test:motion-sound`, `test:scene-contract`).
5. Kompiluje bundle produkcyjny (`npm run build`).
6. Wysyła obraz do zdalnego buildera Fly i odpytuje endpoint `/api/health` aż do potwierdzenia statusu `online`.

---

## 📱 Architektura Aplikacji Android

W katalogu `app/` znajduje się natywna aplikacja mobilna napisana w języku **Kotlin** z wykorzystaniem **Jetpack Compose** (Material Design 3):

```text
app/src/main/java/com/example/bankiershorts/
├── MainActivity.kt               # Główna aktywność z Edge-to-Edge i dolnym paskiem nawigacji
├── data/
│   ├── models/Models.kt          # Modele Scene, BankierArticle, JobStatus, ViralityScore
│   └── repository/BankierShortsRepository.kt # Komunikacja z API backendu
├── ui/screens/
│   ├── AutopilotScreen.kt        # Harmonogram 4 slotów dziennie, wybór newsu, scoring
│   ├── BankierNewsScreen.kt      # Przeglądanie artykułów Bankier.pl (GPW, Waluty, Wiadomości)
│   ├── VideoCombinerScreen.kt    # Edytor 4-scenowego storyboardu (18.0s)
│   ├── RenderingQueueScreen.kt   # Pasek postępu renderowania i podgląd odtwarzacza
│   ├── ProfitMonitorScreen.kt    # Monitor celu 10 000 €/msc i statystyki CPA
│   └── WebhooksScreen.kt         # Monitor wywołań Make.com / n8n
└── ui/theme/                     # Finansowy ciemny motyw Material Design 3 (Emerald & Indigo)
```

---

## 🔐 Zmienne Środowiskowe (`.env`)

Skonfiguruj plik `.env` w oparciu o `.env.example`. Na Fly.io wartości ustawiaj wyłącznie przez `fly secrets set`.

| Zmienna | Wymagana | Opis |
|---|---|---|
| `PORT` | Nie (domyślnie 3000) | Port nasłuchiwania serwera Express |
| `APP_URL` | Tak (produkcja) | Publiczny adres URL aplikacji (np. `https://tworca-shortsow-na-podstawie-newsa-z-bankiepll.fly.dev`) |
| `APP_LOGIN_PASSWORD` | Tak | Hasło dostępowe do panelu webowego |
| `APP_AUTH_SECRET` | Tak | Losowy ciąg min. 32 znaków do podpisywania sesji |
| `BANKIER_SHORTS_API_TOKEN` | Tak dla automatyzacji | Token autoryzacyjny Bearer dla webhooków i skryptów |
| `GEMINI_API_KEY` | Tak dla AI | Klucz Google Gemini API (wykorzystywany kaskadowo: `gemini-3.8-flash`, `gemini-3.1-flash-lite`) |
| `ELEVENLABS_API_KEY` | Tak dla TTS | Klucz ElevenLabs API dla syntezy głosu lektora |
| `ELEVENLABS_VOICE_ID` | Nie | Domyślnie `onwK4e9ZLuTAKqWW03F9` (Daniel) |
| `PEXELS_API_KEY` | Tak dla wideo | Klucz Pexels API do wyszukiwania pionowych klipów stockowych |
| `TELEGRAM_BOT_TOKEN` | Opcjonalnie | Token bota Telegrama do interaktywnej akceptacji wideo |
| `TELEGRAM_CHAT_ID` | Opcjonalnie | ID czatu Telegram, na który wysyłany jest gotowy plik MP4 |
| `TELEGRAM_WEBHOOK_SECRET` | Opcjonalnie | Sekret autoryzacyjny nagłówka webhooka Telegrama |
| `SUPABASE_URL` | Opcjonalnie | URL projektu Supabase dla trwałej historii renderów |
| `SUPABASE_KEY` | Opcjonalnie | Klucz serwisowy Supabase (service_role) |

---

© 2026 RaportFinansowy24. Wszelkie prawa zastrzeżone.
