# RaportFinansowy24 — Stage 0: kontrakty i baseline

**Status:** CHANGES REQUESTED — decyzje recenzenckie przyjęte, wymaga ponownego przeglądu
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

Storyboard, który przechodzi walidację, jest źródłem prawdy dla `scene.duration`. `/combine-scenes` respektuje przekazane czasy i nie nadpisuje ich cichym stałym harmonogramem. Ten sam timeline musi być używany przez TTS alignment, captions, stock sampling, visual QA i FFmpeg. Lektor pozostaje jedną ciągłą, nieciętą ścieżką audio; czasy scen służą do mapowania narracji, nie do cięcia lektora na osobne pliki.

Test akceptacyjny: payload z czasami `2.1`, `3.7` i `4.4` sekund; każdy downstream otrzymuje identyczny harmonogram, lektor jest jednym plikiem/strumieniem bez cięć, a `ffprobe` potwierdza zgodny czas finalnego artefaktu.

### 2. Liczba scen

Rekomendacja: wspólny kontrakt 4–8 scen. Wartości 3 i 9 są odrzucane przed renderem. CTA i wymagane elementy planu muszą być walidowane niezależnie od liczby scen.

Test akceptacyjny: każda liczba 4, 5, 6, 7 i 8 przechodzi kontrakt; 3 i 9 są odrzucane; brak cichego dzielenia lub dopisywania scen.

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

Rekomendacja przyjęta do ponownego przeglądu: maksymalnie 2 próby naprawcze po pierwszej ocenie QA, maksymalnie 90 sekund i maksymalnie 12 wywołań providerów w całym cyklu naprawy jednego joba. Budżet jest globalny dla joba i nie resetuje się per scena. Nie wykonuje się płatnych wywołań bez osobnej zgody właściciela. Limit finansowy, jeśli provider go udostępnia, jest dodatkowym ograniczeniem.

Żaden kod nie może używać `Infinity` jako domyślnego limitu produkcyjnego.

Test akceptacyjny: wymuszony trwały QA failure kończy się po budżecie; żadna ścieżka nie resetuje licznika ani nie omija limitu.

### 6. Statusy terminalne

Rekomendacja: pięć rozłącznych statusów końcowych. `timed_out` jest zarezerwowany dla przekroczenia globalnego limitu czasu joba; wyczerpanie budżetu napraw QA kończy się jako `exhausted`.

```text
completed — poprawne zakończenie
failed — błąd wykonania
cancelled — jawne anulowanie
timed_out — przekroczony limit czasu
exhausted — wyczerpany budżet retry/napraw
```

Status terminalny jest niezmienny wobec opóźnionych eventów, z wyjątkiem jawnej procedury administracyjnej.

Reguły przejść: `queued → processing`; z `processing` można przejść tylko do jednego z `completed`, `failed`, `cancelled`, `timed_out` albo `exhausted`; status terminalny nie przechodzi do innego statusu terminalnego przez opóźniony lub zduplikowany event. `cancelled` oznacza jawne anulowanie, `timed_out` globalny deadline, a `exhausted` wyczerpanie limitu napraw.

Test akceptacyjny: osobne scenariusze dla wszystkich pięciu statusów, testy przejść `queued/processing`, test opóźnionych/duplikowanych eventów oraz test, że terminalny status pozostaje niezmienny.

### 7. Historia jobów

Rekomendacja: Supabase jest autorytatywnym źródłem historii; lokalny JSON jest cache/recovery layer. Outbox zapewnia ponawianie synchronizacji, a snapshoty mają idempotency key. Hydracja nie może przywrócić usuniętego rekordu.

Test akceptacyjny: Supabase niedostępne podczas zapisu, restart, drain outboxa, jeden rekord po synchronizacji; osobno delete i ponowna hydracja.

### 8. Retencja i usuwanie

Rekomendacja: rozdzielić operację usunięcia wpisu historii od trwałego usuwania plików. `delete/clear history` usuwa lub tombstonuje rekord historii, lokalny cache, dane Supabase i retry metadata zgodnie z retencją. Purge plików roboczych i eksportów jest osobną, jawnie raportowaną operacją, która może wymagać dodatkowej zgody; pliki współdzielone lub opublikowane nie są usuwane automatycznie.

Test akceptacyjny: delete pojedynczego joba i clear-all; kontrola tabel, cache i ponownej hydracji; osobny test purge’u plików z ochroną przed usunięciem plików innego joba oraz sprawdzenie, że samo usunięcie historii nie kasuje plików bez jawnej operacji purge.

### 9. Dostęp do eksportów

Rekomendacja: eksporty są prywatne domyślnie; publiczne dopiero po świadomej operacji publikacji. Prywatny preview/download używa autoryzacji lub krótkiego signed URL. CORS nie jest traktowany jako mechanizm autoryzacji.

Test akceptacyjny: anonimowy klient nie pobiera prywatnego eksportu; uprawniony użytkownik pobiera; opublikowany asset jest publiczny zgodnie z kontraktem.

## Decyzje wymagające zatwierdzenia właściciela

| Nr | Decyzja | Rekomendacja | Status |
|---:|---|---|---|
| 1 | Źródło czasu scen | storyboard / zaakceptowane `scene.duration`; jedna niecięta ścieżka lektora | PRZYJĘTE DO AKTUALIZACJI |
| 2 | Zakres scen | 4–8, testowane osobno 4/5/6/7/8 | PRZYJĘTE DO AKTUALIZACJI |
| 3 | Fallback | stock → evidence → data visual, bez wymyślania danych | PRZYJĘTE DO AKTUALIZACJI |
| 4 | Model providerów | provider-neutral | PRZYJĘTE DO AKTUALIZACJI |
| 5 | Retry | 2 próby / 90 s / 12 wywołań na job; bez płatnych wywołań bez zgody | PRZYJĘTE DO AKTUALIZACJI |
| 6 | Wyczerpanie budżetu | osobny `exhausted`; `timed_out` tylko dla globalnego deadline’u | PRZYJĘTE DO AKTUALIZACJI |
| 7 | Historia | Supabase + local cache + outbox | PRZYJĘTE DO AKTUALIZACJI |
| 8 | Retencja | osobne usunięcie historii i osobny purge plików | PRZYJĘTE — DO WERYFIKACJI TESTAMI |
| 9 | Eksporty | prywatne domyślnie, publiczne po publikacji | PRZYJĘTE DO AKTUALIZACJI |
| 10 | Statusy | `completed`, `failed`, `cancelled`, `timed_out`, `exhausted` z regułami przejść | PRZYJĘTE DO AKTUALIZACJI |

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

1. właściciel zatwierdzi albo zmieni wszystkie 10 decyzji, w tym rozdzielenie historii i purge’u plików;
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


## 10. Źródła audytu i mapa kompletności issue

Źródłem audytu jest commit `fe27d4da6e692e2f9b7d8aa732973b071ab16f8a` (`Pass exact scene durations to stock visual QA (#83)`). Kopie źródeł dostępne dla reviewerów w tym PR:

- `docs/audit/phase1/issues_register.json` — pełny rejestr Phase 1, 13 pozycji;
- `docs/audit/phase2/phase2_plan.md` — plan naprawczy i zależności Phase 2.

Poniższa macierz przypisuje każdą pozycję rejestru do etapu, kontraktu i testu akceptacyjnego. Nazwy testów w tej tabeli są kryteriami przyszłych PR-ów, a nie deklaracją, że zostały już zaimplementowane.

| Issue | Etap Phase 2 | Kontrakt Stage 0 | Test akceptacyjny |
|---|---|---|---|
| RF24-P1-001 | Etap 1 — historia i trwałość | Supabase jako źródło autorytatywne; tombstone; historia ≠ purge plików | delete/clear → hydracja/restart nie odtwarza wpisu; idempotencja i kontrola zakresu retencji |
| RF24-P1-002 | Etap 1 — historia i trwałość | lokalny JSON jako cache/recovery; atomowy writer/outbox | przerwanie przed/po rename, uszkodzony plik, odzyskanie ostatniego snapshotu, debounce |
| RF24-P1-003 | Etap 2 — kontrola artefaktów | generated exports/history/temp poza Git; fixture’y jawnie wydzielone | clean clone, `git check-ignore`, CI odrzuca nowy artefakt, skan sekretów |
| RF24-P1-004 | Etap 3 — retry po modelu aktywów | globalne `2 / 90 s / 12`; `exhausted`; brak `Infinity`; bez płatnych wywołań bez zgody | równoległe sceny/fallbacki współdzielą atomowy licznik; limit czasu daje `exhausted`, deadline joba daje `timed_out` |
| RF24-P1-005 | Etap 3 — timeline pipeline’u | storyboard `scene.duration` jest źródłem prawdy; jedna ciągła ścieżka lektora | nierówne czasy przez `/combine-scenes` → identyczny timeline TTS/captions/QA/FFmpeg; jeden stream audio; `ffprobe` |
| RF24-P1-006 | Etap 3 — provider-neutral assets | `provider`, `providerAssetId`, `canonicalAssetId`; repair bez nazw Pexels | macierz Pexels/Pixabay/evidence/data visual; właściwy provider w repair i telemetryce |
| RF24-P2-001 | Etap 4 — lifecycle/SSE | nowy ticket na reconnect; transport error ≠ terminal status | rozłączenie/proxy/401 → świeży ticket, backoff i aktualny stan bez pętli po terminalizacji |
| RF24-P2-002 | Etap 4 — eksporty | prywatne domyślnie; publikacja jawna; CORS nie jest autoryzacją | anonimowy guessed filename odrzucony; owner ma dostęp; publiczny dopiero po publish; token expiry/replay |
| RF24-P2-003 | Etap 4 — limity operacyjne | limity query/provider/health i osobny liveness/diagnostics | 0/1/max/+1 query, timeout, 429, cache health, brak wywołań ponad budżet |
| RF24-P2-004 | Etap 3 — scene count | wspólny kontrakt 4–8, bez cichego dopasowania | osobne przypadki 4/5/6/7/8; 3/9, brak pola i mismatch odrzucone przed renderem |
| RF24-P2-005 | Etap 3 — fallback | `matched_stock → verified_evidence → data_visual`; jawny `assetKind` i powód | każda polityka i brak providera; brak bypassu; kompletna telemetria per scena |
| RF24-P3-001 | Etap 4 — lifecycle | `queued → processing → terminal`; pięć rozłącznych statusów i terminalReason | cancel przed/w trakcie/po, global timeout, SIGINT, wyścig zdarzeń; zgodność local/Supabase/UI |
| RF24-P3-002 | Etap 1 — historia i trwałość | `persisted|pending|degraded|unknown`; outbox z limitem | Supabase timeout/5xx → widoczny degraded; restart i drain outboxa; deduplikacja snapshotów |

## 11. Definicje `verified_evidence` i `data_visual`

`verified_evidence` jest dopuszczalne wyłącznie wtedy, gdy scena ma źródło pierwotne lub wiarygodne źródło wtórne, którego URL/identyfikator, tytuł, autor/publisher, czas publikacji i pobrania oraz fragment potwierdzający konkretne twierdzenie są zapisane w metadanych aktywu. Dowód musi być zgodny z twierdzeniem sceny, zakresem geograficznym i czasowym oraz jednostkami. Odrzucamy evidence bez źródła, niedostępne do weryfikacji, sprzeczne z artykułem, wyrwane z kontekstu albo niepotwierdzające konkretnej sceny. Samo podobieństwo słów kluczowych nie jest weryfikacją.

`data_visual` jest dopuszczalne tylko wtedy, gdy każda wartość ma wskazane źródło danych, identyfikator serii/tabeli lub URL, datę i czas odniesienia, jednostkę, walutę, zakres geograficzny oraz metodologię/agregację. Metadane muszą rozróżniać wartość źródłową od zaokrąglenia lub transformacji prezentacyjnej. Nie wolno tworzyć, interpolować ani wywnioskowywać wartości finansowej bez źródła; jeśli wymaganych danych nie da się zweryfikować, scena musi przejść do bezpiecznej alternatywy albo zakończyć się kontrolowanym błędem, nigdy do zmyślonej grafiki.

## 12. Rzeczywisty baseline testów i CI

**Baseline kodu:** `fe27d4da6e692e2f9b7d8aa732973b071ab16f8a` na `origin/main`. **Baseline dokumentacyjny po poprawkach:** commit `bbd717b0d74e1c1516548f53d2a0d47f6ed42fbb`; jego workflow również zakończył się sukcesem: [GitHub Actions run 45104261840](https://github.com/raportfinansowy24-byte/tworca-shortsow-na-podstawie-newsa-z-bankiepll/actions/runs/45104261840).

Rzeczywiście wykonany baseline CI dla dokumentacyjnego PR obejmował job `validate` w [run 45104218862](https://github.com/raportfinansowy24-byte/tworca-shortsow-na-podstawie-newsa-z-bankiepll/actions/runs/45104218862), SHA `fd0228a9f94aee495d723e5e19ac1ba0772fec63`, zakończony `success`. Workflow wykonał: `npm install --no-audit --no-fund`, `npm run lint`, `npm run build` oraz wszystkie zdefiniowane suite’y kontraktowe/integracyjne, w tym scene contract, storyboard QA, QA repair, source evidence, finance short pipeline, narration timing, single narration, final narration mix, autopilot retry, auth, security/export, render completion, SSE ticket client/store, visual QA providers, stock clip sampling, stock QA duration propagation, stock scene selection, source-evidence visual, scene matching, Pexels/Pixabay provider i Supabase job history. Każdy krok joba `validate` zakończył się sukcesem.

Workflow zawiera także job `deploy_production`, ale warunek uruchomienia wymaga push do `main`; dla PR nie został uruchomiony. Nie wykonano deployu, produkcyjnej generacji ani płatnych wywołań.

**Rozróżnienie:** powyższe wyniki są testami już wykonanymi przez CI. Testy z macierzy issue, w szczególności tombstone, atomowego globalnego retry, pełnego E2E news → MP4, verified evidence/data visual provenance i prywatnego eksportu, pozostają testami planowanymi dla kolejnych implementacyjnych PR-ów i nie są deklarowane jako wykonane.
