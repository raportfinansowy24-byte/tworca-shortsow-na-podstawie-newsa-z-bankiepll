import assert from 'node:assert/strict';
import {
  getNextPendingAutopilotRetry,
  findLegacyFailedAutopilotArticleUrl,
  isCompatibleNarrationRetryCache,
  recordAutopilotFailure,
  repairUntilPass,
  resolveAutopilotRetry
} from '../src/server/autopilotRetry';

type QaReport = { status: 'pass' | 'review' | 'blocked'; message: string };

const initialReport: QaReport = { status: 'review', message: 'Powtórzone zapytanie wizualne w scenie 7.' };
let reviseCalls = 0;
const repaired = await repairUntilPass<string, QaReport>({
  initialValue: 'storyboard-with-duplicate-query',
  initialReport,
  maxAttempts: 3,
  revise: async (_report, attempt) => {
    reviseCalls += 1;
    return attempt < 2 ? 'still-invalid' : 'unique-storyboard';
  },
  evaluate: (value) => value === 'unique-storyboard'
    ? { status: 'pass', message: 'Unikalne ujęcia.' }
    : { status: 'review', message: 'Zapytanie nadal jest powtórzone.' }
});
assert.equal(repaired.passed, true, 'pętla ma kontynuować poprawki aż do uzyskania PASS');
assert.equal(repaired.attempts, 2);
assert.equal(reviseCalls, 2);
assert.equal(repaired.value, 'unique-storyboard');

let previousErrorObserved = false;
const repairedAfterTransientError = await repairUntilPass<string, QaReport>({
  initialValue: 'broken',
  initialReport,
  maxAttempts: 3,
  revise: async (_report, attempt, previousError) => {
    if (attempt === 1) throw new Error('timeout dostawcy modelu');
    previousErrorObserved = previousError === 'timeout dostawcy modelu';
    return 'fixed';
  },
  evaluate: (value) => value === 'fixed'
    ? { status: 'pass', message: 'PASS' }
    : initialReport
});
assert.equal(repairedAfterTransientError.passed, true, 'błąd techniczny poprawki nie może zakończyć całej próby');
assert.equal(repairedAfterTransientError.attempts, 2);
assert.equal(repairedAfterTransientError.errors.length, 1);
assert.equal(previousErrorObserved, true, 'kolejna poprawka otrzymuje informację o poprzednim błędzie');

const exhausted = await repairUntilPass<string, QaReport>({
  initialValue: 'always-invalid',
  initialReport,
  maxAttempts: 3,
  revise: async () => 'still-invalid',
  evaluate: () => initialReport
});
assert.equal(exhausted.passed, false);
assert.equal(exhausted.attempts, 3, 'liczba prób musi być ograniczona');
assert.equal(exhausted.value, 'still-invalid');


const cacheExpected = {
  text: 'Rynek rośnie. Sprawdź szczegóły.',
  language: 'pl',
  voiceId: 'voice-123',
  speed: 1
};
const cacheMetadata = {
  ...cacheExpected,
  durationSeconds: 3.4,
  wordTimings: [
    { word: 'Rynek', start: 0, end: 0.5 },
    { word: 'rośnie.', start: 0.5, end: 1.2 },
    { word: 'Sprawdź', start: 1.3, end: 2 },
    { word: 'szczegóły.', start: 2, end: 3.3 }
  ]
};
assert.equal(isCompatibleNarrationRetryCache(cacheMetadata, cacheExpected), true, 'cache audio można wykorzystać tylko dla dokładnie tego samego tekstu i profilu głosu');
assert.equal(isCompatibleNarrationRetryCache({ ...cacheMetadata, text: 'Inny tekst' }, cacheExpected), false);
assert.equal(isCompatibleNarrationRetryCache({ ...cacheMetadata, voiceId: 'different-voice' }, cacheExpected), false);
assert.equal(isCompatibleNarrationRetryCache({ ...cacheMetadata, speed: 0.9 }, cacheExpected), false);
assert.equal(isCompatibleNarrationRetryCache({ ...cacheMetadata, wordTimings: [] }, cacheExpected), false);
assert.equal(isCompatibleNarrationRetryCache({ ...cacheMetadata, wordTimings: cacheMetadata.wordTimings.map((timing, index) => index === 2 ? { ...timing, word: 'inne' } : timing) }, cacheExpected), false);
assert.equal(isCompatibleNarrationRetryCache({ ...cacheMetadata, durationSeconds: 0 }, cacheExpected), false);


const legacyFailureUrl = 'https://www.bankier.pl/wiadomosc/legacy-failed';
assert.equal(findLegacyFailedAutopilotArticleUrl({
  lastRunStatus: 'failed',
  processedUrls: [legacyFailureUrl, 'https://www.bankier.pl/wiadomosc/older'],
  history: [{ articleLink: 'https://www.bankier.pl/wiadomosc/completed', status: 'completed' }],
  retryQueue: []
}), legacyFailureUrl, 'odzyskaj ostatni news oznaczony jako processed przez starszą wersję przed QA');
assert.equal(findLegacyFailedAutopilotArticleUrl({
  lastRunStatus: 'failed',
  lastRunArticle: { link: legacyFailureUrl },
  processedUrls: [],
  history: [],
  retryQueue: []
}), legacyFailureUrl, 'preferuj stabilny link ostatniego artykułu, jeśli jest zapisany');
assert.equal(findLegacyFailedAutopilotArticleUrl({
  lastRunStatus: 'failed',
  processedUrls: [legacyFailureUrl],
  history: [{ articleLink: legacyFailureUrl, status: 'completed' }],
  retryQueue: []
}), null, 'nigdy nie ponawiaj artykułu z potwierdzonym udanym renderem');
assert.equal(findLegacyFailedAutopilotArticleUrl({
  lastRunStatus: 'completed',
  processedUrls: [legacyFailureUrl],
  history: [],
  retryQueue: []
}), null, 'nie odzyskuj artykułu po udanym ostatnim przebiegu');
assert.equal(findLegacyFailedAutopilotArticleUrl({
  lastRunStatus: 'failed',
  processedUrls: [legacyFailureUrl],
  history: [],
  retryQueue: [{ article: { title: 'retry', link: legacyFailureUrl }, failedAttempts: 1, status: 'pending', lastError: 'failed', firstFailedAt: '2026-11-14T00:00:00.000Z', lastFailedAt: '2026-11-14T00:00:00.000Z' }]
}), null, 'nie duplikuj migracji, gdy kolejka retry już istnieje');

const article = {
  title: 'Powtórzone ujęcia w materiale o rynku',
  link: 'https://www.bankier.pl/wiadomosc/retry-test',
  description: 'Opis źródłowego artykułu.',
  category: 'Wiadomości'
};
let queue = recordAutopilotFailure([], article, 'QA odrzuciło storyboard', 'job-1', '2026-11-14T00:00:00.000Z', 2);
assert.equal(queue.length, 1);
assert.equal(queue[0].failedAttempts, 1);
assert.equal(queue[0].status, 'pending');
assert.equal(getNextPendingAutopilotRetry(queue)?.article.link, article.link);

queue = recordAutopilotFailure(queue, article, 'Pierwsza ponowna próba nadal nie przeszła QA', 'job-2', '2026-11-14T00:10:00.000Z', 2);
assert.equal(queue[0].failedAttempts, 2);
assert.equal(queue[0].status, 'pending', 'po pierwszym retry musi pozostać jeszcze jedna dodatkowa próba');

queue = recordAutopilotFailure(queue, article, 'Druga ponowna próba nie powiodła się', 'job-3', '2026-11-14T00:20:00.000Z', 2);
assert.equal(queue[0].failedAttempts, 3);
assert.equal(queue[0].status, 'exhausted', 'po dwóch dodatkowych retry nie uruchamiaj nieskończonej pętli');
assert.equal(getNextPendingAutopilotRetry(queue), null, 'wyczerpany wpis nie może być automatycznie wybierany ponownie');

queue = resolveAutopilotRetry(queue, article.link);
assert.equal(queue.length, 0, 'udany render usuwa artykuł z kolejki ponowień');
console.log('Autopilot retry tests passed');
