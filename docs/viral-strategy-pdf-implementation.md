# Wdrożenie strategii VIRAL SHORTS

Pipeline finansowy korzysta z zasad zawartych w `STRATEGIA_VIRAL_SHORTS.pdf`.

## Hook

Pierwsza scena trwa 2 sekundy i musi działać bez dźwięku. Pipeline wybiera rodzinę hooka `contrarian_claim`, `mistake_warning` albo `list_tease_ranking`. Hook główny oraz warianty zawierają potwierdzoną liczbę lub procent z artykułu i nie mogą przekraczać 14 słów.

Warianty są zapisywane w Supabase jako osobny eksperyment. Fakty nie są zmieniane między wariantami; testowana jest forma otwarcia.

## Rytm 18 sekund

Materiał jest traktowany jako trzy strefy redakcyjne: `0–2s` hook, `2–14s` dowód i użyteczne wyjaśnienie, `14–18s` payoff oraz jedno CTA. Technicznie strefa dowodowa może zawierać kilka beatów motion designu, ale nie może rozmywać tej funkcji.

## Platformy i metryki

Jeden master 9:16 może być publikowany na TikToku, YouTube Shorts i Instagram Reels. Wyniki trzeba rozdzielać według platformy. Pipeline zapisuje retencję w 1. i 3. sekundzie, średni czas oglądania, completion rate, komentarze, udostępnienia, zapisy i CTR, kiedy dane są dostępne.

Początkowy cel to co najmniej 60% retencji po 3 sekundach i co najmniej 5 komentarzy na 1000 wyświetleń. Są to progi diagnostyczne, nie gwarancje. Zwycięskiego hooka nie należy ogłaszać na podstawie małej próby.

## Bezpieczeństwo treści finansowych

Strategia nie pozwala wymyślać kwot, gwarantowanych zysków, aktualnych promocji ani rekomendacji inwestycyjnych. Każdy hook musi mieć dowód w danych źródłowych, a Quality Gate blokuje plan bez potwierdzonych liczb.
