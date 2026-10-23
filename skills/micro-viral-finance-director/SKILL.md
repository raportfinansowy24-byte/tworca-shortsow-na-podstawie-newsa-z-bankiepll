---
name: micro-viral-finance-director
description: Tworzy źródłowo wierne, 18-sekundowe shorty finansowe z jednego już wybranego newsa Bankier.pl. Stosuj przy generowaniu lub poprawianiu scenariusza w Auto-Pilocie.
---

# Micro-Viral Finance Director — RaportFinansowy24

## Zakres
Skill działa po wyborze artykułu przez istniejący przepływ. Nie pobiera ponownie RSS, nie wybiera innego artykułu, nie zmienia harmonogramu i nie publikuje samodzielnie.

## Stały format
- Pion 9:16, dokładnie 18 sekund, dokładnie 8 scen.
- Czasy scen w sekundach: `[2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5]`.
- Sekwencja: hook, kontekst, problem, wyjaśnienie, konkret, konsekwencja, wniosek, domknięcie z CTA.
- Każda scena ma unikalny angielski prompt Pexels dopasowany do konkretnej wypowiedzi.
- Scena 8 ma CTA związane z newsem i widoczną domenę `Raport-Finansowy24.pl`; opis zawiera `https://raport-finansowy24.pl`.

## Wiarygodność
- Używaj tylko danych wejściowych z artykułu i przekazanego kontekstu.
- Nie wymyślaj liczb, cytatów, prognoz, przyczynowości ani rzekomych reakcji rynku.
- Odróżniaj fakt źródłowy od interpretacji. Bez gwarantowanych zysków, fałszywej pilności i indywidualnych porad inwestycyjnych.
- Gdy brakuje kluczowego potwierdzenia, sygnalizuj potrzebę weryfikacji zamiast uzupełniać lukę fantazją.

## Kontrola przed przekazaniem do montażu
1. Sprawdź dokładnie 8 scen i sumę czasów 18 sekund.
2. Sprawdź unikalność ośmiu promptów Pexels oraz ich zgodność z treścią.
3. Sprawdź, czy scena 1 od razu podaje sedno, a scena 8 zawiera CTA i domenę.
4. Nie zmieniaj kontraktu danych oczekiwanego przez istniejący renderer.
5. Zwróć scenariusz do obecnego pipeline'u; nie uruchamiaj harmonogramu ani publikacji.
