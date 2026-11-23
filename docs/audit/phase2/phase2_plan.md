# FAZA 2 — Plan naprawczy RaportFinansowy24 Shorts Generator

## Status dokumentu

To jest plan, nie implementacja. Został przygotowany na podstawie audytu READ-ONLY dla commita `fe27d4da6e692e2f9b7d8aa732973b071ab16f8a` (`Pass exact scene durations to stock visual QA (#83)`). Nie wykonano zmian w kodzie, commitów, deployu, generatora produkcyjnego ani automatyzacji.

Plan ma usunąć przyczyny systemowe, a nie dodawać kolejne lokalne poprawki. Każdy etap ma własny checkpoint. Przejście do kolejnego etapu wymaga potwierdzenia testów i braku nieakceptowanych regresji.

## Zasady wykonania

1. Repozytorium Git pozostaje jedynym źródłem prawdy dla kodu.
2. Najpierw zamrażamy kontrakty i politykę danych, dopiero potem zmieniamy implementację.
3. Każda zmiana musi mieć test regresyjny przed przejściem dalej.
4. Żadna zmiana nie obejmuje automatycznego deployu ani produkcyjnego generatora.
5. Każdy etap kończy się raportem: zmienione pliki, wynik testów, ryzyka otwarte i decyzja rollback/continue.
6. Zmiany destrukcyjne dotyczące historii Git, danych Supabase lub eksportów wymagają osobnej zgody przed wykonaniem.

## Docelowa kolejność prac

### Etap 0 — Decyzje kontraktowe i baseline

**Cel:** usunąć niejednoznaczności, zanim powstanie kod naprawczy. Etap 0 nie implementuje retry ani zmian w providerach; ustala jedynie kontrakty, które będą ich podstawą.

**Decyzje wymagane od użytkownika:** kanoniczne źródło `scene.duration`; obsługiwany zakres `sceneCount`; rozróżnienie stock/Pexels/Pixabay/evidence/data visual; model prywatności eksportów; statusy `cancelled`, `timed_out`, `failed`; zakres kasowania historii; czy Supabase jest systemem autorytatywnym, czy trwałym mirror/outbox; maksymalny budżet retry napraw QA (liczba prób, czas, liczba wywołań/koszt) oraz czy wyczerpanie budżetu ma kończyć job jako `exhausted` czy jako kwalifikowalny `failed`.

**Zadania techniczne możliwe do wykonania samodzielnie po akceptacji decyzji:** spisać wersjonowany kontrakt `ScenePlan`, diagram stanów joba, macierz polityk assetów i fallbacków, specyfikację provider-neutral asset identity, specyfikację retry budgetu i klasyfikacji błędów, politykę retencji/outboxa, politykę artefaktów Git oraz kontrakt private/public dla `/exports`. Na tym etapie nie zmieniać kodu, migracji, CI ani danych.

**Pliki i kontrakty objęte Etapem 0:** koncepcyjnie `src/server/sceneContract.ts`, `src/server/autopilotRetry.ts`, `src/server/qaRepair.ts`, `src/server/pixabayVideoProvider.ts`, `src/server/supabaseJobStore.ts`, `server.ts`, migracje `supabase/migrations/`, `.gitignore`, `fly.toml` oraz `.github/workflows/validate.yml`. Są to zakresy kontraktowe do opisania, nie lista plików do edycji w Etapie 0.

**Artefakty checkpointu:** kontrakt API, diagram stanów joba, polityka retencji, polityka artefaktów Git, decyzja public/private dla `/exports`, provider-neutral asset contract, retry budget contract oraz lista testów akceptacyjnych dla każdego kontraktu.

**Testy potwierdzające zakończenie Etapu 0:** kontrola kompletności decyzji; statyczna macierz zależności issue → decyzja → etap implementacji; przegląd, że każdy problem z `issues_register.json` ma właściciela kontraktu i test akceptacyjny. Nie uruchamiać jeszcze produkcji ani zmian kodu.

**Kryterium STOP Etapu 0:** zatrzymać się, jeśli choć jedna decyzja pozostaje niejawna, jeśli nie ma wspólnej definicji terminalnych statusów, jeśli retry budget nie ma twardego maksimum albo jeśli nie rozstrzygnięto, czy `/exports` jest prywatne czy publiczne. Brak zmian w repozytorium jest oczekiwanym stanem.

**Ryzyko/rollback:** brak ryzyka runtime, bo Etap 0 jest dokumentacyjny. Jeśli decyzje są niepełne, nie przechodzić do Etapu 1.

### Checkpoint 0 — akceptacja zakresu przed implementacją

Checkpoint 0 kończy się wyłącznie wtedy, gdy użytkownik zatwierdzi: kontrakt scen i czasów; zakres scen; provider-neutral model aktywów; politykę fallbacku; budżet retry; maszynę stanów joba; politykę retencji i źródło prawdy historii; model private/public eksportów. Po stronie technicznej gotowe muszą być dokumenty kontraktowe, macierz `issue → decyzja → etap → test`, lista plików objętych przyszłymi zmianami oraz plan fixture’ów testowych.

Do tego checkpointu nie wolno: edytować kodu, migracji, `.gitignore`, CI ani konfiguracji Fly; usuwać artefaktów z Git; uruchamiać generatora; wykonywać deployu; zmieniać schedulerów; wywoływać płatnych lub produkcyjnych usług.

**STOP:** jeśli brakuje choć jednej decyzji lub jeśli zakres pierwszej implementacji wychodzi poza historię/trwałość, praca zatrzymuje się i wraca do oceny użytkownika. Akceptacja Checkpointu 0 nie jest zgodą na deploy ani produkcję — jest wyłącznie zgodą na rozpoczęcie następnego, jawnie określonego etapu implementacyjnego.

### Etap 1 — Spójność historii i bezpieczna trwałość

Obejmuje `RF24-P1-001`, `RF24-P1-002` i `RF24-P3-002`, ponieważ wszystkie dotyczą źródła prawdy, zapisu i degradacji historii.

#### RF24-P1-001 — lokalna historia wraca z Supabase po usunięciu

**Przyczyna potwierdzona:** `DELETE /api/jobs/:jobId` i `DELETE /api/jobs` usuwają lokalny store/pliki, ale nie wykonują usunięcia ani tombstone w Supabase (`server.ts:7334-7395`). Start i endpoint historii ponownie hydratują rekordy z Supabase (`server.ts:1506-1529`, `7053-7071`; `src/server/supabaseJobStore.ts:308-322`).

**Pliki/komponenty:** `server.ts`; `src/server/supabaseJobStore.ts`; migracja `supabase/migrations/20261018070800_create_short_history.sql`; ewentualna nowa migracja retencji; testy `tests/supabaseJobStore.test.ts` oraz nowy test integracyjny job-history.

**Rozwiązanie docelowe:** ustalić Supabase jako trwały system historii i wprowadzić jawny model retencji. Operacja delete powinna mieć autoryzowaną funkcję usuwającą lub soft-delete/tombstone, obejmującą `short_jobs`, `short_job_exports`, telemetrykę, retry metadata oraz lokalne pliki zgodnie z polityką. Hydracja nie może przywracać rekordów oznaczonych tombstone. Operacja powinna być idempotentna i raportować częściową degradację zamiast komunikatu „bezpowrotnie usunięte”, jeśli nie zakończyła się w pełni.

**Zależności:** Etap 0 — system autorytatywny i zakres retencji; Etap 1b — bezpieczny lokalny zapis; dopiero potem UI komunikujące wynik usuwania.

**Testy regresyjne:** delete pojedynczego joba i clear-history; ponowna hydracja; restart simulation; retry po błędzie Supabase; sprawdzenie wszystkich tabel i plików objętych retencją; idempotentne powtórzenie delete.

**Ryzyko wdrożenia:** wysokie, bo dotyczy danych historycznych i semantyki usuwania. **Wycofanie:** najpierw migracja kompatybilna wstecznie; przełącznik feature flag dla nowego delete; przed migracją backup/eksport metadanych; rollback kodu nie powinien reaktywować usuniętych danych.

#### RF24-P1-002 — nieatomowy zapis `jobs_history.json`

**Przyczyna potwierdzona:** `writeFileSync` zapisuje cały JSON w ścieżce postępu (`server.ts:1437-1446`, `1533-1600`, `2426-2464`), bez temp-file + rename, a zapis jest sprzężony z gorącą pętlą FFmpeg.

**Pliki/komponenty:** `server.ts` (`saveJobsToDisk`, `updateJobProgress`, FFmpeg progress); nowy izolowany moduł local job persistence; `tests/supabaseJobStore.test.ts` tylko jeśli kontrakt zostanie współdzielony; nowy test local-history durability.

**Rozwiązanie docelowe:** oddzielić aktualizację stanu w pamięci od persystencji. Zastosować per-job debounce/queue, pojedynczy writer, zapis do pliku tymczasowego w tym samym filesystemie, `fsync` zgodnie z wymaganym poziomem trwałości i atomowy `rename`. Przy starcie walidować JSON, odzyskiwać ostatnią poprawną wersję i jawnie oznaczać degraded persistence. Ograniczyć pełne zapisy w trakcie renderu.

**Zależności:** Etap 0 — wymagany poziom trwałości; nie łączyć z kasowaniem artefaktów Git.

**Testy regresyjne:** tysiące update’ów z debounce; przerwanie procesu przed rename i po rename; uszkodzony główny plik z poprawnym `.tmp`; brak utraty ostatniego poprawnego snapshotu; brak blokowania event loop ponad ustalony próg; równoległe joby.

**Ryzyko:** średnio-wysokie, bo zmienia timing zapisu. **Wycofanie:** feature flag writer’a; zachowanie starego formatu odczytu; rollback przed migracją formatu, z zachowaniem pliku recovery.

#### RF24-P3-002 — best-effort Supabase bez sygnału degradacji

**Przyczyna potwierdzona:** błędy odczytu/zapisu są logowane i zwracany jest fallback (`supabaseJobStore.ts:247-255`, `308-335`), a renderowanie kontynuuje (`server.ts:1527-1529`, `4194-4197`).

**Pliki/komponenty:** `src/server/supabaseJobStore.ts`; `server.ts`; `src/server/pipelineTelemetry.ts`; typy statusu joba i komponenty historii/statusu.

**Rozwiązanie docelowe:** wprowadzić osobny stan `historyPersistence: persisted|pending|degraded|unknown`, outbox/retry z limitem i idempotency key. Dostępność MP4 może pozostać niezależna od Supabase, ale operator i UI muszą widzieć, że historia nie jest kompletna.

**Zależności:** RF24-P1-001 i RF24-P1-002; status nie może udawać sukcesu przed ustaleniem semantyki outboxa.

**Testy:** Supabase timeout/5xx; restart z niewysłanym outboxem; deduplikacja snapshotów; banner/API degraded; powrót usługi i drain kolejki.

**Ryzyko:** średnie. **Wycofanie:** wyłączenie outbox worker’a przy zachowaniu lokalnych snapshotów; nie usuwać jawnego statusu degradacji przy rollbacku.

### Checkpoint 1

Można przejść dalej dopiero, gdy: usunięty job nie wraca po hydracji; lokalna historia odzyskuje się po przerwaniu zapisu; błędy Supabase są widoczne; testy integracyjne i durability przechodzą; nie ma jeszcze żadnej zmiany produkcyjnej.

### Etap 2 — Kontrola artefaktów

#### RF24-P1-003 — wygenerowane pliki śledzone w Git

**Przyczyna potwierdzona:** `git ls-files` obejmuje MP4, MP3, ASS, JPG, `exports/jobs_history.json`, scheduler i temp; `.gitignore` nie obejmuje całości (`.gitignore:1-12`).

**Pliki/komponenty:** `.gitignore`; `exports/`, `temp/`; dokumentacja repozytorium; ewentualna migracja historii Git; CI workflow do kontroli artefaktów.

**Rozwiązanie docelowe:** najpierw skan treści i sekretów oraz decyzja, co zachować poza Git. Następnie dodać reguły ignorowania katalogów generowanych, wyjątki wyłącznie dla bezpiecznych fixture’ów, test CI odrzucający nowe artefakty i przenieść wymagane fixture’y do jawnego `tests/fixtures/`. Usunięcie już śledzonych plików z indeksu i ewentualna rewrite historii to osobna operacja wymagająca zgody.

**Zależności:** polityka retencji z Etapu 0; nie usuwać plików przed ustaleniem, czy są dowodem audytowym/fixture’em.

**Testy:** `git check-ignore`; clean clone bez artefaktów; CI fail dla nowych plików w `exports/temp`; skan sekretów i danych narracyjnych; test, że wymagane fixture’y nadal są dostępne.

**Ryzyko:** wysokie dla historii Git i danych. **Wycofanie:** tag/backup repozytorium przed cleanupem; najpierw zmiana `.gitignore`, potem kontrolowany untrack; rewrite historii tylko po akceptacji i z planem poinformowania użytkowników klonów.

### Checkpoint 2

Wymagane: brak generowanych plików w nowych commitach i jawna decyzja o cleanupie historii. Retry nie jest jeszcze implementowany ani oceniany jako zakończony; jego wykonanie nastąpi dopiero po modelu providerów w Etapie 3.

### Etap 3 — Kontrakty pipeline’u i aktywów

#### RF24-P1-005 — `/combine-scenes` nadpisuje czasy scen

**Przyczyna potwierdzona:** endpoint pobiera `expectedSceneCount`, wywołuje stały `sceneDurationsForCount` i nadpisuje `duration`, wymuszając `lockSceneDurations` (`server.ts:6502-6545`, szczególnie `6523-6526`).

**Pliki/komponenty:** `server.ts`; `src/server/sceneContract.ts`; `src/server/narrationTiming.ts`; `src/server/stockClipSampling.ts`; `src/server/singleNarration.ts`; testy `sceneContract`, `narrationTiming`, `stockQaDurationPropagation`; nowy test API contract.

**Rozwiązanie docelowe:** jedna funkcja normalizacji kontraktu. Jeżeli caller przekazuje zatwierdzone czasy, są one źródłem prawdy i są walidowane jako kompletne, dodatnie oraz zgodne z całkowitym limitem. Jeżeli caller nie przekazuje czasów, plan pipeline’u generuje harmonogram. Ten sam harmonogram musi trafić do TTS alignment, sampling stocku, napisów, QA i FFmpeg. `lockSceneDurations` powinno wyrażać wynik kontraktu, nie wymuszać go po fakcie.

**Zależności:** Etap 0; RF24-P2-004 dla scenecount. Nie zmieniać sampling/QA przed ustaleniem kanonicznego harmonogramu.

**Testy:** custom durations przez `/combine-scenes`; różne scenecounty; suma czasów; TTS/captions/QA sampling używają tych samych wartości; odrzucenie brakujących/ujemnych/niespójnych czasów; finalny ffprobe duration.

**Ryzyko:** wysokie dla synchronizacji audio/wideo. **Wycofanie:** feature flag kontraktu; zachowanie starego adaptera tylko dla legacy payloadów; nie mieszać dwóch harmonogramów w jednym jobie.

#### RF24-P1-006 — model Pexels/Pixabay nie jest provider-neutral

**Przyczyna potwierdzona:** Pixabay jest mapowany do namespacowanego `pexelsId` (`pixabayVideoProvider.ts:40-45`, `138-155`), a komunikaty naprawy są Pexels-specific (`server.ts:3471-3472`, `3515-3519`).

**Pliki/komponenty:** `src/server/pixabayVideoProvider.ts`; `src/server/stockSceneSelection.ts`; `src/server/qaRepair.ts`; `server.ts`; typy scen/assetów; testy providerów i QA repair.

**Rozwiązanie docelowe:** wprowadzić kanoniczny obiekt assetu z polami `provider`, `providerAssetId`, `canonicalAssetId`, `downloadUrl`, `previewUrl`, `sourceEvidence`. Pole kompatybilności `pexelsId` może pozostać tylko w adapterze migracyjnym. Komunikaty, telemetryka i repair mają używać provider-neutral nazewnictwa.

**Zależności:** przed retry i przed dalszą rozbudową QA; migracja typów musi być zgodna z RF24-P1-005 tylko tam, gdzie asset ma czas.

**Testy:** macierz Pexels/Pixabay/data visual; unikalność ID; repair właściwego providera; telemetryka i logi; backward compatibility istniejących snapshotów.

**Ryzyko:** średnio-wysokie, bo dotyka serializowanych jobów. **Wycofanie:** adapter odczytu starego formatu; zapis nowego formatu za feature flagiem; nie usuwać starych pól przed migracją historii.

#### RF24-P1-004 — nieskończony retry QA repair

**Przyczyna potwierdzona:** `MAX_STORYBOARD_QA_REPAIR_ATTEMPTS = Infinity` (`src/server/autopilotRetry.ts:1`), używane przez `repairUntilPass` (`166-220`).

**Pliki/komponenty:** `src/server/autopilotRetry.ts`; `src/server/qaRepair.ts`; `src/server/pixabayVideoProvider.ts`; `server.ts` wywołujący retry i scheduler/autopilot; `tests/autopilotRetry.test.ts`; testy providerów i telemetryka pipeline.

**Rozwiązanie docelowe:** dopiero po ustabilizowaniu provider-neutral asset identity i wyniku repair wdrożyć jawny budżet per job i per artykuł: maksymalną liczbę napraw, maksymalny czas, maksymalny koszt/request count oraz terminalny `exhausted` z przyczyną. Retry ma być idempotentny, mieć backoff i nie ponawiać błędów niekwalifikowalnych. Budżety mogą być konfigurowalne poza kodem, ale muszą mieć bezpieczny limit maksymalny.

**Zależności:** Etap 0 — decyzja o budżecie i statusach; RF24-P1-006 — canonical provider/id i klasyfikacja wyniku repair; RF24-P3-002 — telemetryka/outbox. Ta kolejność zapobiega implementowaniu retry na starym modelu aktywów i późniejszemu przepisywaniu go.

**Testy:** limit 0/1/N na provider-neutral repair; wyczerpanie czasu; błąd permanentny bez retry; retryable error z backoffem; brak duplikacji jobów; restart procesu i wznowienie bez resetu licznika; poprawny telemetry event z providerem i przyczyną; test, że żaden scenariusz nie wykonuje nieskończonej liczby prób.

**Ryzyko:** wysokie dla throughputu autopilota, niskie dla ręcznego renderu, jeśli zakres zostanie odseparowany. **Wycofanie:** konfiguracja poprzedniego skończonego limitu, ale nigdy `Infinity` jako domyślne zachowanie; możliwość zatrzymania kolejki bez kasowania historii.

#### RF24-P2-004 — niespójny `sceneCount` i słaba walidacja `expectedSceneCount`

**Przyczyna potwierdzona:** Creative Director przyjmuje 4–8 scen (`server.ts:5886-5891`), auto-pilot wymaga dokładnie 8 (`6061-6062`, `6279-6281`), a combine używa `expectedSceneCount` przed jednoznaczną walidacją (`6502-6545`).

**Pliki/komponenty:** `server.ts`; `src/server/sceneContract.ts`; `src/server/creativeDirector.ts`; komponenty storyboard preview; testy endpointów i kontraktów.

**Rozwiązanie docelowe:** wybrać jeden kontrakt: albo wszystkie ścieżki wspierają 4–8, albo Creative Director generuje wyłącznie 8. Rekomendacja planu: wspólny `ScenePlanContract` z deklarowanym `sceneCount`, harmonogramem i obowiązkową sceną CTA; endpoint odrzuca brak/rozbieżność 400 przed renderem. Nie dopuszczać do cichego dopasowania liczby scen.

**Zależności:** Etap 0; bezpośrednio poprzedza RF24-P1-005.

**Testy:** 4, 5, 6, 7, 8 scen; brak `expectedSceneCount`; mismatch planu i payloadu; zgodność CTA; komunikaty 400; każdy poprawny wariant przechodzi do adaptera renderu bez nadpisania kontraktu.

**Ryzyko:** średnie dla istniejących klientów API; wysokie, jeśli są nieudokumentowane payloady 4–7. **Wycofanie:** wersjonowany endpoint/adapter legacy i metryka użycia starego kontraktu.

#### RF24-P2-005 — nazwa `requirePexels` nie odpowiada fallbackowi evidence/data visual

**Przyczyna potwierdzona:** news path może zapisać `kind === 'data_visual'` przez verified evidence fallback (`server.ts:6117-6144`), mimo nazwy flagi; finance gate jest osobnym warunkiem (`6170-6171`).

**Pliki/komponenty:** `server.ts`; `src/server/sourceEvidenceVisual.ts`; `src/server/stockSceneSelection.ts`; typy scen; testy fallbacków.

**Rozwiązanie docelowe:** zastąpić niejednoznaczną flagę polityką np. `assetPolicy: matched_stock_only | stock_then_verified_evidence | stock_then_data_visual`. Wynik każdej sceny powinien raportować `assetKind` i powód fallbacku. Twardy gate finance-v2 powinien pozostać jawny.

**Zależności:** Etap 0 i provider-neutral model RF24-P1-006.

**Testy:** każda polityka i każdy brak providera; brak cichego bypassu; kompletność finance-v2; telemetryka per scena; zgodność outputu z deklarowaną polityką.

**Ryzyko:** średnie dla jakości wizualnej i oczekiwań operatora. **Wycofanie:** zachować starą flagę tylko jako alias wersjonowany, z logiem deprecation.

### Checkpoint 3

Wymagane: jeden scenecount contract, jeden harmonogram scen w całym pipeline, provider-neutral asset identity i jawna polityka fallbacków. Dopiero wtedy sensownie testować pełny render.

### Etap 4 — Lifecycle, SSE i bezpieczeństwo eksportów

#### RF24-P2-001 — brak SSE reconnect

**Przyczyna potwierdzona:** ticket jest jednorazowo konsumowany (`streamTickets.ts:57-63`), klient pobiera go raz (`jobEventSource.ts:2-12`), a `RenderingQueue` zamyka stream po błędzie (`62-102`).

**Pliki/komponenty:** `src/server/streamTickets.ts`; `src/server/apiAuth.ts`; `src/utils/jobEventSource.ts`; `src/components/RenderingQueue.tsx`; testy ticketów/SSE.

**Rozwiązanie docelowe:** funkcja klienta `connectWithFreshTicket`, exponential backoff z limitem, nowy ticket na każde połączenie, rozróżnienie terminalnego statusu od błędu transportu oraz cleanup. Polling pozostaje fallbackiem, nie substytutem reconnectu. Serwer powinien odrzucać ticket po użyciu, ale endpoint ticketów musi być bezpieczny i ograniczony sesją.

**Zależności:** stabilny model statusów z RF24-P3-001; nie zależy od publiczności `/exports`.

**Testy:** disconnect TCP/proxy; 401 po zużytym ticket; 500; świeży ticket i ponowne subskrybowanie; backoff cap; terminal completed/failed/cancelled bez pętli; polling fallback.

**Ryzyko:** średnie, może zwiększyć liczbę requestów. **Wycofanie:** wyłączenie SSE feature flagiem przy zachowaniu pollingu.

#### RF24-P3-001 — cancel/timeout mapowane na failed

**Przyczyna potwierdzona:** `cancelAndTerminateJob` ustawia `failed` (`server.ts:1382-1434`), choć `cancelled` istnieje w typie i migracji (`supabaseJobStore.ts:4`, `20261018070800...:7`).

**Pliki/komponenty:** `server.ts`; `src/server/supabaseJobStore.ts`; migracja statusów; `src/components/RenderingQueue.tsx`; telemetryka i retry.

**Rozwiązanie docelowe:** zdefiniować maszynę stanów: `queued → processing → completed|failed|cancelled|timed_out`; zachować `terminalReason`, `cancelRequestedAt`, `failureCode`. Cancel użytkownika nie może być retryable incidentem; timeout może mieć własny status i politykę retry.

**Zależności:** Etap 0; wpływa na SSE i historię.

**Testy:** cancel przed startem, w trakcie FFmpeg, po terminalnym statusie; timeout; SIGINT; brak osieroconego procesu/plików; Supabase/local/UI zgodne; retry tylko dla kwalifikowalnych failures.

**Ryzyko:** średnio-wysokie dla dashboardów i agregacji. **Wycofanie:** mapowanie odczytu starych `failed` przez `failureCode`; migracja zapisu etapowa.

#### RF24-P2-002 — publiczne eksporty i wildcard CORS

**Przyczyna potwierdzona:** `/exports` jest montowane publicznie z `Access-Control-Allow-Origin: *` (`server.ts:1229-1255`), auth chroni później router `/api` (`9360-9368`), a `outputUrl` wskazuje publiczny adres (`7093-7101`). Czy to błąd biznesowy zależy od decyzji publikacyjnej.

**Pliki/komponenty:** `server.ts`; `src/server/byteRange.ts`; `src/server/streamTickets.ts` lub osobny download token; frontend preview/download; dokumentacja publikacji.

**Rozwiązanie docelowe:** rozdzielić prywatny preview od publicznego published export. Prywatne pliki: autoryzowany stream albo krótkie signed URLs związane z jobem/użytkownikiem, ograniczony CORS. Publiczne publikacje: osobny endpoint/storage i jawny status `published`. Nie opierać bezpieczeństwa na niezgadywalnej nazwie pliku.

**Zależności:** Etap 0 — decyzja private/public; retencja i status joba.

**Testy:** unauthenticated guessed filename; authenticated owner/non-owner; expired/replayed token; range requests; CORS allow/deny; published asset remains public only when explicitly published; brak wycieku logów/metadata.

**Ryzyko:** wysokie dla istniejących integracji i linków. **Wycofanie:** okres przejściowy z wersjonowanymi URL-ami, telemetryka użycia starych linków, feature flag prywatnego streamu.

#### RF24-P2-003 — brak limitów dla kosztownych endpointów

**Przyczyna potwierdzona jako mechanizm:** stock query route iteruje po wejściu bez widocznego limitu (`server.ts:7215-7277`); health/supervisor wykonują diagnostykę i zewnętrzne requesty (`3967-4074`), a część health jest publiczna (`9360-9364`). DoS nie został reprodukowany.

**Pliki/komponenty:** `server.ts`; `src/server/safeHttp.ts`; warstwa rate limiting/budżetów; testy security/services health.

**Rozwiązanie docelowe:** limit liczby i długości query, limit czasu i liczby provider calls, deduplikacja, rate limit per authenticated principal/machine, cache health, rozdzielenie lekkiego liveness `/healthz` od ciężkiego diagnostics endpointu wymagającego auth.

**Zależności:** model auth i prywatności; nie blokuje kontraktów scen.

**Testy:** 0/1/maksimum/+1 queries; długi payload; równoległe health; timeout zewnętrzny; cache; 429; brak wywołania providerów ponad budżet.

**Ryzyko:** średnie; zbyt niskie limity mogą blokować legalny pipeline. **Wycofanie:** konfigurowalne limity z bezpiecznym defaultem i logiem odrzuceń.

### Checkpoint 4

Wymagane: lifecycle rozróżnia cancel/timeout/failure, SSE reconnect przechodzi testy transportowe, a model private/public eksportów jest jawny i przetestowany. Dopiero wtedy pełny E2E może oceniać prawidłowy status i dostęp do artefaktu.

### Etap 5 — Pełny test E2E i bramka gotowości

**Cel:** zamknąć lukę między testami unit/contract a rzeczywistym news → MP4 → historia.

**Zakres:** nowy izolowany harness testowy bez prawdziwych płatnych providerów: fixture Bankier article/RSS, mock Gemini/OpenAI, mock ElevenLabs lub deterministyczne audio fixture, mock Pexels/Pixabay, realny FFmpeg, lokalny Supabase test double lub kontener/HTTP mock, fake Telegram/Drive/Postiz callbacks.

**Asercje obowiązkowe:**

- artykuł i źródła są zachowane w jobie bez niekontrolowanego wycieku;
- plan ma właściwy scenecount i czasy;
- każda scena używa zadeklarowanego asset policy;
- QA failure prowadzi do bounded repair;
- finalny MP4 ma poprawny `moov`, video i audio streams, rozmiar, wymiary, duration i jest odtwarzalny;
- status `completed` pojawia się dopiero po walidacji;
- snapshot lokalny i Supabase mają zgodny terminal state;
- delete/clear respektuje politykę retencji;
- reconnect SSE dostarcza aktualny stan;
- callback nie zmienia ukończonego statusu;
- cancel/timeout kończą proces i sprzątają pliki.

**Pliki/komponenty:** nowy katalog testów integracyjnych; `server.ts` tylko przez publiczny adapter/route; `src/server/*` zgodnie z kontraktami; CI `.github/workflows/validate.yml` dopiero po przejściu lokalnego E2E.

**Testy:** happy path, provider fallback, QA repair exhausted, Supabase unavailable, corrupt local history recovery, cancel, timeout, SSE disconnect, private export, duplicate retry, restart simulation.

**Ryzyko:** wysokie kosztowo/czasowo dla CI, ale test działa bez produkcji. **Wycofanie:** E2E najpierw jako osobny job/manual gate; nie blokować istniejących testów do czasu ustabilizowania harnessu, lecz nie oznaczać aplikacji jako gotowej bez jego przejścia.

### Checkpoint 5 — akceptacja przed jakimkolwiek wdrożeniem

Raport musi zawierać commit, listę zmienionych plików, wyniki wszystkich testów, artefakt MP4 z `ffprobe`, wynik testu retencji, wynik testu restartu/SSE i listę ryzyk otwartych. Dopiero po osobnej zgodzie można planować staging/Fly smoke. Ten dokument nie udziela zgody na deploy.

## Macierz zależności

`RF24-P1-001` → polityka retencji → `RF24-P1-002`/`RF24-P3-002` → testy historii.

`RF24-P2-004` → `RF24-P1-005` → synchronizacja TTS/QA/FFmpeg.

`RF24-P1-006` → provider-neutral repair result → bounded QA repair (`RF24-P1-004`) → spójna telemetryka.

`RF24-P1-004` ma decyzję budżetową w Etapie 0, ale implementację dopiero po RF24-P1-006. Nie wolno zamykać retry ani pisać testów docelowego repair loop przed ustabilizowaniem modelu providerów.

`RF24-P3-001` → `RF24-P2-001` i retry classification.

Decyzja private/public (`RF24-P2-002`) → download/token/CORS testy.

Wszystkie powyższe → pełny E2E → dopiero potem staging/deploy.

## Stan po przygotowaniu planu

Plan zatrzymuje się przed implementacją. Nie ma zgody na zmianę kodu, cleanup historii Git, migrację Supabase, zmianę CI, deploy ani uruchomienie generatora. Następnym krokiem po akceptacji powinno być wyłącznie potwierdzenie Etapu 0 i zakresu pierwszego checkpointu.
