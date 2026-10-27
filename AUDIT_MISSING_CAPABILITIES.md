# Audyt funkcji i brakujących kompetencji — Central Supervisor

## Audyt istniejącego kodu (main, 2026-10-27)

Zamiast dodawać drugi framework agenta, wykorzystujemy istniejące moduły:

| Obszar | Istniejący element | Decyzja |
|---|---|---|
| Generowanie Shortów | `POST /api/auto-pilot-shorts`, `POST /api/combine-scenes` | Reuse; nie tworzyć drugiego pipeline'u |
| Kontrakt scen | `src/server/sceneContract.ts` + test | Reuse; utrzymać walidację liczby scen i unikalności materiałów |
| Dobór scen finansowych | `src/utils/financeSceneMatching` | Reuse; nie dublować klasyfikatora |
| Zatwierdzanie w Telegramie | `src/server/telegramApproval.ts`, `telegramRevision.ts` i testy | Reuse; nie obchodzić akceptacji człowieka |
| Trwała historia zadań | `src/server/supabaseJobStore.ts` | Reuse; status pokazuje tylko zadania aktualnie zachowane w pamięci |
| Publikacja | `src/server/postizPublisher.ts` | Istnieje, ale zależy od konfiguracji i API Postiz; `POSTIZ_AUTO_PUBLISH` pozostaje wyłączone |
| Zdrowie serwera | `GET /api/health` | Reuse wspólnej diagnostyki runtime |
| Nadzór | `GET /api/supervisor/status` | Rozszerzono o stan FFmpeg i fontu oraz ostrzeżenia o błędnych zadaniach |

## Zmiany w tej gałęzi

- Wspólna funkcja `getMediaRuntimeDiagnostics()` jest wykorzystywana przez `/health` i `/supervisor/status`, żeby nie utrzymywać dwóch kopii sprawdzania FFmpeg i fontu.
- Status nadzorcy nie zgłasza już `healthy`, gdy FFmpeg nie działa albo brakuje fontu Montserrat.
- `nextActions` wskazuje brak FFmpeg/fontu i obecność zakończonych błędem zadań.
- Nie zwracamy wartości sekretów i nie uruchamiamy automatycznej publikacji, restartów ani zmian konfiguracji.

## Granice audytu / dalsze prace

- Endpoint raportuje stan w chwili zapytania; nie jest harmonogramem monitoringu i sam nie wysyła alarmów.
- Liczniki zadań pochodzą z aktualnie zachowanych zadań w pamięci; trwałość między restartami zależy od istniejącego magazynu Supabase.
- Integrację Postiz trzeba zweryfikować testem kontraktowym z rzeczywistą odpowiedzią API przed włączeniem publikacji.
- Należy uruchomić `npm run lint`, `npm run build` oraz testy istniejących modułów. Nie oznaczamy tych kontroli jako zaliczonych, dopóki nie zostaną faktycznie wykonane.
- Zachować aktualny harmonogram publikacji i istniejący przepływ Bankier.pl → artykuł → Short; ta zmiana ich nie modyfikuje.