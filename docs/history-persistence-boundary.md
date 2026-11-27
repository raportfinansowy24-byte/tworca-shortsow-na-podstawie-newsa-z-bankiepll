# Granica trwałości historii — PR #86

## Zakres PR #86

PR #86 zapewnia bezpieczny, atomowy zapis lokalnego cache historii jobów (`exports/jobs_history.json`), coalescing aktualizacji postępu oraz krytyczny `flush` przy utworzeniu joba i przejściu do statusu terminalnego. Lokalny plik posiada kopię recovery `.bak`.

Aktualizacje postępu są best-effort i mogą być coalescowane. Operacje, które potwierdzają utworzenie zadania albo terminalny wynik renderowania, oczekują na zakończenie zapisu lokalnego przed potwierdzeniem operacji.

## Jawna granica usuwania

Lokalne usunięcie wpisu z `jobsStore` i `jobs_history.json` samo w sobie nie usuwało rekordu z autorytatywnej historii Supabase. Powodowało to ponowne pojawianie się zadań podczas synchronizacji.

Migracja `20261127191508_persistent_short_job_deletions.sql` dodaje trwały rejestr tombstone w prywatnym schemacie oraz transakcyjne RPC:
- `delete_short_jobs` zapisuje tombstone, usuwa metadane eksportów z `short_job_exports` i rekordy z `short_jobs`;
- trigger blokuje późniejsze INSERT/UPDATE dla oznaczonego identyfikatora;
- `get_deleted_short_job_ids` pozwala odfiltrować stare wpisy z lokalnego cache oraz MP4 odkryte podczas odzyskiwania plików po restarcie.
- Odtwarzanie MP4 działa fail-closed: przy błędzie odczytu tombstone odzyskiwanie zostaje przerwane, zamiast odtwarzać potencjalnie usunięte joby.

Endpoint pojedynczego usuwania i przycisk czyszczenia historii najpierw wykonują trwałe usunięcie w Supabase. Dopiero po jego potwierdzeniu modyfikują `jobsStore` oraz `jobs_history.json`. Gdy zapis w bazie zawiedzie, API zwraca błąd i pozostawia lokalną listę bez zmian.

Usunięcie z historii usuwa rekordy metadanych eksportów, ale **nie kasuje plików przechowywanych w Google Drive**. Pojedyncze usunięcie nadal usuwa lokalny MP4, miniaturę i katalog tymczasowy przypisany do joba. Operacja czyszczenia historii nie usuwa lokalnych plików MP4.
