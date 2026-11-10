# Bankier Shorts Creator — Android Application 📱🚀

Zaawansowana natywna aplikacja na system Android (Kotlin + Jetpack Compose + Material Design 3) do automatycznej produkcji i monitoringu pionowych filmów krótkometrażowych (Shorts / Reels / TikTok) na podstawie najświeższych wiadomości finansowych z portalu **Bankier.pl**.

---

## 🏗️ Architektura aplikacji Android

Aplikacja została zaprojektowana w nowoczesnym wzorcu **MVVM (Model-View-ViewModel)** z wykorzystaniem **Jetpack Compose** oraz reaktywnych strumieni **Kotlin Coroutines / StateFlow**:

```text
app/src/main/
├── AndroidManifest.xml
├── java/com/example/bankiershorts/
│   ├── MainActivity.kt               # Główna aktywność z Edge-to-Edge i dolnym paskiem nawigacji M3
│   ├── data/
│   │   ├── models/Models.kt          # Modele danych (Scene, BankierArticle, JobStatus, ProfitState, ViralityScore)
│   │   └── repository/BankierShortsRepository.kt # Zarządzanie danymi, kolejką renderera i analizą RSS
│   ├── ui/
│   │   ├── screens/
│   │   │   ├── AutopilotScreen.kt    # Harmonogram 4x dziennie, kandydat do newsu, wynik wiralowości, natychmiastowy render
│   │   │   ├── BankierNewsScreen.kt  # Kanał wiadomości Bankier.pl, filtry (Wiadomości, Giełda GPW, Waluty), trendy rynkowe
│   │   │   ├── VideoCombinerScreen.kt# 4-scenowy storyboard (18s), edycja napisów i tekstu lektora, stylizacja napisów
│   │   │   ├── RenderingQueueScreen.kt# Kolejka montażu wideo, pasek postępu %, anulowanie, podgląd playera
│   │   │   ├── ProfitMonitorScreen.kt # Monitor celu 10 000 €/msc, wskaźniki CPA, estymacja wyświetleń i konwersji
│   │   │   └── WebhooksScreen.kt     # Integracja Make.com / n8n, przykładowy payload JSON, historia wywołań
│   │   ├── theme/
│   │   │   ├── Color.kt              # Paleta kolorów M3 (Emerald #10B981, Indigo #6366F1, Amber #F59E0B)
│   │   │   ├── Theme.kt              # Ciemny, elegancki motyw finansowy BankierShortsTheme
│   │   │   └── Type.kt               # Typografia Material Design 3
│   │   └── viewmodel/
│   │       └── MainViewModel.kt      # Zarządzanie stanem UI, filtrowaniem i zdarzeniami Snackbar
└── res/                              # Wektory ikon adaptacyjnych, zasoby kolorów i łańcuchów znaków
```

---

## ⚡ Główne moduły aplikacji

1. **Autopilot Shortów**:
   - Stały harmonogram 4 slotów dziennie (06:00, 11:00, 16:00, 21:00) dla optymalnych zasięgów na platformach wideo.
   - Algorytm oceny wiralowości (Virality Score 0-100) dobierający najbardziej chwytliwe artykuły z Bankier.pl.
   - Szybki przycisk testowy: "Renderuj jeden testowy short".

2. **Bankier.pl Live Feed & Monitoring Trendów**:
   - Kategorie: Wszystkie, Wiadomości, Giełda GPW, Kursy walut.
   - Szybkie wyszukiwanie i automatyczne generowanie 4 scen z wybranego newsu.
   - Analiza słów kluczowych o najwyższym współczynniku zaangażowania (Stopy procentowe, Inflacja, WIG20, Dolar).

3. **Kreator i Edytor Scen (Standard 18.0s)**:
   - Zablokowany standard maksymalnej retencji: 4 sceny po 4.5 sekundy.
   - Podział narracyjny: Scena 1 (Hook 3s), Scena 2 (Kontekst), Scena 3 (Liczby i fakty), Scena 4 (Call to Action).
   - Stylizacja napisów: Animacja *word-by-word*, *single-word*, *karaoke*, wybór kolorów podświetlenia (żółty, limonkowy, czerwony, cyjan).

4. **Kolejka Renderowania**:
   - Płynny pasek postępu renderowania w czasie rzeczywistym z poszczególnymi krokami (Pobieranie wideo z Pexels, Synteza TTS, Napisy ASS, Montaż FFmpeg).
   - Opcja bezpiecznego anulowania zadania.
   - Podgląd gotowego shorta 9:16 w odtwarzaczu.

5. **Profit Monitor (Cel 10 000 € / miesiąc)**:
   - Śledzenie postępów monetyzacji afiliacyjnej w oparciu o modele CPA (konta oszczędnościowe, obligacje, kredyty).
   - Estymacja wyświetleń, kliknięć w bio i złożonych wniosków.

6. **Konektor Make.com & n8n**:
   - Pełna specyfikacja payloadu JSON dla zewnętrznych scenariuszy automatyzacji.
   - Dziennik odebranych wywołań webhooków.

---

## 🚀 Budowanie projektu

- Gradle Version Catalog w `gradle/libs.versions.toml`
- Jetpack Compose z Kotlin Compose Compiler
- Target SDK: 35 (Android 15), Min SDK: 26 (Android 8.0)
