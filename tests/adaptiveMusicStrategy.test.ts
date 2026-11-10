import assert from 'node:assert/strict';
import {
  detectArticleSentiment,
  selectAdaptiveBackgroundMusic,
  ADAPTIVE_MUSIC_CATALOG
} from '../src/server/adaptiveMusicStrategy';

// Test 1: Urgent tension detection (crashes, drops, crisis)
const crashNews = detectArticleSentiment(
  'Krach na GPW: Cyfrowy Polsat traci 17 procent po publikacji wyników',
  'Panika wśród inwestorów. Fatalne tąpnięcie na akcjach spółki wywołało falę wyprzedaży.'
);
assert.equal(crashNews, 'urgent_tension');
const crashSelection = selectAdaptiveBackgroundMusic({ title: 'Krach na GPW' });
assert.equal(crashSelection.sentiment, 'urgent_tension');
assert.equal(crashSelection.url, ADAPTIVE_MUSIC_CATALOG.urgent_tension.url);

// Test 2: Bullish growth detection (record profits, rally)
const rallyNews = detectArticleSentiment(
  'Hossa na giełdzie: Rekordowy zysk Orlenu bije prognozy analityków',
  'Wzrost kursu akcji o 15 procent. Spółka wypłaci sowitą dywidendę akcjonariuszom.'
);
assert.equal(rallyNews, 'bullish_growth');
const rallySelection = selectAdaptiveBackgroundMusic({ title: 'Rekordowy zysk i dywidenda' });
assert.equal(rallySelection.sentiment, 'bullish_growth');
assert.equal(rallySelection.url, ADAPTIVE_MUSIC_CATALOG.bullish_growth.url);

// Test 3: Analytical neutral detection (macroeconomics, interest rates)
const neutralNews = detectArticleSentiment(
  'Rada Polityki Pieniężnej podjęła decyzję w sprawie stóp procentowych',
  'GUS podał najnowsze dane o inflacji w ujęciu rocznym. Rynek czeka na konferencję prasową prezesa NBP.'
);
assert.equal(neutralNews, 'analytical_neutral');
const neutralSelection = selectAdaptiveBackgroundMusic({ title: 'Decyzja RPP o stopach procentowych' });
assert.equal(neutralSelection.sentiment, 'analytical_neutral');
assert.equal(neutralSelection.url, ADAPTIVE_MUSIC_CATALOG.analytical_neutral.url);

// Test 4: Custom URL override priority
const customSelection = selectAdaptiveBackgroundMusic({
  title: 'Krach na giełdzie',
  customUrl: 'https://my-custom-domain.com/custom-track.mp3'
});
assert.equal(customSelection.isCustom, true);
assert.equal(customSelection.url, 'https://my-custom-domain.com/custom-track.mp3');

console.log('Adaptive music strategy tests passed');
