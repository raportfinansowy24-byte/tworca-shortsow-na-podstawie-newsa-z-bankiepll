# Granica trwałości historii — PR #86

## Zakres PR #86

PR #86 zapewnia bezpieczny, atomowy zapis lokalnego cache historii jobów (`exports/jobs_history.json`), coalescing aktualizacji postępu oraz krytyczny `flush` przy utworzeniu joba i przejściu do statusu terminalnego. Lokalny plik posiada kopię recovery `.bak`.

Aktualizacje postępu są best-effort i mogą być coalescowane. Operacje, które potwierdzają utworzenie zadania albo terminalny wynik renderowania, oczekują na zakończenie zapisu lokalnego przed potwierdzeniem operacji.

## Jawna granica usuwania

Lokalne usunięcie wpisu z `jobsStore` i `jobs_history.json` **nie jest globalnym, bezpowrotnym usunięciem historii**. Supabase pozostaje autorytatywnym źródłem historii zadań. Bez tombstone lub równoważnego mechanizmu synchronizacji późniejsza hydracja może ponownie odtworzyć rekord usunięty wyłącznie lokalnie.

PR #86 nie implementuje tombstone, outboxa usunięć ani globalnego purge'u plików eksportowych. Te elementy należą do osobnego etapu `RF24-P1-001`, który musi rozdzielić:

- usunięcie wpisu historii;
- synchronizację usunięcia z Supabase;
- purge plików należących do joba;
- ochronę eksportów opublikowanych lub współdzielonych;
- ownership check i jawny zakres usuwania.

Nie należy opisywać lokalnego endpointu delete jako globalnego lub bezpowrotnego usunięcia dopóki etap `RF24-P1-001` nie zostanie ukończony i zweryfikowany.
