import assert from 'node:assert/strict';
import { cleanStockSearchQuery, scoreStockCandidateSoftAvoidance } from '../src/server/stockCandidatePolicy';

assert.equal(
  cleanStockSearchQuery('finance notes, paper bars, documentation compliance'),
  'finance notes paper bars documentation compliance',
  'preserve finance-relevant scene nouns instead of stripping them from stock searches'
);
assert.equal(cleanStockSearchQuery('illustration drawing concept tutorial ETF'), 'ETF');

const unrelatedHints = scoreStockCandidateSoftAvoidance(
  'https://videos.pexels.com/video-files/medical-doctor-reviewing-patient-records.mp4'
);
assert.deepEqual(unrelatedHints.matchedTerms, ['doctor', 'medical']);
assert.equal(unrelatedHints.penalty, 16, 'a soft hint should only lower ranking by a bounded amount');

const transport = scoreStockCandidateSoftAvoidance(
  'https://videos.pexels.com/video-files/transport-workers-reviewing-a-financial-chart.mp4'
);
assert.deepEqual(transport.matchedTerms, [], 'the token sport must not match inside the word transport');
assert.equal(transport.penalty, 0);

const sportsCompany = scoreStockCandidateSoftAvoidance(
  'https://videos.pexels.com/video-files/sports-company-financial-market-analysis.mp4'
);
assert.deepEqual(sportsCompany.matchedTerms, ['sports']);
assert.equal(sportsCompany.penalty, 8, 'even an exact avoid-hint remains a ranking penalty, never a rejection');

const requestedMedical = scoreStockCandidateSoftAvoidance(
  'https://videos.pexels.com/video-files/medical-company-market-analysis.mp4',
  'medical company equity results'
);
assert.deepEqual(requestedMedical.matchedTerms, [], 'an explicitly requested medical-sector scene must not be demoted');

console.log('Stock candidate policy tests passed');
