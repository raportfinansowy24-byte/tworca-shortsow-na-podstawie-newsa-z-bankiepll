# Finance Short Pipeline v2

Pipeline v2 replaces the old `stock clip + voice + subtitles` flow for Bankier.pl financial news.

```text
Bankier.pl article
  -> Fact extraction and risk flags
  -> Hook and retention plan
  -> Visual storyboard with eight beats
  -> Deterministic financial SVG cards
  -> Optional matched video assets
  -> ElevenLabs narration with timing
  -> FFmpeg motion/caption render
  -> Quality Gate
  -> MP4 or explicit error
```

## Activation

The Auto-Pilot route activates pipeline v2 when `pipelineVersion` is `finance-v2` or when `bankierArticle` is provided. It creates a `FinanceShortPlan`, validates its facts and visual scenes, and sends the plan to the renderer.

Each generated scene has a `visualMode`, beat type, caption, voiceover, camera/transition intent and `visualSvg`. The SVG is generated from article facts, so a financial Short shows actual numbers rather than an unrelated stock background. It is rendered directly by FFmpeg as a vertical 720x1280 scene.

## Quality gates

The render is blocked when:

- no confirmed percentage facts can be extracted for a data-driven article,
- a data scene has no SVG,
- a scene has no narration,
- the scene count is not exactly eight,
- a remote matched clip is missing or fails download in a clip-based scene,
- the ElevenLabs key is missing or ElevenLabs fails.

The pipeline does not use Google TTS. `ELEVENLABS_API_KEY` is mandatory for finance pipeline renders; errors are surfaced instead of silently downgrading the voice.

## Output contract

A successful plan exposes `qualityGate` metrics, `riskFlags`, `facts`, `architecture` and the complete scene plan. A failed gate returns an error and `fallbackDisabled: true`; it never creates a final MP4.

## Tests

```bash
npm run test:short-pipeline
npm run test:creative-director
npm run test:scene-contract
npm run lint
npm run build
```
