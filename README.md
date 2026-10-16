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
- **Bezpośredni eksport wyrenderowanych wideo**: Zapis plików MP4 prosto do dedykowanego folderu `RaportFinansowy24 Videos` na Dysku Google użytkownika.
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

---

## 🔄 Automatyzacja Make.com i n8n

W folderze aplikacji znajduje się gotowy moduł HTTP Connector:
- Obsługa asynchroniczna (`async: true`) z webhookiem zwrotnym (`webhookUrl`) lub synchroniczna zwracająca od razu URL do gotowego pliku MP4.
- Możliwość pobrania gotowego szablonu scenariusza Make (`blueprint.json`) bezpośrednio z panelu.
- Obsługa aliasów pól (`voice`, `ttsVoice`, `lektor`, `ttsSpeed`, `speed`, `video_url`, `url`, `tekst_głosowy`).

---

## 📡 Kontrakty API i Endpointy

### 1. `POST /api/combine-scenes`
Łączy przekazaną tablicę scen w jeden film MP4.

```json
{
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
- **Dostęp do API**: wszystkie trasy `/api/*` wymagają tokenu Firebase ID z konta `raportfinansowy24@gmail.com` albo osobnego `BANKIER_SHORTS_API_TOKEN`. Wyjątki to wyłącznie `GET /api/health` oraz webhook Telegrama, który sprawdza własny sekret nagłówka.
- **Logowanie przeglądarkowe**: bramka Google/Firebase prosi tylko o potwierdzenie tożsamości; nie żąda zakresów Google Drive. Token Firebase jest dołączany tylko do żądań API tej samej aplikacji.
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
| `FIREBASE_PROJECT_ID` | Tak | Firebase project ID używany do weryfikacji tokenów ID po stronie serwera |
| `AUTOPILOT_ALLOWED_EMAILS` | Tak | Dozwolone adresy e-mail rozdzielone przecinkami; w tym wdrożeniu `raportfinansowy24@gmail.com` |
| `BANKIER_SHORTS_API_TOKEN` | Tak dla automatyzacji | Losowy, poufny token Bearer dla skryptów i integracji serwerowych |
| `GEMINI_API_KEY` | Dla generowania AI | Klucz do modeli Gemini używanych przez scenopisarstwo i analizę |
| `ELEVENLABS_API_KEY` | Tak dla TTS | Klucz ElevenLabs. Bez niego render TTS kończy się czytelnym błędem; nie ma fallbacku do Google/Edge. |
| `ELEVENLABS_VOICE_ID` | Nie | Domyślnie `onwK4e9ZLuTAKqWW03F9` (Daniel, premade); można wybrać inny głos z katalogu konta w interfejsie. |
| `ELEVENLABS_MODEL_ID` | Nie | Domyślnie `eleven_multilingual_v2`. |
| `PEXELS_API_KEY` | Opcjonalna | Klucz do dynamicznego wyszukiwania klipów w Pexels API |
| `TELEGRAM_BOT_TOKEN` | Opcjonalna | Token bota Telegrama. Przechowuj wyłącznie w sekretach środowiska wdrożenia. |
| `TELEGRAM_CHAT_ID` | Wymagana dla Telegram approval | Docelowy czat, do którego trafia prośba o akceptację. |
| `TELEGRAM_WEBHOOK_SECRET` | Wymagana dla Telegram approval | Losowy sekret webhooka przekazywany przez Telegram w nagłówku `X-Telegram-Bot-Api-Secret-Token`. |
| `TELEGRAM_REGISTER_WEBHOOK_ON_START` | Nie (domyślnie `false`) | Ustaw `true`, aby aplikacja zarejestrowała Telegram webhook przy starcie. Używaj wyłącznie dla bota przeznaczonego dla tej aplikacji — rejestracja zmienia webhook bota. |
| `TELEGRAM_APPROVER_USER_ID` | Opcjonalna | Ogranicza przyciski akceptacji do jednego konta Telegram; zalecane dla grup. |

### Akceptacja shorta przez Telegram

Ustaw `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` i `TELEGRAM_WEBHOOK_SECRET` w sekretach wdrożenia oraz publiczny adres HTTPS w `APP_URL`. Dla bota dedykowanego tej aplikacji ustaw `TELEGRAM_REGISTER_WEBHOOK_ON_START=true`; aplikacja zarejestruje wtedy webhook i obsłuży przyciski. Uruchom skrypt z `--telegram-approval` (albo wyślij `telegramApproval: true` do `/api/auto-pilot-shorts`), aby po zakończeniu renderu wysłać do wskazanego czatu **załączony plik MP4** z przyciskami **Akceptuję** i **Odrzucam**. Limit załącznika wynosi 45 MB. Decyzja jest zapisywana przy zadaniu, a podpis wiadomości aktualizowany; samo zaakceptowanie nie publikuje filmu. Bez konfiguracji Telegrama render może się zakończyć, ale status zadania pokaże błąd wysyłki prośby.

---

© 2026 RaportFinansowy24. Wszelkie prawa zastrzeżone.
