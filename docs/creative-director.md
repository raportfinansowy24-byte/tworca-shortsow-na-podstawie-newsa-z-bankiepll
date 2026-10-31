# Creative Director — RaportFinansowy24

Moduł Creative Director dodaje markową warstwę planowania przed istniejącym pipeline’em `/api/auto-pilot-shorts`. Nie zastępuje Pexels, TTS, FFmpeg, Telegram approval ani eksportu do Google Drive.

## Pliki marki

Moduł szuka `brand-identity.md`, `ICP.md` i `messaging.md` w katalogu głównym oraz w `brand/`. W repozytorium referencyjne pliki znajdują się w `brand/`.

## Endpoint

```http
POST /api/creative-director/news
Content-Type: application/json
```

Przykładowe żądanie:

```json
{
  "article": {
    "title": "RPP pozostawiła stopy procentowe bez zmian",
    "description": "Opis i fakty z artykułu Bankier.pl",
    "category": "Kredyty & RPP",
    "link": "https://www.bankier.pl/..."
  },
  "platform": "youtube-shorts",
  "duration": 18,
  "sceneCount": 8,
  "language": "Polski"
}
```

Odpowiedź zawiera `plan` z hookiem, tekstem, CTA, hashtagami, rekomendowanym głosem, technicznym `directorBrief`, ośmioma beatami scen oraz `riskFlags`. Każda scena zawiera angielskie `visualQuery`, które można przekazać do istniejącego dopasowania Pexels.

Jeżeli model nie odpowie lub zwróci niepoprawny JSON, moduł przełącza się na walidowany fallback heurystyczny. Odpowiedź zawiera wtedy `source: "fallback"` oraz ostrzeżenie w `riskFlags`.

## Dostępność w aplikacji

Główny ekran Auto-Pilota jest dashboardem bez ręcznego wyboru artykułu, trybu, głosu, liczby scen, jakości obrazu ani ujęć. Harmonogram wybiera news i uruchamia własny finansowy generator scen. Ten harmonogram **nie wywołuje obecnie** endpointu `/api/creative-director/news`; endpoint i mapper Creative Director pozostają dostępne dla integracji programowych, ale nie są krokiem wymaganym do zwykłego cyklu.

Gotowy render nie jest automatycznie publikowany. Akceptacja Telegramem pozostaje oddzielną bramką, a automatyczne przekazanie do Postiz wymaga osobnej konfiguracji.

Test kontraktu uruchamia się poleceniem:

```bash
npm run test:creative-director
```
