# RaportFinansowy24 — Stage 0: kontrakty i baseline

**Status:** DRAFT — wymaga akceptacji właściciela projektu
**Zakres:** dokumentacja-only; bez implementacji, migracji, deployu, schedulerów i produkcji
**Repozytorium:** `raportfinansowy24-byte/tworca-shortsow-na-podstawie-newsa-z-bankiepll`
**Baseline audytu:** `fe27d4da6e692e2f9b7d8aa732973b071ab16f8a`
**Bieżący `origin/main`:** `fe27d4da6e692e2f9b7d8aa732973b071ab16f8a`

## Cel

Stage 0 zamyka decyzje, od których zależy implementacja Phase 2. Nie zmienia kodu. Jego wynikiem jest jeden uzgodniony zestaw kontraktów, do którego późniejsze zmiany muszą się odwoływać.

Kolejność implementacji po akceptacji pozostaje następująca:

```text
Stage 0: kontrakty i baseline
  → historia i trwałość
  → kontrola generowanych artefaktów w Git
  → provider-neutral model aktywów
  → bounded QA repair i retry
  → lifecycle jobów, SSE i bezpieczeństwo eksportów
  → pełny test E2E
```

Retry ma decyzję o budżecie w Stage 0, ale nie może być implementowany przed zakończeniem provider-neutral modelu aktywów i repair result.

## Rekomendowane kontrakty techniczne

### 1. Czas scen

Storyboard, który przechodzi walidację, jest źródłem prawdy dla `scene.duration`. `/combine-scenes` respektuje przekazane czasy i nie nadpisuje ich cichym stałym harmonogramem. Ten sam timeline musi być używany przez TTS alignment, captions, stock sampling, visual QA i FFmpeg.

Test akceptacyjny: payload z czasami `2.1`, `3.7` i `4.4` sekund; każdy downstream otrzymuje identyczny harmonogram, a `ffprobe` potwierdza zgodny czas finalnego artefaktu.

### 2. Liczba scen

Rekomendacja: wspólny kontrakt 4–8 scen. Wartości 3 i 9 są odrzucane przed renderem. CTA i wymagane elementy planu muszą być walidowane niezależnie od liczby scen.

Test akceptacyjny: 4, 6 i 8 przechodzą kontrakt; 3 i 9 są odrzucane; brak cichego dzielenia lub dopisywania scen.

### 3. Polityka assetów i fallbacku

Rekomendacja: `matched_stock → verified_evidence → data_visual`. Losowy stock nie może być używany tylko po to, aby wypełnić scenę. Każda scena raportuje `assetKind`, `selectionReason` i fallback reason.

Test akceptacyjny: kontrolowane braki stocku uruchamiają kolejno evidence i data visual; telemetryka rejestruje wybraną ścieżkę.

### 4. Provider-neutral asset identity

Wspólny model aktywu powinien zawierać co najmniej:

```text
provider
providerAssetId
canonicalAssetId
assetType
sourceUrl
licenseMetadata
metadata
selectionReason
```

Downstream nie powinien zależeć od `pexelsId` jako nazwy dla zasobu Pixabay. Stare pola mogą być czytane przez adapter migracyjny, ale nowe operacje repair i telemetryka używają modelu kanonicznego.

Test akceptacyjny: asset Pexels i asset Pixabay przechodzą przez selection, sampling, QA, repair i telemetrykę bez provider-specific warunku w downstream.

### 5. Retry budget

Rekomendacja do akceptacji: maksymalnie 2 próby naprawcze po pierwszej ocenie QA, maksymalnie 90 sekund i maksymalnie 12 wywołań providerów w całym cyklu naprawy jednego joba. Budżet jest globalny dla joba i nie resetuje się per scena. Limit finansowy, jeśli provider go udostępnia, jest dodatkowym ograniczeniem.

Żaden kod nie może używać `Infinity` jako domyślnego limitu produkcyjnego.

Test akceptacyjny: wymuszony trwały QA failure kończy się po budżecie; żadna ścieżka nie resetuje licznika ani nie omija limitu.

### 6. Statusy terminalne

Rekomendacja: pięć rozłącznych statusów końcowych:

```text
completed — poprawne zakończenie
failed — błąd wykonania
cancelled — jawne anulowanie
timed_out — przekroczony limit czasu
exhausted — wyczerpany budżet retry/napraw
```

Status terminalny jest niezmienny wobec opóźnionych eventów, z wyjątkiem jawnej procedury administracyjnej.

Test akceptacyjny: osobne scenariusze dla wszystkich pięciu statusów oraz test opóźnionych/duplikowanych eventów.

### 7. Historia jobów

Rekomendacja: Supabase jest autorytatywnym źródłem historii; lokalny JSON jest cache/recovery layer. Outbox zapewnia ponawianie synchronizacji, a snapshoty mają idempotency key. Hydracja nie może przywrócić usuniętego rekordu.

Test akceptacyjny: Supabase niedostępne podczas zapisu, restart, drain outboxa, jeden rekord po synchronizacji; osobno delete i ponowna hydracja.

### 8. Retencja i usuwanie

Rekomendacja: `delete/clear history` obejmuje job, lokalny cache, dane Supabase, retry metadata, powiązaną telemetrykę oraz pliki należące wyłącznie do joba, zgodnie z polityką retencji. Pliki współdzielone lub opublikowane wymagają jawnego wyjątku i właściciela.

Test akceptacyjny: delete pojedynczego joba i clear-all; kontrola wszystkich tabel, cache, plików i ponownej hydracji.

### 9. Dostęp do eksportów

Rekomendacja: eksporty są prywatne domyślnie; publiczne dopiero po świadomej operacji publikacji. Prywatny preview/download używa autoryzacji lub krótkiego signed URL. CORS nie jest traktowany jako mechanizm autoryzacji.

Test akceptacyjny: anonimowy klient nie pobiera prywatnego eksportu; uprawniony użytkownik pobiera; opublikowany asset jest publiczny zgodnie z kontraktem.

## Decyzje wymagające zatwierdzenia właściciela

| Nr | Decyzja | Rekomendacja | Status |
|---:|---|---|---|
| 1 | Źródło czasu scen | storyboard / zaakceptowane `scene.duration` | DO AKCEPTACJI |
| 2 | Zakres scen | 4–8 | DO AKCEPTACJI |
| 3 | Fallback | stock → evidence → data visual | DO AKCEPTACJI |
| 4 | Model providerów | provider-neutral | DO AKCEPTACJI |
| 5 | Retry | 2 próby / 90 s / 12 wywołań na job | DO AKCEPTACJI |
| 6 | Wyczerpanie budżetu | osobny `exhausted` | DO AKCEPTACJI |
| 7 | Historia | Supabase + local cache + outbox | DO AKCEPTACJI |
| 8 | Retencja | job + dane powiązane + pliki należące do joba | DO AKCEPTACJI |
| 9 | Eksporty | prywatne domyślnie, publiczne po publikacji | DO AKCEPTACJI |
| 10 | Statusy | `completed`, `failed`, `cancelled`, `timed_out`, `exhausted` | DO AKCEPTACJI |

## Zakres techniczny po akceptacji, ale jeszcze bez implementacji

Po zaakceptowaniu decyzji można przygotować:

- wersjonowany `ScenePlanContract`;
- diagram maszyny stanów joba;
- typ provider-neutral asset;
- macierz fallbacków i błędów retry;
- politykę outbox/idempotency/retention;
- macierz prywatnych i publicznych URL-i;
- test plan dla historii, retry, lifecycle, SSE, eksportów i E2E.

Nie jest to zgoda na edycję kodu. To lista kontraktów do implementacji w kolejnych PR-ach.

## Kryteria zamknięcia Stage 0

Stage 0 jest zamknięty, gdy:

1. właściciel zatwierdzi albo zmieni wszystkie 10 decyzji;
2. każda decyzja ma test akceptacyjny;
3. każda pozycja `issues_register.json` ma przypisany etap i kontrakt;
4. retry budget ma twarde maksimum;
5. statusy terminalne są rozłączne;
6. model historii i retencji jest jednoznaczny;
7. model private/public eksportów jest jednoznaczny;
8. nie ma konfliktu między `sceneCount`, `scene.duration`, QA, TTS i FFmpeg.

## STOP

Do czasu akceptacji właściciela nie wolno:

- zmieniać kodu ani migracji;
- zmieniać `.gitignore`, CI lub konfiguracji Fly;
- usuwać artefaktów z historii Git;
- zmieniać schedulerów;
- wykonywać deployu;
- uruchamiać generatora produkcyjnego;
- wykonywać płatnych wywołań ani operacji na produkcyjnych danych.

Ten dokument jest propozycją kontraktów Stage 0, a nie ich zatwierdzeniem.
