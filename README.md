# RaportFinansowy24 — Make Video Scene Combiner Connector 🚀

Zaawansowany silnik automatyzacji produkcji wideo pionowego (Shorts, TikTok, Instagram Reels) dla portalu **RaportFinansowy24**, w pełni zintegrowany z **Make.com**, **n8n**, **Google Drive** oraz nowoczesnymi silnikami syntezy mowy **Neural TTS**.

---

## 📋 Spis treści

- [Architektura systemu](#architektura-systemu)
- [Główne funkcje i moduły](#główne-funkcje-i-moduły)
- [Silnik Lektora TTS i Profile Głosowe](#silnik-lektora-tts-i-profile-głosowe)
- [Integracja Google Drive & Google Sheets (Workspace)](#integracja-google-drive--google-sheets-workspace)
- [Automatyzacja Make.com i n8n](#automatyzacja-makecom-i-n8n)
- [Kontrakty API i Endpointy](#kontrakty-api-i-endpointy)
  - [1. POST /api/combine-scenes](#1-post-apicombine-scenes)
  - [2. POST /api/auto-pilot-shorts](#2-post-apiauto-pilot-shorts)
  - [3. GET /api/jobs/:jobId & SSE Stream](#3-get-apijobsjobid--sse-stream)
  - [4. POST /api/tts/preview & GET /api/tts/voices](#4-post-apittspreview--get-apittsvoices)
- [Zasady Bezpieczeństwa i Zgodności](#zasady-bezpieczeństwa-i-zgodności)
- [Instalacja i Uruchomienie](#instalacja-i-uruchomienie)
- [Zmienne Środowiskowe](#zmienne-środowiskowe)

---

## 🏗️ Architektura systemu

System składa się z dwóch ściśle zintegrowanych warstw:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite + Tailwind)              │
│  - Kreator Scen & Podgląd Lektora TTS na żywo                          │
│  - Studio Animacji Napisów (Word-by-word Hormozi style)                │
│  - Auto-Pilot AI zintegrowany z wiadomościami Bankier.pl               │
│  - Menedżer Google Drive (eksport MP4, zarządzanie folderami)          │
│  - Panel Monitoringu Zadań i Webhooków w czasie rzeczywistym           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ REST / Server-Sent Events (SSE)
┌────────────────────────────────────▼───────────────────────────────────┐
│                     BACKEND & SERWER (Node.js / Express)               │
│  - Asynchroniczny pipeline FFmpeg (montaż, napisy ASS, skalowanie)     │
│  - Jeden provider mowy ElevenLabs (stały głos, bez fallbacku)          │
│  - Pobieranie i weryfikacja assetów stockowych (Pexels / CDN)          │
│  - Serwer plików statycznych & kolejka zadań na dysku                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Główne funkcje i moduły

1. **Montaż wideo pionowego (9:16 — 720x1280 lub 1080x1920)**:
   - Skalowanie i wycinanie klipów bez deformacji proporcji (letterbox/crop).
   - Wsparcie dla przejść, podkładu muzycznego z automatycznym duckingiem audio.
   - Płynne łączenie wielu scen w jeden plik MP4.

2. **Animowane napisy Word-by-Word (Styl Alex Hormozi / MrBeast)**:
   - Dynamiczne podświetlanie aktualnie czytanego słowa (żółty, limonkowy, cyjan, czerwony, biały).
   - Czcionka Montserrat ExtraBold z solidnym konturem (ASS outline) zapobiegającym zlewaniu się z tłem.
   - Precyzyjna synchronizacja czasu trwania sceny z długością wypowiedzi lektora.

3. **Auto-Pilot Tematyczny & Wiadomości Finansowe**:
   - Integracja z aktualnymi wiadomościami rynkowymi Bankier.pl (RSS & Scraping).
   - Generowanie gotowych scenariuszy pod kątem virali finansowych, wskaźników spółek i kredytów.
   - Automatyczne dołączanie profesjonalnego call-to-action dla RaportFinansowy24.

---

## 🎙️ Silnik Lektora TTS i Profile Głosowe

System rozwiązuje problem powtarzalności głosu poprzez unikalne, sprawdzone profile lektorskie o zróżnicowanej barwie, modulacji częstotliwości (pitch) i dynamice:

### Dostępne profile w języku polskim (PL):

| Identyfikator | Persona | Charakterystyka | Rekomendowane zastosowanie |
|---|---|---|---|
| `pl-PL-MarekNeural` | 🎙️ **Marek** | Męski dynamiczny, wyrazisty | Shorts, newsy, biznes |
| `pl-PL-ZofiaNeural` | 🎙️ **Zofia** | Żeński naturalny & ciepły | Poradniki, narracja |
| `pl-PL-MarekNeural-deep` | 🎙️ **Krzysztof** | Męski głęboki bas (-16Hz) | Raporty premium, kino |
| `pl-PL-ZofiaNeural-expressive` | ✨ **Maja** | Żeński młody & ekspresyjny (+14Hz) | TikTok, virale, lifestyle |
| `pl-PL-MarekNeural-energy` | ⚡ **Patryk** | Męski wysoka energia (+18Hz) | Hook w pierwszych 3 sekundach |
| `pl-PL-ZofiaNeural-pro` | 💼 **Anna** | Żeński stonowany & formalny (-8Hz) | Raporty B2B, analizy NBP |

### Inteligentny Fallback ElevenLabs:
Jeśli w payloadzie przekazano profil `eleven_*`, a klucz API nie jest skonfigurowany lub zwróci błąd limitu, silnik automatycznie przekierowuje zapytanie do skorelowanego profilu Neural HD o analogicznej barwie (np. `eleven_adam` ➔ `pl-PL-MarekNeural-deep`, `eleven_rachel` ➔ `pl-PL-ZofiaNeural`), eliminując błędy renderowania.

---

## 📁 Integracja Google Drive & Google Sheets (Workspace)

Aplikacja posiada pełną integrację z **Google Workspace APIs (Drive & Sheets v4)**:
- **Logowanie klienta**: Bezpieczny przepływ OAuth 2.0 bez ujawniania sekretów po stronie klienta z tokenem w pamięci operacyjnej.
- **Automatyczny eksport shortów**: Auto-Pilot po połączeniu konta Google zawsze zapisuje gotowy MP4 do folderu `shorts-bot`; przełącznik wyłączający autoeksport został usunięty. Dla zadań utworzonych przez webhook/Telegram automatyczny eksport z przeglądarki wymaga otwartego panelu Auto-Pilota i aktywnego logowania Google.
- **Przeglądarka plików Dysku**: Wyszukiwanie, podgląd rozmiaru i pobieranie wideo z Dysku do scen w kreatorze.
- **Kopia scenariuszy**: Zapisywanie wygenerowanych przez AI skryptów i transkrypcji w formacie Markdown bezpośrednio na Dysku Google.

### 📊 Integracja z Google Sheets API (v4):
- **Dynamiczna eksploracja arkuszy**: Pobieranie metadanych bez sztywnego założenia o nazwie "Sheet1" — obsługa dowolnych zakładek i arkuszy kalkulacyjnych.
- **Siatka danych na żywo**: Podgląd komórek, kolumn (A-Z) i numerowanych wierszy z podglądem linków.
- **Dopisywanie danych**: Formularz dodawania wierszy do wybranej zakładki arkusza.
- **Automatyczna synchronizacja logów wideo**: 1-kliknięcie przenosi ukończone rendery (jobId, URL wideo, lektor, liczba scen, status) bezpośrednio do wybranego arkusza Google Sheets.
- **Predefiniowane szablony biznesowe RaportFinansowy24**:
  1. 📅 **Kalendarz Publikacji Shorts** — data, tytuł, hook, lektor, status publikacji.
  2. 📈 **Monitoring Kursów & RRSO** — bank, produkt, oprocentowanie, prowizja, status oferty.
  3. 💰 **Logi Renderów & Analityka ROI** — job ID, czas trwania, URL wyrenderowanego MP4, kliknięcia afiliacyjne.
- **Bezpieczeństwo operacji niszczących (Destructive Confirmation Dialog)**: Obowiązkowe okno modalne z prośbą o jednoznaczne zatwierdzenie usunięcia arkusza lub wyczyszczenia zakresu komórek.

### Akceptacja i poprawki przez Telegram

Każdy nowy render shorta po zakończeniu FFmpeg jest wysyłany jako MP4 do skonfigurowanego czatu Telegram z przyciskami **Akceptuję** i **Odrzucam**. Odrzucenie otwiera odpowiedź wymuszającą komentarz (do 1800 znaków); Auto-Pilot generuje nową, powiązaną wersję, stosuje komentarz jako instrukcję redakcyjną, zachowuje źródłowy artykuł i ponownie wysyła render do akceptacji. Dopuszczonych jest maksymalnie 5 rund poprawek. Pliki z poprawionych wersji są automatycznie eksportowane do Drive, jeśli panel aplikacji jest otwarty i połączony z kontem.

`TELEGRAM_CHAT_ID` wybiera konkretny czat docelowy. W prywatnym czacie kod dodatkowo sprawdza, czy nadawcą jest użytkownik o tym samym ID, więc drugi rachunek Telegrama nie może zatwierdzać w imieniu pierwszego. Dla grup wymagane jest ustawienie `TELEGRAM_APPROVER_USER_ID`, aby ograniczyć decyzje do konkretnego konta. Bot musi być uruchomiony przez użytkownika w wybranym czacie. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` i `APP_URL` należy ustawić jako sekrety/konfigurację środowiska serwera; webhook rejestruje się automatycznie przy starcie. Akceptacja zapisuje stan `approved`, ale publikacja na platformach społecznościowych nie jest w tym etapie skonfigurowana.

---

## 🗄️ Historia zadań w Supabase

Serwer może synchronizować historię renderów i metadane shortów do Supabase Postgres. Tabela `short_jobs` przechowuje źródło, status renderowania, postęp, tytuł i artykuł, podsumowania scen, parametry TTS, linki MP4/miniatury oraz najnowszy status eksportu. Tabela `short_job_exports` zapisuje osobno każdą próbę eksportu do Google Drive wraz ze statusem, nazwą pliku i linkiem.

Zastosuj migracje w kolejności: `supabase/migrations/20261018070800_create_short_history.sql`, a następnie `supabase/migrations/20261019130000_telegram_revisions_and_drive_dedup.sql` (SQL Editor Supabase lub Supabase CLI). Druga migracja dodaje komentarze i relacje wersji; nie usuwa ani nie przepisuje historycznych prób eksportu. Ochrona przed duplikatami Drive używa rezerwacji zadania po stronie serwera oraz stabilnego `appProperties.bankierShortJobId` przy pliku na Drive. Ustaw `SUPABASE_URL` i `SUPABASE_KEY` w **sekretach środowiska serwera**; `SUPABASE_KEY` musi być kluczem secret/service_role i nigdy nie może trafić do kodu przeglądarki ani repozytorium. Po starcie aplikacja scala historię z Supabase z lokalnym `exports/jobs_history.json` i wykonuje idempotentny backfill istniejących wpisów. Gdy Supabase jest niedostępne, renderowanie i transfer plików do Drive nadal działają, ale ich historia pozostaje lokalna.

---

## 🔄 Automatyzacja Make.com i n8n

W folderze aplikacji znajduje się gotowy moduł HTTP Connector:
- Obsługa asynchroniczna (`async: true`) z webhookiem zwrotnym (`webhookUrl`) lub synchroniczna zwracająca od razu URL do gotowego pliku MP4.
- Możliwość pobrania gotowego szablonu scenariusza Make (`blueprint.json`) bezpośrednio z panelu.
- Obsługa aliasów pól (`voice`, `ttsVoice`, `lektor`, `ttsSpeed`, `speed`, `video_url`, `url`, `tekst_głosowy`).

---

## 📡 Kontrakty API i Endpointy

### 1. `POST /api/combine-scenes`

`expectedSceneCount` jest wymagane i musi być równe długości `scenes` (od 1 do 8). Niepełne listy kończą się błędem; serwer nie kopiuje scen. Ustaw `clientSource` (np. `make`, `panel` lub `translation`) do diagnozowania źródła w logach.
Łączy przekazaną tablicę scen w jeden film MP4.

```json
{
  "clientSource": "readme-example",
  "expectedSceneCount": 1,
  "scenes": [
    {
      "videoUrl": "https://assets.mixkit.co/videos/preview/mixkit-business-charts-in-a-computer-screen-40788-large.mp4",
      "subtitles": "CZY WIESZ JAK DZIAŁAJĄ STOPY NBP?",
      "voiceover_text": "Czy wiesz jak działają stopy procentowe NBP?",
      "duration": 6,
      "captionStyle": {
        "animation": "word-by-word",
        "highlightColor": "yellow"
      }
    }
  ],
  "audioUrl": "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  "audioVolume": 0.2,
  "outputResolution": "720x1280",
  "fps": 30,
  "async": true,
  "tts": true,
  "ttsVoice": "pl-PL-MarekNeural",
  "ttsSpeed": 1.15,
  "syncDurationWithVoice": true,
  "webhookUrl": "https://hook.eu1.make.com/twoj-unikalny-webhook"
}
```

### 2. `POST /api/auto-pilot-shorts`
Generuje scenariusz, dopasowuje klipy stockowe i renderuje wideo na podstawie tematu lub artykułu:

```json
{
  "topic": "Wpływ inflacji na raty kredytów hipotecznych",
  "niche": "Finanse i Kredyty",
  "language": "Polski",
  "ttsVoice": "pl-PL-MarekNeural-deep",
  "async": true
}
```

### 3. `GET /api/jobs/:jobId` & SSE Stream
- `GET /api/jobs/:jobId`: Zwraca aktualny stan zadania (`queued`, `processing`, `completed`, `error`), procent postępu oraz link do pliku wyjściowego.
- `GET /api/jobs/:jobId/stream`: Strumień Server-Sent Events (SSE) do natychmiastowego odświeżania paska postępu w interfejsie bez odpytywania (polling).

### 4. `POST /api/tts/preview` & `GET /api/tts/voices`
- `POST /api/tts/preview`: Generuje próbkę przez ElevenLabs dla wybranego głosu i globalnego tempa.
- `GET /api/tts/voices`: Zwraca głosy dostępne dla skonfigurowanego konta ElevenLabs.
- W renderze czterech scen ten sam `voice_id`, model i ustawienia głosu obowiązują w całym Shortcie. Jeśli potrzebne jest dopasowanie długości, identyczny mnożnik `atempo` jest stosowany do wszystkich scen.
- Nie ma fallbacku do Microsoft Edge ani Google TTS. Brak klucza, błąd API lub zbyt długa kwestia zatrzymują render, zamiast zmieniać głos lub ucinać lektora.

---

## 🔒 Zasady Bezpieczeństwa i Zgodności

- **Sekrety**: Żadne klucze API (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, itp.) nie są kompilowane do bundle'a przeglądarki klienta — wszystkie zapytania zewnętrzne są przetwarzane po stronie serwera Node.js.
- **Dostęp do API**: trasy `/api/*` wymagają krótkotrwałego, podpisanego tokenu sesji aplikacji albo osobnego `BANKIER_SHORTS_API_TOKEN` dla automatyzacji. Wyjątki to `GET /api/health`, logowanie `POST /api/auth/login` oraz webhook Telegrama, który sprawdza własny sekret.
- **Logowanie do panelu**: własne hasło sprawdzane po stronie serwera przez `APP_LOGIN_PASSWORD`; sesja jest podpisywana przez `APP_AUTH_SECRET` (minimum 32 znaki, ważność 12 godzin). To logowanie nie korzysta z Firebase. Firebase SDK pozostaje tylko w oddzielnym przepływie OAuth używanym do Google Drive.
- **Automatyzacja**: skrypt `bankier_article_to_mp4.py` wysyła `Authorization: Bearer …`. Token ustawiaj w menedżerze sekretów środowiska procesu i Fly.io; nigdy nie zapisuj go w repozytorium, promptach harmonogramu ani historii terminala.
- **Rzetelność finansowa**: Aplikacja nie generuje sztucznych ani niepotwierdzonych wskaźników RRSO/oprocentowania. Dane dynamiczne są pobierane z aktualnych artykułów i oficjalnych źródeł, a treści przykładowe są wyraźnie oznaczone.

---

## 💻 Instalacja i Uruchomienie

### Wymagania:
- Node.js >= 18
- Zainstalowane narzędzia `ffmpeg` oraz `ffprobe` w zmiennej PATH systemu

### Uruchomienie deweloperskie:
```bash
# Instalacja zależności
npm install

# Uruchomienie serwera aplikacji i frontendu (port 3000)
npm run dev
```

### Budowanie produkcyjne:
```bash
# Weryfikacja lintera
npm run lint

# Kompilacja frontendu
npm run build

# Uruchomienie serwera produkcyjnego
npm start
```

---

## 🐍 Skrypt Python: artykuł Bankier.pl → MP4

`scripts/bankier_article_to_mp4.py` pobiera świeży artykuł z RSS lub wskazany link, a następnie zleca generację istniejącemu endpointowi `/api/auto-pilot-shorts`. Skrypt nie dubluje silnika TTS/FFmpeg i nie publikuje filmu. Wymaga uruchomionej aplikacji Node oraz jej standardowej konfiguracji sekretów. Dla wdrożenia ustaw `BANKIER_SHORTS_API_TOKEN` w środowisku procesu skryptu; bez niego skrypt celowo odmawia wywołania API.

```bash
# Terminal 1 — w katalogu repozytorium
npm install
# Skonfiguruj .env na podstawie .env.example, w tym klucze usług i BANKIER_SHORTS_API_TOKEN
npm run dev

# Terminal 2 — lista newsów, wybór i potwierdzenie przed renderem
python3 scripts/bankier_article_to_mp4.py

# Lub jawnie wybierz najnowszy artykuł i uruchom render bez pytania
python3 scripts/bankier_article_to_mp4.py --latest --yes

# Po renderze wyślij na Telegram prośbę o akceptację gotowego MP4
python3 scripts/bankier_article_to_mp4.py --latest --yes --telegram-approval

# W przypadku wdrożonej instancji użyj jej adresu HTTPS
python3 scripts/bankier_article_to_mp4.py --latest --app-url https://twoja-instancja.example --yes --telegram-approval
```

Pełną treść strony skrypt pobiera przed renderem. Jeśli Bankier.pl nie udostępni jej w HTML, domyślnie zatrzyma się; `--allow-summary-only` zezwala na render wyłącznie z opisu RSS. MP4 i plik JSON z metadanymi trafiają domyślnie do `exports/`. Użyj `--help`, aby zobaczyć wszystkie opcje.

---

## 🔐 Zmienne Środowiskowe (`.env`)

Skopiuj plik `.env.example` do `.env`. Na Fly.io sekrety ustawiaj przez `fly secrets` lub panel, nie przez `fly.toml`. `BANKIER_SHORTS_API_TOKEN` musi mieć tę samą wartość w środowisku aplikacji Fly i procesu uruchamiającego skrypt automatyzacji.

| Zmienna | Wymagana | Opis |
|---|---|---|
| `PORT` | Nie (domyślnie 3000) | Port nasłuchiwania serwera Express |
| `APP_LOGIN_PASSWORD` | Tak | Hasło do prywatnego panelu; ustaw jako sekret wdrożenia |
| `APP_AUTH_SECRET` | Tak | Losowy sekret o długości co najmniej 32 znaków do podpisywania sesji |

| `BANKIER_SHORTS_API_TOKEN` | Tak dla automatyzacji | Losowy, poufny token Bearer dla skryptów i integracji serwerowych |
| `SUPABASE_URL` | Nie | HTTPS URL projektu Supabase; wymagany do zapisu historii zadań w Postgresie |
| `SUPABASE_KEY` | Nie | Klucz secret/service_role używany wyłącznie po stronie serwera; wymagany razem z `SUPABASE_URL` |
| `TELEGRAM_BOT_TOKEN` | Tak dla akceptacji | Token bota Telegram z BotFather; wyłącznie w sekretach serwera |
| `TELEGRAM_CHAT_ID` | Tak dla akceptacji | ID prywatnego czatu (lub grupy) z wybranym botem; wskazuje, gdzie trafiają wideo i prośby o poprawki |
| `TELEGRAM_WEBHOOK_SECRET` | Tak dla przycisków i komentarzy | Losowy sekret nagłówka webhooka Telegram; minimum praktycznie 32 losowe znaki, wyłącznie po stronie serwera |
| `TELEGRAM_APPROVER_USER_ID` | Wymagane dla grup | ID konta Telegram, które może podejmować decyzje w grupie; w prywatnym czacie nadawca jest porównywany z `TELEGRAM_CHAT_ID` |
| `TELEGRAM_REGISTER_WEBHOOK_ON_START` | Nie | Domyślnie `true`; ustawić `false`, aby wyłączyć automatyczną rejestrację webhooka |
| `GEMINI_API_KEY` | Dla generowania AI | Klucz do modeli Gemini używanych przez scenopisarstwo i analizę |
| `ELEVENLABS_API_KEY` | Tak dla TTS | Klucz ElevenLabs. Bez niego render TTS kończy się czytelnym błędem; nie ma fallbacku do Google/Edge. |
| `ELEVENLABS_VOICE_ID` | Nie | Domyślnie `onwK4e9ZLuTAKqWW03F9` (Daniel, premade); można wybrać inny głos z katalogu konta w interfejsie. |
| `ELEVENLABS_MODEL_ID` | Nie | Domyślnie `eleven_multilingual_v2`. |
| `PEXELS_API_KEY` | Wymagana dla Auto-Pilota | Klucz Pexels API; Auto-Pilot dobiera osiem różnych, pionowych klipów wideo. Jeśli nie znajdzie kompletu, pokaże komunikat o problemie i przerwie render — nie podstawi przypadkowych klipów. Ręcznie podane adresy scen nadal można renderować bez klucza. |
| `TELEGRAM_BOT_TOKEN` | Wymagana dla akceptacji | Token bota Telegrama. Przechowuj wyłącznie w sekretach środowiska wdrożenia. |
| `TELEGRAM_CHAT_ID` | Wymagana dla akceptacji | ID jednego prywatnego czatu lub grupy, do którego trafiają shorty i poprawki. |
| `TELEGRAM_WEBHOOK_SECRET` | Wymagana dla przycisków i komentarzy | Losowy sekret webhooka przekazywany przez Telegram w nagłówku `X-Telegram-Bot-Api-Secret-Token`. |
| `TELEGRAM_REGISTER_WEBHOOK_ON_START` | Nie (domyślnie `true`) | Ustaw `false`, aby wyłączyć automatyczną rejestrację webhooka. Rejestracja zmienia webhook danego bota; używaj wyłącznie dla bota dedykowanego tej aplikacji. |
| `TELEGRAM_APPROVER_USER_ID` | Wymagane dla grup | Ogranicza decyzje w grupie do wskazanego konta Telegram; w prywatnym czacie ID nadawcy musi być zgodne z `TELEGRAM_CHAT_ID`. |

### Akceptacja shorta przez Telegram

Ustaw `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` i publiczny adres HTTPS w `APP_URL`. Gdy wszystkie są obecne, aplikacja automatycznie rejestruje webhook dla przycisków i odpowiedzi z komentarzem. Każdy render w Auto-Pilocie, harmonogramie lub endpointach renderujących shorty automatycznie wysyła do wskazanego czatu **załączony plik MP4** z przyciskami **Akceptuję** i **Odrzucam** (limit 45 MB). Akceptacja zapisuje stan, ale nie publikuje filmu. Bez konfiguracji Telegrama render może się zakończyć, natomiast wysyłka zgłosi błąd w historii zadania.

---

© 2026 RaportFinansowy24. Wszelkie prawa zastrzeżone.
