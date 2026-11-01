---
name: shorts-editor-qa
description: "Ocena i poprawa scenariuszy oraz renderów YouTube Shorts, TikTok i Reels: hook, tempo, powtórzenia, napisy, CTA, dopasowanie ujęć i integralność MP4. Używaj podczas tworzenia lub diagnozowania pipeline'u shortów oraz przy ocenie gotowego klipu."
---

# Shorts Editor QA

Używaj tej procedury przed pojedynczym renderem shorta i po jego zakończeniu. Celem jest wyłapanie konkretnych wad, nie obiecywanie wiralowości. Nie twórz dodatkowych kopii filmu ani nie uruchamiaj automatycznych pętli renderu.

## Przepływ

1. **Sprawdź storyboard przed renderem.** W repozytorium używaj `src/server/shortsEditorQa.ts` i `evaluateShortStoryboard()`. Dla automatycznego polskiego shorta sprawdź 8 scen, około 18 sekund i limit 23 sekund, krótkie teksty, zgodność lektora z napisami, osobne zapytania wizualne, unikalne ID Pexels dla każdej sceny oraz jawne CTA w ostatniej scenie. Brak lub duplikat ID ujęcia ma blokować utworzenie joba.
2. **Popraw plan najwyżej raz.** Jeśli raport ma status `review` lub `blocked`, przekazuj konkretne uwagi przez `buildShortsEditorQaRevisionInstruction()`. Zachowaj ten sam artykuł i fakty. Po jednej poprawce zaakceptuj plan tylko wtedy, gdy nie ma blockerów. Nie twórz jeszcze render-jobu dla planu z blockerami.
3. **Wyrenderuj jeden plik.** QA nie może wywoływać kolejnego renderu automatycznie. Nie zmieniaj prędkości lektora w poszczególnych scenach jako sposobu maskowania złego dopasowania czasu; skróć narrację albo zastosuj istniejący, bezpieczny limit czasu.
4. **Sprawdź gotowy MP4.** Przed oznaczeniem joba jako ukończonego użyj `evaluateRenderedShort()` z metadanymi `ffprobe`: obecność wymaganych strumieni wideo/audio, proporcje 9:16, czas trwania i rozmiar pliku. Blocker ma zakończyć job błędem, a ostrzeżenia mają być zapisane w raporcie.
5. **Zapisz i pokaż raport.** Zachowaj wynik w `job.shortMetadata.editorQa`, dołącz krótkie podsumowanie do logów joba i udostępnij status w kolejce. Pozaautomatyczne, subiektywne uwagi kieruj do człowieka; deterministyczny raport nie potwierdza, że film będzie wiralowy.

## Kryteria redakcyjne

- Hook zaczyna się od pierwszego ujęcia, bez wstępu lub identyfikacji marki przed sednem.
- Każda scena wnosi nowy fakt albo krok opowieści; usuń powtórzenia i ogólniki.
- Zapytanie wizualne jest konkretne, różne dla scen i zgodne z wypowiadanym fragmentem. Nie zastępuj niepasującego obrazu generycznym stockiem finansowym.
- Napisy odpowiadają wypowiedzi lektora i są krótkie oraz czytelne na telefonie.
- CTA jest krótkie, zgodne z polityką marki i umieszczone na końcu. Link pozostaje w metadanych/opisie, nie w lektorze.
- Fakty, liczby i wnioski muszą pochodzić z przekazanego źródła. Mocny hook nie może wprowadzać w błąd.

## Granice automatycznej oceny

Kod potoku mierzy strukturę scenariusza i techniczną integralność MP4. Nie rozstrzyga w pełni, czy wybrane ujęcie jest semantycznie trafne, czy montaż wygląda profesjonalnie ani czy widz rzeczywiście kliknie CTA. Wnioski te wymagają obejrzenia klipu; wynik QA jest kontrolą jakości, nie gwarancją zasięgów.
