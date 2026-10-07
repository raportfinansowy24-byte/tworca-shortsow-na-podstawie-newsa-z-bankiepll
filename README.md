# RaportFinansowy24 — Make Video Scene Combiner Connector 🚀

Zaawansowany silnik automatyzacji produkcji wideo pionowego (Shorts, TikTok, Instagram Reels) dla portalu **RaportFinansowy24**, w pełni zintegrowany z **Make.com**, **n8n**, **Google Drive** oraz nowoczesnymi silnikami syntezy mowy **Neural TTS**.

---

## 📋 Spis treści

- [Architektura systemu](#architektura-systemu)
- [Główne funkcje i moduły](#główne-funkcje-i-moduły)
- [Silnik Lektora TTS i Profile Głosowe](#silnik-lektora-tts-i-profile-głosowe)
- [Integracja Google Drive (Google Workspace)](#integracja-google-drive-google-workspace)
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
│  - Wielosilnikowy generator mowy: Edge Neural HD + ElevenLabs fallback │
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

## 📁 Integracja Google Drive (Google Workspace)

Aplikacja posiada certyfikowaną integrację z Google Drive API:
- **Logowanie klienta**: Bezpieczny przepływ OAuth 2.0 bez ujawniania sekretów po stronie klienta.
- **Bezpośredni eksport wyrenderowanych wideo**: Zapis plików MP4 prosto do dedykowanego folderu `RaportFinansowy24 Videos` na Dysku Google użytkownika.
- **Przeglądarka plików Dysku**: Wyszukiwanie, podgląd rozmiaru i pobieranie wideo z Dysku do scen w kreatorze.
- **Kopia scenariuszy**: Zapisywanie wygenerowanych przez AI skryptów i transkrypcji w formacie Markdown bezpośrednio na Dysku Google.

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
- `POST /api/tts/preview`: Generuje natychmiastową próbkę wybranego głosu lektorskiego dla podanego tekstu.
- `GET /api/tts/voices`: Zwraca pełen katalog dostępnych głosów wraz z ich parametrami i opisami.

---

## 🔒 Zasady Bezpieczeństwa i Zgodności

- **Sekrety**: Żadne klucze API (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, itp.) nie są kompilowane do bundle'a przeglądarki klienta — wszystkie zapytania zewnętrzne są przetwarzane po stronie serwera Node.js.
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

## 🔐 Zmienne Środowiskowe (`.env`)

Skopiuj plik `.env.example` do `.env` i uzupełnij opcjonalne klucze:

| Zmienna | Wymagana | Opis |
|---|---|---|
| `PORT` | Nie (domyślnie 3000) | Port nasłuchiwania serwera Express |
| `GEMINI_API_KEY` | Opcjonalna | Klucz do modeli Gemini dla zaawansowanego scenopisarstwa |
| `ELEVENLABS_API_KEY` | Opcjonalna | Klucz do ElevenLabs (w przypadku braku używany jest silnik Edge Neural) |
| `PEXELS_API_KEY` | Opcjonalna | Klucz do dynamicznego wyszukiwania klipów w Pexels API |

---

© 2026 RaportFinansowy24. Wszelkie prawa zastrzeżone.
