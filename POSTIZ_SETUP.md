# Postiz — konfiguracja publikacji Shorts

Integracja jest podłączona do akceptacji w Telegramie, ale **domyślnie nie publikuje**. Wysyłka jest możliwa dopiero po świadomym ustawieniu `POSTIZ_AUTO_PUBLISH=true`.

## Sekrety w Fly.io

Ustaw w sekretach aplikacji:

- `POSTIZ_API_KEY` — klucz API z własnej instancji Postiz.
- `POSTIZ_API_URL` — opcjonalnie; domyślnie `https://api.postiz.com/public/v1`. Dla self-hosted podaj adres zakończony `/api/public/v1`.
- `POSTIZ_INTEGRATIONS` — lista integracji w formacie `provider:integration_id`, rozdzielona przecinkami, np. `tiktok:ID_Z_POSTIZ,youtube:ID_YOUTUBE`.
- `POSTIZ_AUTO_PUBLISH` — pozostaw `false` lub nie ustawiaj, dopóki nie wykonasz testu. Ustawienie `true` włącza wysyłanie zaakceptowanych materiałów do wskazanych kanałów.

Nie umieszczaj klucza API w kodzie ani w plikach repozytorium.

## Co robi przepływ

1. Generator renderuje MP4 i wysyła prośbę o akceptację do Telegrama.
2. Odrzucenie nadal uruchamia istniejący przepływ poprawek.
3. Po kliknięciu „zaakceptuj” serwer sprawdza plik MP4 i — wyłącznie przy `POSTIZ_AUTO_PUBLISH=true` — wysyła plik do Postiz, a następnie tworzy post dla wskazanych integracji.
4. Wynik lub błąd jest zapisany w logach serwera i zwracany w odpowiedzi bota.

## Ważne przed włączeniem

- Najpierw uruchom Postiz i połącz w nim konta społecznościowe.
- Potwierdź identyfikatory integracji i ich typy w Postiz.
- Wykonaj test na koncie testowym / kanale, na którym publikacja jest bezpieczna.
- Publikowanie zależy od prawidłowych uprawnień i ograniczeń API danej platformy. Kod nie omija wymogów TikToka, YouTube ani innych serwisów.

Samo dodanie sekretów nie włącza publikacji, dopóki `POSTIZ_AUTO_PUBLISH` nie ma wartości `true`.
