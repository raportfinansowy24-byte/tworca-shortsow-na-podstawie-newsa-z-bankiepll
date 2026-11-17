---
name: shorts-editor-qa
description: "Ocena i poprawa scenariuszy oraz renderów YouTube Shorts, TikTok i Reels: hook, tempo, powtórzenia, napisy, CTA, dopasowanie ujęć i integralność MP4. Używaj podczas tworzenia lub diagnozowania pipeline'u shortów oraz przy ocenie gotowego klipu."
---

# Shorts Editor QA

Używaj tej procedury przed pojedynczym renderem shorta i po jego zakończeniu. Celem jest wyłapanie konkretnych wad, nie obiecywanie wiralowości. Nie twórz dodatkowych kopii filmu ani nie uruchamiaj automatycznych pętli renderu.

## Przepływ

1. **Sprawdź storyboard przed renderem.** W repozytorium używaj `src/server/shortsEditorQa.ts` i `evaluateShortStoryboard()`. Dla automatycznego polskiego shorta sprawdź 8 scen, około 18 sekund i limit 28 sekund, krótkie teksty, zgodność lektora z napisami, osobne zapytania wizualne, unikalne ID Pexels dla każdej sceny oraz jawne CTA w ostatniej scenie. Brak lub duplikat ID ujęcia ma blokować utworzenie joba.
2. **Poprawiaj plan bez limitu prób aż do QA PASS.** Jeśli raport ma status `review` lub `blocked`, przekazuj konkretne uwagi przez `buildShortsEditorQaRevisionInstruction()`. Zachowaj ten sam artykuł i fakty. Po każdej rewizji ponownie uruchom QA; nie twórz render-jobu, dopóki nie znikną wszystkie blockery. Przy powtarzających się niepowodzeniach stosuj narastające opóźnienie, zamiast kończyć po stałej liczbie prób.
3. **Wyrenderuj jeden plik.** QA nie może wywoływać kolejnego renderu automatycznie. Nie zmieniaj prędkości lektora w poszczególnych scenach jako sposobu maskowania złego dopasowania czasu; skróć narrację albo zastosuj istniejący, bezpieczny limit czasu.
4. **Zweryfikuj stock przed renderem.** Dla każdej sceny generuj kilka odrębnych zapytań na podstawie konkretnego zdania lektora, oczekiwanego obiektu/czynności i kontekstu artykułu. Przeszukuj Pexels i Pixabay równolegle; nie traktuj pierwszego dostawcy jako zwycięzcy. Zachowaj zrównoważoną shortlistę z obu bibliotek. Oceniaj klatki z kilku momentów każdego klipu; gdy API zwraca tylko miniaturę (Pixabay), pobierz próbki bezpośrednio z MP4 przez FFmpeg. Wymagaj zgodności wizualnej z wypowiedzią, nie tylko z kategorią finansową. Jeśli kandydatów nie da się zweryfikować, nie zastępuj ich przypadkowym generycznym stockiem — użyj zweryfikowanej planszy/źródła albo zablokuj scenę.
5. **Sprawdź gotowy MP4 i obraz.** Przed oznaczeniem joba jako ukończonego użyj `evaluateRenderedShort()` z metadanymi `ffprobe`: obecność wymaganych strumieni wideo/audio, proporcje 9:16, czas trwania i rozmiar pliku. Wyodrębnij reprezentatywne klatki z różnych momentów każdej sceny i porównaj je z dokładnym tekstem lektora tej sceny modelem vision. Wyraźny mismatch jest blockerem; słabsze sygnały i brak oceny zapisuj jawnie. Gdy Gemini jest niedostępne, analiza nie może być oznaczona jako zaliczona.
6. **Zapisz i pokaż raport.** Zachowaj wynik w `job.shortMetadata.editorQa`, dołącz krótkie podsumowanie do logów joba i udostępnij status w kolejce. Pozaautomatyczne, subiektywne uwagi kieruj do człowieka; deterministyczny raport nie potwierdza, że film będzie wiralowy.

## Kryteria redakcyjne

- Hook zaczyna się od pierwszego ujęcia, bez wstępu lub identyfikacji marki przed sednem.
- Każda scena wnosi nowy fakt albo krok opowieści; usuń powtórzenia i ogólniki.
- Zapytanie wizualne jest konkretne, różne dla scen i zgodne z wypowiadanym fragmentem. Nie zastępuj niepasującego obrazu generycznym stockiem finansowym.
- Napisy odpowiadają wypowiedzi lektora i są krótkie oraz czytelne na telefonie.
- CTA jest krótkie, zgodne z polityką marki i umieszczone na końcu. Link pozostaje w metadanych/opisie, nie w lektorze.
- Fakty, liczby i wnioski muszą pochodzić z przekazanego źródła. Mocny hook nie może wprowadzać w błąd.

## Granice automatycznej oceny

Analiza kilku klatek stocku i końcowego MP4 zwiększa szansę wykrycia złego motywu, ale nie widzi każdej klatki i nie rozstrzyga w pełni płynności ruchu, montażu, synchronizacji napisów ani tego, czy widz kliknie CTA. Przy braku konfiguracji Gemini lub awarii modelu wynik musi pokazać, że analiza nie została wykonana. QA jest kontrolą jakości, nie gwarancją zasięgów.
