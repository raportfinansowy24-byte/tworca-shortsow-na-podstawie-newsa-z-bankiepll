# Tymczasowe zadanie dla Codexa — audyt repozytorium i README

Ten plik jest wyłącznie briefem startowym dla Codexa. Przeczytaj go, wykonaj zadanie w tej gałęzi i usuń ten plik z końcowego diffu.

## Cel
Przejrzyj całe repozytorium i bezpiecznie uporządkuj kod: znajdź rzeczywiste duplikaty, martwy kod oraz nieużywane konfiguracje lub dane, a następnie usuń albo skonsoliduj tylko te elementy, których zbędność da się potwierdzić. Zaktualizuj `README.md` tak, aby rzetelnie opisywał obecną implementację.

## Zakres inspekcji
Sprawdź frontend, backend, skrypty, testy, konfigurację, dokumentację, pliki wdrożeniowe, migracje i zależności. Wyszukaj odwołania przed uznaniem pliku, funkcji, pola, assetu lub konfiguracji za nieużywane. Zwróć uwagę na nieaktualne lub sprzeczne twierdzenia w dokumentacji.

## Ograniczenia bezpieczeństwa i zgodności
- Zachowaj zachowanie aplikacji, publiczne API, formaty payloadów, integracje oraz kompatybilność istniejących automatyzacji.
- Nie usuwaj historii migracji Supabase, danych użytkownika ani eksportów, fixtures, assetów/brandingu/fontów, plików produkcyjnych ani plików w `temp/` lub `exports/` tylko dlatego, że nie są importowane jak moduł. Najpierw ustal ich przeznaczenie i wszystkie referencje.
- Nie usuwaj ani nie zmieniaj sekretów, mechanizmów uwierzytelniania, retencji danych, webhooków ani integracji bez bardzo mocnego uzasadnienia i testów.
- Nie wykonuj masowych zmian formatowania ani zmian zależności dla samej estetyki. Refaktoryzuj małymi, możliwymi do zweryfikowania krokami.
- Nie wdrażaj i nie scalaj zmian. Pracuj wyłącznie w tej gałęzi/PR.

## Aktualizacja README
Zaktualizuj dokument po polsku na podstawie rzeczywistego kodu i konfiguracji. Zweryfikuj m.in. opis funkcji i endpointów, wymagania, komendy instalacji/testów/builda, zmienne środowiskowe, integracje, ograniczenia oraz procedurę deployu. Usuń lub popraw nieaktualne, niepotwierdzone albo sprzeczne informacje; w szczególności nie sugeruj automatycznego deployu, jeśli repozytorium tego nie robi. Nie umieszczaj żadnych wartości sekretów.

## Weryfikacja i raport
1. Dodaj lub popraw testy dla zmienionej logiki.
2. Uruchom `npm run lint`, `npm run build` oraz wszystkie lokalne, możliwe do wykonania bez zewnętrznych sekretów testy `test:*`. Uruchom też testy E2E, jeśli ich wymagania są dostępne; jeśli nie, wyjaśnij dlaczego. Nie oznaczaj pominiętych testów jako zaliczonych.
3. Sprawdź `git diff --check` i upewnij się, że brief nie znajduje się w końcowym diffie.
4. W komentarzu do PR podaj: wykonany audyt, usunięte/skonsolidowane elementy i dowody ich nieużywania, zaktualizowane sekcje README, wyniki testów oraz ryzyka lub bezpieczne propozycje, których nie wdrożyłeś.
