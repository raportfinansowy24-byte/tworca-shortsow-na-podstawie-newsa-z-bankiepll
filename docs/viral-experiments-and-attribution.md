# Testy viralowych hooków i pomiar konwersji — RaportFinansowy24

## Cel

Optymalizujemy nie tylko liczbę wyświetleń, ale cały lejek: **hook → obejrzenie → przejście na stronę → kliknięcie afiliacyjne → lead → zatwierdzona konwersja**.

Ten dokument określa proces redakcyjnych eksperymentów oraz wymagania analityczne. Sam dokument nie oznacza, że integracje analityczne lub publikacyjne są już uruchomione na produkcji.

## 1. Testowanie hooków i tematów

### Kategorie testowe

Każdy materiał powinien otrzymać kategorię tematyczną:

- `kredyty` — raty, koszty całkowite, refinansowanie, zmiany oprocentowania;
- `oszczednosci` — lokaty, konta oszczędnościowe, inflacja i realna wartość pieniędzy;
- `konta_bankowe` — opłaty, warunki prowadzenia kont, karty i bankowość mobilna;
- `promocje` — aktualne premie, cashback i warunki ofert, wyłącznie po weryfikacji źródła i daty ważności.

### Warianty hooka

Dla wybranego tematu przygotuj 2–3 warianty otwarcia, bez zmieniania faktów:

1. **Konkretny koszt:** „Ile może kosztować Cię ten zapis w umowie?”
2. **Praktyczny alert:** „Masz takie konto? Sprawdź tę opłatę.”
3. **Liczba lub porównanie:** „Zanim wybierzesz tę ofertę, porównaj te dwa warunki.”

Warianty muszą być zgodne z treścią artykułu. Nie wolno wymyślać liczb, obiecywać gwarantowanych korzyści ani przedstawiać niezweryfikowanej promocji jako aktualnej.

### Zasady uczciwego testu

- Testuj jedną główną zmienną naraz — najpierw hook, później np. CTA lub montaż.
- Porównuj materiały o zbliżonym temacie, długości, jakości i celu.
- Oznaczaj każdy wariant unikalnym `experiment_id` i `variant_id`.
- Rozdzielaj wyniki według platformy; nie porównuj bezpośrednio surowych wyświetleń z różnych platform.
- Nie ogłaszaj zwycięzcy na podstawie kilku przypadkowych wyświetleń. Ustal minimalny próg danych i oznaczaj małą próbę jako nierozstrzygającą.
- Po zebraniu danych wykorzystuj zwycięskie wzorce jako hipotezy do kolejnych testów, a nie jako gwarancję przyszłego wyniku.

### Metryki kreatywne

| Metryka | Co mówi |
|---|---|
| Utrzymanie widza po 2–3 sekundach | Czy początek zatrzymuje uwagę |
| Średni czas oglądania | Czy materiał utrzymuje zainteresowanie |
| Współczynnik ukończenia | Czy widzowie docierają do końca |
| Udostępnienia i zapisy na 1 000 wyświetleń | Czy materiał jest użyteczny lub wart przekazania dalej |
| Komentarze na 1 000 wyświetleń | Czy temat wywołuje wartościową reakcję |
| CTR do strony | Czy materiał skłania do dalszego działania |

Dane o retencji i wyświetleniach należy pobierać z dostępnych statystyk danej platformy; nie należy zakładać, że API publikacyjne udostępnia każdą z tych metryk.

## 2. Pomiar przejść, kliknięć afiliacyjnych i leadów

### Lejek i zdarzenia

Minimalny zestaw zdarzeń analitycznych:

- `content_published` — materiał został opublikowany; zapisz platformę, identyfikator posta i URL;
- `landing_page_view` — wejście na stronę z linku przypisanego do materiału;
- `affiliate_click` — użytkownik kliknął link afiliacyjny; wygeneruj lub zachowaj identyfikator kliknięcia;
- `lead_submit` — formularz został poprawnie przyjęty przez backend;
- `affiliate_conversion` — sieć afiliacyjna potwierdziła konwersję przez wiarygodny postback, jeśli jest dostępny.

Nie licz kliknięcia jako konwersji ani samego wysłania formularza jako zatwierdzonej prowizji.

### Parametry atrybucji

Do każdego linku prowadzącego z treści dodawaj spójne parametry UTM:

- `utm_source` — platforma, np. `youtube`, `instagram`, `tiktok`;
- `utm_medium=organic_social`;
- `utm_campaign` — kampania lub kategoria, np. `kredyty`, `oszczednosci`, `konta_bankowe`, `promocje`;
- `utm_content` — identyfikator materiału i wariantu hooka.

Przykład struktury (podmień identyfikatory na rzeczywiste wartości):

```text
https://raport-finansowy24.pl/?utm_source=youtube&utm_medium=organic_social&utm_campaign=oszczednosci&utm_content=short_2026_001_hook_b
```

UTM identyfikuje źródło ruchu, ale sam nie śledzi kliknięcia afiliacyjnego. Kliknięcie afiliacyjne powinno przechodzić przez kontrolowany endpoint przekierowujący lub istniejący system afiliacyjny, który zapisuje `click_id`, materiał źródłowy, kategorię, platformę i czas. Do partnera przekazuj wyłącznie parametry dozwolone przez jego integrację. Łącz konwersję z kliknięciem przez wiarygodny postback lub raport sieci afiliacyjnej.

### Minimalne pola zdarzenia

```json
{
  "event_name": "affiliate_click",
  "occurred_at": "ISO-8601",
  "content_id": "short_2026_001",
  "experiment_id": "hook_test_001",
  "variant_id": "hook_b",
  "platform": "youtube",
  "topic_category": "oszczednosci",
  "landing_path": "/konta-oszczednosciowe",
  "click_id": "server-generated-unique-id"
}
```

Przykład jest kontraktem danych, nie rzeczywistym rekordem. W produkcji czas, identyfikator kliknięcia i pozostałe pola muszą być nadawane lub walidowane przez system. Nie zapisuj w analityce haseł, tokenów, danych karty ani zbędnych danych osobowych. Dane leadów przechowuj w chronionym systemie, a analitykę łącz z nimi za pomocą identyfikatora technicznego.

### Raport dzienny

Raport powinien pokazywać, osobno dla każdej platformy, kategorii i wariantu hooka:

1. opublikowane materiały;
2. wyświetlenia oraz dostępne metryki retencji;
3. wejścia na stronę i CTR;
4. kliknięcia afiliacyjne i współczynnik kliknięć z wejść;
5. poprawnie zapisane leady i współczynnik leadów;
6. zatwierdzone konwersje, przychód potwierdzony oraz prowizje oczekujące;
7. błędy atrybucji, brakujące identyfikatory i duplikaty.

Podstawowe obliczenia:

- `CTR = landing_page_views / views × 100%` (tylko jeśli definicje i dane platformy są porównywalne);
- `affiliate_click_rate = affiliate_clicks / landing_page_views × 100%`;
- `lead_rate = valid_leads / landing_page_views × 100%`;
- `confirmed_revenue = suma zatwierdzonych prowizji + faktycznie uzyskane przychody B2B`.

Raport musi odróżniać przychód potwierdzony od prognozowanego oraz prowizji niezatwierdzonych.

## 3. Kolejność wdrożenia

1. Dodać oznaczenia kategorii, `experiment_id` i `variant_id` do metadanych materiału.
2. Wprowadzić spójne UTM do wszystkich linków w opisach i profilach.
3. Potwierdzić działanie ścieżki wejścia na stronę, kliknięcia afiliacyjnego i zapisu leada.
4. Połączyć istniejący identyfikator kliknięcia z raportem sieci afiliacyjnej/postbackiem.
5. Utworzyć dzienny raport i sprawdzić zgodność liczników z logami źródłowymi.
6. Dopiero po walidacji uruchomić regularne eksperymenty i optymalizować według zatwierdzonych konwersji, nie samych wyświetleń.

## 4. Kryteria akceptacji

- Każdy materiał ma kategorię i identyfikator wariantu hooka.
- Każdy link kampanii ma poprawne UTM.
- Testowe wejście daje się przypisać do platformy i materiału.
- Kliknięcie afiliacyjne ma unikalny identyfikator i nie jest liczone jako lead.
- Poprawnie przyjęty lead można odróżnić od błędu walidacji.
- Konwersja afiliacyjna jest oznaczana jako potwierdzona dopiero po weryfikacji u partnera.
- Raport pozwala rozróżnić wyniki według platformy, kategorii i wariantu hooka.
- Zdarzenia i raport nie ujawniają sekretów ani zbędnych danych osobowych.

## 5. Status

Ten dokument dodaje procedurę eksperymentowania i specyfikację pomiaru. Przed uznaniem funkcji za działającą należy wdrożyć lub zweryfikować rzeczywiste instrumentowanie frontendu, endpointy backendu, trwałe przechowywanie zdarzeń, połączenie z formularzem leadowym oraz integrację postbacków. Nie deklaruj aktywnego śledzenia, dopóki testy end-to-end nie przejdą.
