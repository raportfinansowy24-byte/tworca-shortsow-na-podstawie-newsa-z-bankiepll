# Plan Wdrożenia: Autonomiczna Selekcja Najbardziej Wirusowego Newsa przez Gemini AI

## Cel biznesowy i założenia
- **Cel:** Zapewnienie, że autonomiczny generator wideo RaportFinansowy24 wybiera spośród wszystkich najświeższych artykułów z portalu Bankier.pl ten o **największym potencjale viralowym** oraz **najwyższej konwersji do produktów finansowych** (kredyty gotówkowe, hipoteki, konta osobiste).
- **Tryb działania:** 100% automatyczny w tle — bez konieczności ręcznego wyboru, bez zaśmiecania widoku listami rankingowymi.
- **Kryterium priorytetowe:** Zgodnie z decyzją użytkownika: *Maksymalna konwersja do kredytów i kont bankowych (CPA 42–200 €)* pod kątem celu **10 000 euro miesięcznie czystego zysku**.

---

## 1. Analiza stanu obecnego
- Obecny mechanizm w `server.ts` (`executeAutonomousRun`) pobiera najświeższe artykuły z RSS Bankier.pl i wybiera pierwszy nieprzetworzony artykuł (`articles.find(...) || articles[0]`).
- Mamy zaimplementowany algorytm oceny sentymentu i wiralowości (`calculateViralityScore`), ale oceniał on wybrany artykuł post-factum lub w trybie pojedynczym.
- Brakuje etapu **komparatywnej selekcji wieloartykułowej przez Gemini**, w którym model analizuje całą pulę najnowszych wiadomości i wyłania bezwzględnego lidera.

---

## 2. Zakres zmian technicznych

### Krok 1: Silnik Selekcji Wielonewsa w Gemini (`server.ts`)
1. Implementacja funkcji backendowej `selectMostViralBankierArticleWithGemini`:
   - Wejście: lista 10–15 najświeższych nieprzetworzonych newsów z Bankier.pl.
   - Analiza z użyciem Gemini API (strukturyzowany prompt JSON):
     - **Skala grupy docelowej:** tematy dotyczące milionów Polaków (stopy RPP, raty kredytów, ceny mieszkań, podatki) mają priorytet nad wąskimi niszami rynkowymi.
     - **Potencjał zatrzymania uwagi (Hook & Retention):** natychmiastowe wybicie ze scrollowania w pierwszych 3 sekundach.
     - **Wartość konwersji:** bezpośredni lejek do porównywarek kredytów i kont portalu `raport-finansowy24.pl` (najwyższe stawki prowizji CPA/CPS).
   - Odpowiedź: wybrany artykuł TOP 1, wyliczony `ViralityScore` oraz uzasadnienie wyboru.
2. Zabezpieczenie odpornościowe (Zero-Failure Fallback):
   - W przypadku chwilowej niedostępności API Gemini lub limitów, system automatycznie stosuje lokalny algorytm heurystyczny rankingujący po słowach kluczowych i sentymencie, gwarantując ciągłość pracy harmonogramu 4x/dobę.

### Krok 2: Integracja z Autonomicznym Harmonogramem (`executeAutonomousRun`)
1. Zastąpienie mechanizmu pobierania pierwszego artykułu wywołaniem selektora Gemini.
2. Oznaczenie wybranego artykułu jako przetworzonego.
3. Podpięcie wybranego artykułu jako `candidateArticle` z `candidateViralityScore` w punkcie kontrolnym `/api/autopilot/scheduler`.

### Krok 3: Czystość Interfejsu (Pełny automat w tle)
1. Zgodnie z wytyczną: *„Pełny automat w tle bez pokazywania rankingu”*.
2. Interfejs pozostaje minimalistyczny:
   - Wybrany przez Gemini news pojawia się automatycznie w sekcji zaplanowanego montażu wraz z punktacją i uzasadnieniem.
   - Użytkownik nie musi przeglądać list, głosować ani zatwierdzać — system podejmuje decyzję samoczynnie.

---

## 3. Plan testów i weryfikacji
1. **Test wieloartykułowy:** Przetestowanie selektora na realnej paczce 10 artykułów z Bankier.pl za pomocą skryptu testowego i sprawdzenie, czy artykuł o stopach/kredytach jest poprawnie priorytetyzowany nad niszowymi komunikatami giełdowymi.
2. **Test odporności fallbacku:** Zweryfikowanie działania w przypadku braku odpowiedzi API zewnętrznego.
3. **Weryfikacja jakościowa:** Uruchomienie `npm run lint` oraz `npm run build` przed wdrożeniem.
