import { selectFinanceCta } from './src/server/financeCtaStrategy';

const cases = [
  { article: 'Srebro traci na przecenie. Niepokój na giełdach.', expected: 'editorial_analysis' },
  { article: 'Spółka Cyfrowy Polsat podnosi dywidendę', expected: 'company_analysis' },
  { article: 'Rada Polityki Pieniężnej zmienia stopy procentowe, rata kredytu', expected: 'loan_calculator' },
  { article: 'Lokaty i oszczędności rosną', expected: 'savings_calculator' },
  { article: 'Bank zmienia opłatę za konto bankowe', expected: 'bank_accounts' },
  { article: 'Złoty osłabia się wobec dolara', expected: 'editorial_analysis' }
] as const;

let failures = 0;
for (const [index, testCase] of cases.entries()) {
  const actual = selectFinanceCta({ title: testCase.article }).type;
  const passed = actual === testCase.expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${index + 1}. ${testCase.article} — expected ${testCase.expected}, received ${actual}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  throw new Error(`CTA strategy: ${failures} of ${cases.length} cases failed.`);
}
console.log(`PASS: all ${cases.length} CTA strategy cases.`);
