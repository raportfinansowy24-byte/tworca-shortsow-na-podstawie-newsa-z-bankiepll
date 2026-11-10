import assert from 'node:assert/strict';
import { buildFinancialChartSvg } from '../src/server/financeChartVisual';
import { isSafeFinanceDataVisualSvg } from '../src/server/sceneContract';

// Test 1: Upward trend chart (WIG20 or Orlen growth)
const upChart = buildFinancialChartSvg({
  ticker: 'WIG20',
  companyName: 'Indeks WIG20',
  changePercent: 0.86,
  direction: 'up',
  metricLabel: 'Wzrost sesji',
  metricValue: '2 450 pkt'
});

assert.ok(isSafeFinanceDataVisualSvg(upChart), 'Wykres wzrostowy musi przejść isSafeFinanceDataVisualSvg');
assert.ok(upChart.includes('WIG20'));
assert.ok(upChart.includes('+0,86%'));
assert.ok(upChart.includes('#10b981')); // Emerald green
assert.ok(upChart.includes('▲'));

// Test 2: Downward trend chart (Cyfrowy Polsat / Dino decline)
const downChart = buildFinancialChartSvg({
  ticker: 'CPS',
  companyName: 'Cyfrowy Polsat',
  changePercent: -17.67,
  direction: 'down',
  metricLabel: 'Przecena akcji',
  metricValue: '11,20 zł'
});

assert.ok(isSafeFinanceDataVisualSvg(downChart), 'Wykres spadkowy musi przejść isSafeFinanceDataVisualSvg');
assert.ok(downChart.includes('CPS'));
assert.ok(downChart.includes('-17,67%'));
assert.ok(downChart.includes('#ef4444')); // Red
assert.ok(downChart.includes('▼'));

// Test 3: String change percent with comma and neutral fallback
const neutralChart = buildFinancialChartSvg({
  ticker: 'NBP',
  companyName: 'Stopy Procentowe',
  changePercent: '5,75%',
  direction: 'neutral',
  metricLabel: 'Stopa referencyjna'
});

assert.ok(isSafeFinanceDataVisualSvg(neutralChart));
assert.ok(neutralChart.includes('NBP'));
assert.ok(neutralChart.includes('5,75%'));

// Test 4: XML escaping safety
const safeEscaping = buildFinancialChartSvg({
  ticker: 'TEST&CO',
  companyName: 'Spółka <A&B>',
  changePercent: 5.0
});
assert.ok(isSafeFinanceDataVisualSvg(safeEscaping));
assert.ok(safeEscaping.includes('TEST&amp;CO'));
assert.ok(safeEscaping.includes('&lt;A&amp;B&gt;'));

console.log('Finance chart visual tests passed');
