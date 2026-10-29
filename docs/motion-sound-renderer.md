# Motion / Sound Renderer

The finance pipeline now applies a deterministic motion and sound preset to every data-visual scene.

## Motion presets

- `hero-zoom` — hook push-in with short fade edges.
- `data-rise` — controlled zoom for market and leader data.
- `impact-drop` — tighter impact movement for a negative result.
- `split-reveal` — contrast beat treatment.
- `parallax` — calmer explanatory movement.
- `takeaway-push` — slower conclusion push-in.
- `end-card` — end-card hold with fade.

The motion filter is generated for the target resolution and FPS and is passed directly to FFmpeg. No remote animation asset is required.

## Sound presets

Each beat receives a short local FFmpeg-generated effect:

- hook hit,
- data tick,
- positive rise,
- negative impact,
- contrast sweep,
- soft pulse,
- CTA chime.

When ElevenLabs narration exists, the effect is mixed below the voice with a conservative volume. The voice remains the primary audio track. The finance pipeline does not use Google TTS.

## Failure behavior

If ElevenLabs fails, the render fails. If a matched clip is required and cannot be downloaded, the render fails. Motion/sound generation itself is deterministic and local; it never downloads an unverified placeholder.
