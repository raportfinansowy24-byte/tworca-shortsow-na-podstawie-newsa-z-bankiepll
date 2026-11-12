export type SpeechWordTiming = { word: string; start: number; end: number };

export interface SceneNarrationSegment {
  start: number;
  end: number;
  duration: number;
  wordTimings: SpeechWordTiming[];
}

function normalizeSpeechWord(value: string): string {
  return String(value || '').toLocaleLowerCase('pl-PL').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '');
}

/**
 * Map one continuous ElevenLabs alignment back onto the storyboard's scene texts.
 * Text and word order must match exactly; silently guessing a boundary would
 * produce captions or cuts that drift away from the spoken narration.
 */
export function splitNarrationAlignmentByScenes(
  sceneTexts: string[],
  alignedWords: SpeechWordTiming[],
  totalDurationSeconds: number
): SceneNarrationSegment[] {
  if (!Array.isArray(sceneTexts) || sceneTexts.length === 0 || sceneTexts.some((text) => !String(text || '').trim())) {
    throw new Error('Jedna narracja musi zawierać tekst dla każdej sceny.');
  }
  if (!Array.isArray(alignedWords) || alignedWords.length === 0 ||
      !Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) {
    throw new Error('Brak poprawnych znaczników czasu pełnej narracji ElevenLabs.');
  }

  const expectedTokens = sceneTexts.map((text) => String(text).trim().split(/\s+/u).filter(Boolean));
  const flattenedExpected = expectedTokens.flat();
  if (flattenedExpected.length !== alignedWords.length) {
    throw new Error(`Niezgodna liczba słów w alignmencie ElevenLabs: tekst=${flattenedExpected.length}, audio=${alignedWords.length}.`);
  }

  for (let index = 0; index < flattenedExpected.length; index++) {
    const expected = normalizeSpeechWord(flattenedExpected[index]);
    const actual = normalizeSpeechWord(alignedWords[index].word);
    if (!expected || expected !== actual) {
      throw new Error(`Alignment ElevenLabs rozjechał się przy słowie ${index + 1}: oczekiwano „${flattenedExpected[index]}”, otrzymano „${alignedWords[index].word}”.`);
    }
    const timing = alignedWords[index];
    if (!Number.isFinite(timing.start) || !Number.isFinite(timing.end) || timing.start < 0 || timing.end <= timing.start || timing.end > totalDurationSeconds + 0.1) {
      throw new Error(`Nieprawidłowy znacznik czasu słowa ${index + 1} w pełnej narracji.`);
    }
  }

  const sceneWordGroups: SpeechWordTiming[][] = [];
  let cursor = 0;
  for (const tokens of expectedTokens) {
    sceneWordGroups.push(alignedWords.slice(cursor, cursor + tokens.length));
    cursor += tokens.length;
  }

  return sceneWordGroups.map((words, sceneIndex) => {
    const previousWords = sceneWordGroups[sceneIndex - 1];
    const nextWords = sceneWordGroups[sceneIndex + 1];
    const start = previousWords
      ? (previousWords[previousWords.length - 1].end + words[0].start) / 2
      : 0;
    const end = nextWords
      ? (words[words.length - 1].end + nextWords[0].start) / 2
      : totalDurationSeconds;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > totalDurationSeconds + 0.1) {
      throw new Error(`Nie można bezpiecznie wyznaczyć granicy audio sceny ${sceneIndex + 1}.`);
    }
    return {
      start,
      end,
      duration: end - start,
      wordTimings: words.map((word) => ({
        word: word.word,
        start: Math.max(0, word.start - start),
        end: Math.max(0, word.end - start)
      }))
    };
  });
}
