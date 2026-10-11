# Sztywny Limit 18 Sekund dla Autonomicznego Generatora Wideo Shorts

Plan wdrożenia wymuszenia równego 18-sekundowego czasu trwania (2 sceny po dokładnie 9.0s) dla autonomicznych wydań wideo Shorts portalu **raport-finansowy24.pl**.

### User Review & Critical Decisions

> [!IMPORTANT]
> Użytkownik potwierdził wybór: **Sztywne 18 sekund (skrócenie zdań i dopasowanie tempa lektora)**.

- **Wybrany czas trwania**: Równo 18.0 sekund (2 sceny x 9.0s).
- **Strategia adaptacji**: 
  1. Skrócenie limitu słów w promptach Gemini do max 12–14 słów na scenę 9s (tak, by odczyt liczb i skrótów nie przekraczał 8.5s).
  2. Inteligentne tempo lektora (Edge TTS / ElevenLabs): jeśli lektor w scenie przekroczy 8.5s, tempo TTS jest automatycznie dynamicznie podbijane (np. do 1.25x–1.35x), aby zamknąć nagranie przed 9.0s.
  3. Twardy limit sceny w FFmpeg: wyłączenie niekontrolowanego rozciągania sceny ponad 9.0s w trybie autonomicznym (`maxSceneDuration: 9.0s`, `totalDuration: 18.0s`).

---

### 1. Overview & Core Concept

- **Problem**: Ostatnie wideo trwało 29.43 sekundy, ponieważ `syncDurationWithVoice` automatycznie wydłużało kadry wideo do pełnego czasu trwania audio TTS, a Gemini wygenerowało zbyt długie zdania z liczbami i nazwami instytucji (14.7s na scenę).
- **Rozwiązanie**: Wdrożenie trójstopniowego zabezpieczenia 18 sekund:
  - **Krok 1 (Prompt AI)**: Ścisła dyscyplina słów w Gemini (maksymalnie 12–14 słów na scenę 1 i scenę 2).
  - **Krok 2 (TTS Speed Calibration)**: Obliczenie czasu trwania wygenerowanego audio i ewentualne dynamiczne przyspieszenie tempa lektora, aby audio zawsze trwało poniżej 8.8s.
  - **Krok 3 (FFmpeg Strict Cap)**: Sztywny clamp czasu trwania każdej sceny do `min(syncedDuration, 9.0s)`, gwarantujący, że film nigdy nie przekroczy 18.0 sekund.

---

### 2. User Experience & Visual Design

- **Panel Auto-Pilot**:
  - Wskaźnik formatu: `18.0s (Sztywny czas Shorts: 2x 9.0s)`.
  - Wizualny badge: `⏱️ 18s Strict Mode (Automatyczna kompresja lektora)`.
- **Historia wydań schedulera**:
  - Każde nowe wygenerowane wideo w historii ma czas trwania równy `18.0s`.
- **Napisy libass Montserrat-Bold**:
  - Zachowanie centralnej pozycji (`Alignment: 5`) i powiększonego rozmiaru (68–70px, 130% proporcjonalnej skali) w stylu `single-word` na czerwono.

---

### 3. Key Product Decisions & Trade-Offs

- **Dyscyplina tekstu vs Pełny wywód**:
  - *Decyzja*: Skracamy zdania generowane przez Gemini do ultra-zwięzłych, dynamicznych zdań staccato (8 słów hook + 6 słów fakt w Scenie 1; 8 słów wniosek + 5 słów CTA w Scenie 2).
  - *Dlaczego*: Krótkie zdania drastycznie zwiększają wskaźnik retencji (Retention Rate) w algorytmach YouTube Shorts i TikTok w pierwszych 3 sekundach.
- **Dynamiczne tempo TTS vs Ucinanie audio**:
  - *Decyzja*: Jeśli lektor czyta zdanie w 9.6s, silnik automatycznie regeneruje audio z przyspieszeniem `speed = 1.30x`, zamiast ucinać dźwięk.
  - *Dlaczego*: Pełna zrozumiałość każdego słowa bez ucięć w połączeniu ze sztywnym czasem 18.0s.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Gemini AI Viral Script                      │
│      Constraint: Dokładnie 12-14 słów na scenę 9s           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Edge / ElevenLabs TTS Synthesis                  │
│   Jeśli TTS > 8.7s ──► Regeneruj z wyższym tempem (do 1.35x)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          FFmpeg Scene Renderer (Strict 9.0s Cap)            │
│         Scena 1: 9.0s + Scena 2: 9.0s = Dokładnie 18.0s     │
└─────────────────────────────────────────────────────────────┘
```

- **Pliki objęte zmianami po akceptacji**:
  - `server.ts`:
    - Zaostrzenie promptu Gemini (`DOKŁADNIE 12 do 14 słów na scenę`, bez długich wyliczanek).
    - Mechanizm `strictDurationCap: 9.0` w `processCombineScenesJob`.
    - Auto-korekta tempa TTS, jeśli estymowany czas przekracza 8.7s.
  - `src/components/AiViralAutoPilot.tsx`:
    - Aktualizacja etykiet i podglądu gwarantowanego czasu trwania (18s).
