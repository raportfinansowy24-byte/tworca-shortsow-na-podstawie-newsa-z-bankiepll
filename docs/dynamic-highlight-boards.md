# Dynamiczne plansze „ściąga”

Endpoint `POST /api/combine-scenes` przyjmuje opcjonalny obiekt `highlightBoards`. Gdy pole nie zostanie podane, plansze są włączone; ustawienie `enabled: false` wraca do dotychczasowego generatora napisów. Przykład:

```json
{
  "highlightBoards": {
    "enabled": true,
    "position": "bottom",
    "fontSize": 62,
    "fontColor": "#ffffff",
    "highlightColor": "#ff3030",
    "outlineColor": "#000000",
    "outlineWidth": 5,
    "shadow": 2,
    "maxLines": 2,
    "minWords": 3,
    "maxWords": 6
  }
}
```

Plansza wybiera wyłącznie krótki, dosłowny fragment narracji zawierający liczbę/wyrażenie finansowe; nie generuje parafrazy ani nowych twierdzeń. Zdarzenie ASS wymaga zgodnego alignmentu słów z odpowiedzi ElevenLabs `with-timestamps`; brak lub niezgodność timestampów oznacza pominięcie planszy zamiast zgadywania czasu. Wideo nadal jest renderowane przez istniejący filtr ASS w FFmpeg, więc tekst trafia do MP4.
