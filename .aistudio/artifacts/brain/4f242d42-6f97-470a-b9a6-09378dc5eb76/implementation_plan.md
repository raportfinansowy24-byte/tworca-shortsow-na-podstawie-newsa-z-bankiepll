# Diagnostyka i Naprawa Zawieszonego Renderowania Wideo w Tle (FFmpeg & Auto-Pilot)

## Podsumowanie i Cel Planu
Użytkownik zgłosił zawieszenie procesu renderowania wideo w tle ("Dlaczego stoi?") oraz zapytał o dokładny przycisk uruchamiania tworzenia i anulowanie/usunięcie konkretnych zadań. Plan definiuje architekturę aktywnego nadzoru procesów (Watchdog & Kill Controller), usuwa wiszące zadania oraz dodaje natychmiastowe zabezpieczenia timeoutowe dla pobierania wideo i enkodowania FFmpeg, gwarantując niezawodność 1-kliknięciowego tworzenia Shortów.

---

## Przegląd Decyzji i Potwierdzenia Użytkownika

> [!IMPORTANT]
> **Zdiagnozowana przyczyna zawieszenia ("Dlaczego stoi?"):**
> 1. **Brak limitu czasu (timeout) pobierania wideo:** Funkcja `downloadFile` oczekiwała bez limitu czasu na odpowiedź serwerów zewnętrznych (Pexels / CDN). Jeśli serwer nie domknął połączenia lub limitował transfer, wątek renderera czekał w nieskończoność.
> 2. **Brak mechanizmu zabijania procesów potomnych (Kill Controller):** Usunięcie zadania z bazy/pamięci (`DELETE /api/jobs/:id`) nie wysyłało sygnału `SIGKILL`/`SIGTERM` do trwającego procesu `ffmpeg` ani `AbortController` do pobierania.
> 3. **Brak watchdoga enkodowania sceny:** Brak maksymalnego czasu renderowania pojedynczej sceny (np. 90 s), przez co błąd potoku FFmpeg blokował całą kolejkę.
> 4. **Przycisk tworzenia:** Wskazujemy i wyróżniamy w interfejsie główny przycisk **„🚀 Generuj i Zmontuj Wirusowy Short (100% Pełny Automat)”** oraz przycisk harmonogramu **„Uruchom cykl teraz (Wymuś start)”**.

- **Potwierdzona diagnoza w Fazie 1**: Zawieszenie dotyczy renderowania wideo w tle (opcja 2).
- **Zadania do wyczyszczenia**: Anulowanie i usunięcie identyfikatorów `job_auto_1791760537736_7oqem`, `job_make_1789906931414_2zhs7` oraz wszystkich zablokowanych zadań sierocych.

---

## 1. Przegląd i Główna Koncepcja (Overview & Core Concept)

- **Co to rozwiązuje**: Eliminuje zjawisko "wiszących" zadań renderowania w tle. Nawet w przypadku awarii sieci zewnętrznej (Pexels CDN) lub błędu kodeka FFmpeg, system automatycznie wykryje brak postępu w ciągu 20–30 sekund, przerwie zablokowane operacje, przełączy się na wygenerowane lokalnie płynne tło 720p i sfinalizuje montaż bez zatrzymywania pipeline'u.
- **Grupa docelowa**: Redaktor kanału RaportFinansowy24 publikujący filmy Shorts w trybie jedno-klikowym lub automatycznym.
- **Wartość kluczowa**: 100% gwarancja ukończenia renderu bez konieczności restartu serwera lub ręcznego czyszczenia procesów z poziomu konsoli.

---

## 2. Doświadczenie Użytkownika i Interfejs (User Experience & UI)

### 2.1. Identyfikacja Przycisków Uruchamiania Tworzenia
W interfejsie użytkownik ma dwa główne miejsca startu:
1. **Pojedynczy Short na żądanie (1-klik)**: W zakładce **Auto-Pilot** -> duży fioletowo-bursztynowy przycisk **„🚀 Generuj i Zmontuj Wirusowy Short (100% Pełny Automat)”**.
2. **Harmonogram Bankier.pl (Wymuszenie slotu)**: W sekcji **Harmonogram Auto-Pilot** -> przycisk **„Uruchom cykl teraz (Wymuś start)”**.
3. **Kreator Ręczny (Make / Sceny)**: W zakładce **Sceny & Lektor** -> przycisk **„Renderuj Wideo (FFmpeg)”**.

Wprowadzimy wizualne podświetlenie (akcentujące pulsujące obramowanie i plakietkę "Główny Przycisk Startu") dla jasnej nawigacji.

### 2.2. Panel Kolejki Renderowania (`RenderingQueue`)
- **Przycisk "Zatrzymaj i Usuń" (Kill & Purge)**: Przy każdym zadaniu o statusie `processing` lub `queued` pojawi się czerwony przycisk z ikoną `Square/Octagon`, który natychmiastowo przerywa działający proces FFmpeg i zwalnia zasoby.
- **Wskaźnik Watchdoga i Statusu na Żywo**: Pasek postępu będzie wyświetlał informację np. `Pobieranie klipów (limit 25s)` lub `Renderowanie Sceny 1/2 (aktywne)`. W przypadku przekroczenia czasu wyświetli się czytelny komunikat: `Przełączono na lokalne tło zastępcze`.

---

## 3. Kluczowe Decyzje Techniczne i Kompromisy

- **Decyzja 1: Aktywny AbortController & Child Process Registry**
  - *Podejście*: Serwer rejestruje instancje procesów FFmpeg oraz żądania HTTP w mapie `activeJobExecutors: Map<string, { kill: () => void, abort: AbortController }>`.
  - *Dlaczego*: Endpoint `DELETE /api/jobs/:jobId` fizycznie zabija proces `ffmpeg.kill('SIGKILL')` i przerywa strumień pobierania, natychmiast odblokowując kolejkę.
- **Decyzja 2: Limit Czasu dla Pobierania z Pexels (25 sekund)**
  - *Podejście*: Do każdego żądania pobierania wideo dodajemy twardy timeout 25 s (`request.setTimeout(25000)`). W razie timeoutu lub błędu, system natychmiast generuje lokalne tło wideo w rozdzielczości 720x1280 bez przerywania całego filmu.
- **Decyzja 3: Watchdog FFmpeg (90 sekund na scenę)**
  - *Podejście*: Jeśli FFmpeg nie zgłosi żadnego postępu klatek przez 45 sekund lub cała scena renderuje się ponad 90 sekund, proces jest zabijany i zastępowany trybem `safe-renderer`.

---

## 4. Architektura Techniczna i Przepływ Danych

```
┌────────────────────────────────────────────────────────┐
│                   Klient React                         │
│  [🚀 Generuj Short]  lub  [Uruchom Cykl Teraz]          │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/combine-scenes
                            ▼
┌────────────────────────────────────────────────────────┐
│              Serwer Express (server.ts)                │
│                                                        │
│   Active Process Registry:                             │
│   activeJobExecutors.set(jobId, { kill, abort })       │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │ 1. Download Video (Timeout: 25s)              │   │
│   │    - Sukces: Pexels MP4                        │   │
│   │    - Timeout: Local Fallback Canvas/FFmpeg     │   │
│   └───────────────────────┬────────────────────────┘   │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │ 2. TTS & Word-by-Word Subtitles (Edge/Eleven)  │   │
│   └───────────────────────┬────────────────────────┘   │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │ 3. FFmpeg Concat & Filter (Watchdog: 90s)      │   │
│   │    - Monitoring postępu przez SSE              │   │
│   │    - SIGKILL przy DELETE /api/jobs/:jobId      │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Plan Wdrożenia:
1. **Czyszczenie zaległych zadań**: Usunięcie z `jobsStore` i pliku `exports/jobs_history.json` żądanych zadań `job_auto_1791760537736_7oqem` oraz `job_make_1789906931414_2zhs7`.
2. **Dodanie Process Manager & Kill Switch w `server.ts`**:
   - Rejestracja `activeJobExecutors`.
   - Obsługa `kill()` w `DELETE /api/jobs/:jobId`.
   - Dodanie timeoutów do `downloadFile` (25s) oraz `runFfmpegWithProgress` (90s watchdog).
3. **Wizualne wyróżnienie przycisków startu w UI (`AiViralAutoPilot.tsx`)**:
   - Wyraźne oznaczenie przycisku głównego "1-klik tworzenie".
   - Dodanie przycisku "Zatrzymaj natychmiast" w kolejce renderowania.
4. **Weryfikacja**:
   - Test kompilacji `compile_applet`.
   - Test zatrzymywania i odporności na zerwane połączenia.
