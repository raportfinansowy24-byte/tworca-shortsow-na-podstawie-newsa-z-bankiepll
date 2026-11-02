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

## Cinema Director + Pexels

Prompty głównego generatora shortów z Pexels oraz Creative Directora rozdzielają dwa rodzaje wskazówek: `searchKeyword`/`visualQuery` jest krótkim, literalnym zapytaniem po angielsku (widoczny podmiot, czynność, miejsce/obiekt) dla wyszukiwarki Pexels; `camera` opisuje rozmiar planu, pojedynczy spójny ruch i optykę; `visualMood` opisuje światło, atmosferę i grading. `directorBrief` streszcza ciągłość estetyczną oraz dźwięk. Zapytania scen mają być odrębne i nie mogą zawierać fikcyjnych danych, niewidocznych szczegółów ani samych abstrakcyjnych emocji. Własne `pairedKeywords` przekazane jawnie przez klienta zachowują pierwszeństwo; w pozostałych przypadkach główny generator wyszukuje klipy po zapytaniu konkretnej sceny wygenerowanym przez model.

Podczas renderu `mapCreativeDirectorPlanToRenderScenes()` zachowuje `visualQuery`, `camera` i `visualMood`, a `/api/auto-pilot-shorts` przekazuje wyszukiwanie do `resolveStockOrPexelsVideoDetailed()`. Resolver wyszukuje pionowe klipy Pexels, stosuje istniejące reguły trafności tematycznej oraz odrzuca ID użyte wcześniej w danym filmie. Kierunek kamery jest wskazówką reżyserską/storyboardową, nie operacją na pobranym pliku: nie gwarantuje dokładnego ruchu kamery, ruchu wirtualnego ani zgodności każdego wyniku stockowego z moodem. Standardowy `finance-v2` celowo tworzy własne, źródłowe wizualizacje danych i nie powinien być automatycznie zamieniany na stock Pexels. Harmonogram może nadal wybierać tę ścieżkę; sama aktualizacja promptów nie przełącza jego trybu.

Walidację integracji promptu uruchom przez `npm run test:creative-director`.

Jeżeli model nie odpowie lub zwróci niepoprawny JSON, moduł przełącza się na walidowany fallback heurystyczny. Odpowiedź zawiera wtedy `source: "fallback"` oraz ostrzeżenie w `riskFlags`.

## Dostępność w aplikacji

Główny ekran Auto-Pilota jest dashboardem bez ręcznego wyboru artykułu, trybu, głosu, liczby scen, jakości obrazu ani ujęć. Harmonogram wybiera news i uruchamia własny finansowy generator scen. Ten harmonogram **nie wywołuje obecnie** endpointu `/api/creative-director/news`; endpoint i mapper Creative Director pozostają dostępne dla integracji programowych, ale nie są krokiem wymaganym do zwykłego cyklu.

Gotowy render nie jest automatycznie publikowany. Akceptacja Telegramem pozostaje oddzielną bramką, a automatyczne przekazanie do Postiz wymaga osobnej konfiguracji.

Test kontraktu uruchamia się poleceniem:

```bash
npm run test:creative-director
```
