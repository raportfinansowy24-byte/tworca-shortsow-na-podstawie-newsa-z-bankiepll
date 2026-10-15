# Audyt rendererów w repozytoriach — 2026-10-15

## Decyzja

Użyć istniejącego repozytorium Bankier jako źródła artykułu i przebiegu redakcyjnego, a jego ścieżkę Pexels/ElevenLabs uzupełnić niezależnym, lokalnym rendererem FFmpeg. Przygotowany prototyp tworzy cztery plansze typograficzne po 4,5 s (łącznie 18 s), 1080×1920, 30 fps; przyjmuje tekst scenariusza, który musi mieć status weryfikacji i zachowuje źródło w metadanych. Może dodać lokalny plik audio, ale sam nie syntetyzuje głosu. Nie korzysta z MoviePy, Pexels, Hugging Face, Veo ani płatnego generowania wideo.

To najmniej zależny od zewnętrznych limitów wariant renderowania, nie dowód na kompletną, bezpłatną produkcję czterech gotowych filmów dziennie. W tym przeglądzie nie potwierdzono licencji ani stałych limitów dla zewnętrznych usług; środowisko/hosting, TTS i prawa do assetów nadal trzeba rozstrzygnąć. Zamiast losowego stocku używane są abstrakcyjne plansze; nie przedstawiają fałszywych kursów ani wykresów.

## Wybrane repozytoria i dowody

| Repozytorium | Co zawiera | Wartość / ograniczenia |
|---|---|---|
| [tworca-shortsow-na-podstawie-newsa-z-bankiepll](https://github.com/raportfinansowy24-byte/tworca-shortsow-na-podstawie-newsa-z-bankiepll) | Pełny przepływ Bankier.pl → scenariusz → job → FFmpeg/MP4, napisy, UI i kolejka; `server.ts`, `src/components/AiViralAutoPilot.tsx`. | Najlepszy kręgosłup produktu. Test end-to-end zatrzymał się na wymaganym kluczu Pexels; kod używa ElevenLabs, gdy włączone jest TTS. Nie potwierdzono tutaj limitów ani kosztów tych usług. |
| [Make-Video-Scene-Combiner-Connector](https://github.com/raportfinansowy24-byte/Make-Video-Scene-Combiner-Connector) | `main.py` składa trzy sceny po 6 s: 1080×1920, 30 fps, napisy/audio, FFmpeg. | Najmocniejszy dowód na techniczny format 18 s/9:16. To handler Cloud Function, nie potwierdzony worker lokalny; wymaga wejściowych klipów, używa Google Cloud TTS i przewiduje GCS. Sample-assetów nie uznano za licencjonowany katalog produkcyjny. |
| [Hsh](https://github.com/raportfinansowy24-byte/Hsh) | `server.ts`: FFmpeg, asynchroniczne joby, historia MP4 1080×1920, TTS/Auto-Pilot. | Dobry wzorzec UI i jobów. Długość nie jest egzekwowana jako dokładne 18 s; źródła klipów i harmonogram produkcji nie są zapewnione; TTS/Gemini zależą od usług zewnętrznych. |
| [wideotworca](https://github.com/raportfinansowy24-byte/wideotworca) | `server.py`, `video_processing.py`, `piper_tts.py`: job/statusy, helpery FFmpeg, lokalny Piper PL; żądany czas 18 s. | Przydatne wzorce helperów. Istniejąca ścieżka wizualna korzysta z zewnętrznych modeli/Spaces, kolejka jest procesowa, a stałej darmowej dostępności nie potwierdzono. Piper wymaga osobnej kontroli wersji, licencji modelu i jakości. |
| [1234](https://github.com/raportfinansowy24-byte/1234) | Prototyp Google Sheets + FFmpeg + Hugging Face ZeroGPU/LTX-Video. | Nie jest gwarantowanym darmowym fallbackiem: nominalnie 3×4 s = 12 s, format 9:16 nie jest wymuszony, brak lektora/napisów i niezawodnego workflow. |

## Pozostałe repozytoria

- [cashmaker-veo-worker2](https://github.com/raportfinansowy24-byte/cashmaker-veo-worker2): helpery FFmpeg/Piper i SQLite, ale brakuje deklarowanego `server:app`/orkiestracji.
- [shorts-bot](https://github.com/raportfinansowy24-byte/shorts-bot): skleja trzy gotowe klipy i wypala napisy; nie wymusza 9:16/18 s i korzysta z Google Speech-to-Text.
- [raportfinansowy24-social-listening-api](https://github.com/raportfinansowy24-byte/raportfinansowy24-social-listening-api): bridge do danych, nie renderer.
- [Raportfinansowy24-gmail.com](https://github.com/raportfinansowy24-byte/Raportfinansowy24-gmail.com), [organic-finance-railway-lite](https://github.com/raportfinansowy24-byte/organic-finance-railway-lite), [Tysi-cpiecset](https://github.com/raportfinansowy24-byte/Tysi-cpiecset): treści/prototypy lub niepodłączone fragmenty, bez kompletnego MP4 workflow.
- [COMBAJNOstateczny](https://github.com/raportfinansowy24-byte/COMBAJNOstateczny) i [COMBAJNOstateczny-v2](https://github.com/raportfinansowy24-byte/COMBAJNOstateczny-v2): generatory poleceń/skryptów FFmpeg lub symulowane kolejki, nie renderer aplikacyjny shorta finansowego.
- [mylead-agent](https://github.com/raportfinansowy24-byte/mylead-agent): brak kodu aplikacyjnego; [FinancialFreedom](https://github.com/raportfinansowy24-byte/FinancialFreedom): repo puste.

## Zastrzeżenia do celu „4 dziennie za darmo”

- FFmpeg lokalnie nie nalicza opłaty per render, ale koszt/niezawodność maszyny, storage i transferu zależą od środowiska.
- Obecny pipeline Bankier nie ma potwierdzonego wariantu darmowego dla assetów newsowych ani lektora: wykryto zależności Pexels i ElevenLabs (gdy TTS jest włączone). Lokalny, licencjonowany TTS można dodać oddzielnie, ale jakość i licencję konkretnego modelu należy sprawdzić przed użyciem.
- Żaden sprawdzony projekt nie dowiódł jednocześnie kompletnego, niezawodnego batcha 4 × 18 s dziennie, legalnego źródła wizualiów, lokalnego lektora, trwałej kolejki/schedulera i zerowych kosztów eksploatacji.
- Prototyp rendererа waliduje źródło `bankier.pl`, cztery role scen, `fact_check_status: verified`, 1080×1920 i 18 s. Nie sprawdza prawdziwości samych twierdzeń ani legalności dostarczonego audio; te pozostają odpowiedzialnością redakcyjną.
- Renderowanie nie publikuje filmu. Brak schedulerа/automatycznej publikacji jest celowy.

## Sposób testowania

```bash
python3 -m unittest discover -s tests -p 'test_render_offline_short.py'
python3 scripts/render_offline_short.py --demo --output exports/offline-render-demo.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of json exports/offline-render-demo.mp4
```
