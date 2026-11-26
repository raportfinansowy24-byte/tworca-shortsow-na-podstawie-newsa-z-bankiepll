import { getElevenLabsNarrationLimitError } from './narrationTiming';

export type EmotionalDirectionScene = {
  voiceover_text?: unknown;
  beat?: unknown;
  directorPurpose?: unknown;
  purpose?: unknown;
};

/**
 * Build one continuous TTS input from the already-approved scene narration.
 * Audio tags are emitted only for Eleven v3/v4, where the provider documents support.
 * The plain narration remains unchanged for subtitles and word-alignment checks.
 */
export function buildEmotionallyDirectedNarration(
  scenes: EmotionalDirectionScene[],
  modelId: string
): string {
  const supportsAudioTags = /^eleven_v[34](?:_turbo)?$/i.test(String(modelId || '').trim());
  const segments = scenes
    .map((scene, index) => {
      const text = String(scene.voiceover_text ?? '').replace(/\s+/gu, ' ').trim();
      if (!text) return '';
      if (!supportsAudioTags) return text;

      const beat = String(scene.beat || scene.directorPurpose || scene.purpose || '').toLocaleLowerCase('pl-PL');
      const lower = text.toLocaleLowerCase('pl-PL');
      let tag = '';
      if (index === 0 || /hook|otwarcie/.test(beat)) {
        tag = '[curious]';
      } else if (/cta|call.?to.?action/.test(beat)) {
        tag = '[confident]';
      } else if (/loser|risk|warning|problem|spad|strat|zagroż|ryzyk/.test(beat) ||
        /ryzyko|strat[ayę]|spadek|zagrożenie|uwaga|problem/.test(lower)) {
        tag = '[serious]';
      } else if (/leader|positive|opportunit|wzrost|korzyść/.test(beat) ||
        /wzrost|zysk|korzyść|szansa|rekord|więcej/.test(lower)) {
        tag = '[excited]';
      } else if (/meaning|takeaway|wniosek|kontekst|explain/.test(beat)) {
        tag = '[thoughtful]';
      }
      return tag ? tag + ' ' + text : text;
    })
    .filter(Boolean);
  return segments.join(' ').replace(/\s+/gu, ' ').trim();
}

/**
 * Validate the exact single-request text produced for ElevenLabs.
 * This includes model-specific audio tags and whitespace normalization.
 */
export function getEmotionallyDirectedNarrationLimitError(
  scenes: EmotionalDirectionScene[],
  modelId: string
): string | null {
  return getElevenLabsNarrationLimitError(buildEmotionallyDirectedNarration(scenes, modelId));
}
