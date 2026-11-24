# Trwała telemetria napraw QA

Źródłem historii prób napraw jest tabela `public.short_qa_repair_events`.

## Cykl zdarzeń

Każda próba naprawy otrzymuje wspólny `repair_id` i numer `attempt`:

- `repair_started` — QA zablokowało render i rozpoczęto próbę naprawy.
- `asset_selected` — dostawca zwrócił zwalidowany zamiennik dla konkretnej sceny.
- `repair_succeeded` — ponowny render zakończył się, a końcowe QA nie zgłosiło blokady.
- `repair_failed` — wyszukiwanie materiału lub ponowny render/QA zakończyły się błędem.
- `repair_cancelled` — zadanie zostało anulowane przed ukończeniem naprawy.

## Dane

Wiersze zapisują identyfikator zadania i naprawy, numer próby, scenę, dostawcę, provider-scoped asset ID, kanoniczny identyfikator, kod przyczyny, działanie, wynik oraz skrócone podsumowania QA przed i po próbie. Metadane wyszukiwania są ograniczone do zapytania pierwotnego/naprawczego i wymiarów.

Nie zapisujemy tekstu lektora, pełnych podpisanych URL-i plików ani danych uwierzytelniających.

## Dostęp i retencja

Tabela ma włączone RLS. Uprawnienia Data API otrzymuje wyłącznie serwerowy `service_role`, i tylko do SELECT/INSERT. Nie ma dostępu `anon` ani `authenticated`; nie przyznajemy UPDATE/DELETE, aby historia była append-only. `job_id` jest celowo bez klucza obcego do `short_jobs`, żeby historia napraw nie znikała przy porządkowaniu rekordów zadań.

## Zasada awaryjna

Zapis jest best-effort. Awaria Supabase telemetrii jest logowana, ale nie zatrzymuje renderu ani nie uruchamia ponownie dostawcy AI.
