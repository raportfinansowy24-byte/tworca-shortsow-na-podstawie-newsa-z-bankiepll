import assert from 'node:assert/strict';
import { buildCampaignTrackingLinks } from '../src/server/campaignTracking';
import { selectFinanceCta, buildCtaPolicyPrompt } from '../src/server/financeCtaStrategy';

const tiktok = buildCampaignTrackingLinks({ platform: 'tiktok', contentId: 'job-123', destinationPath: '/loan' });
const tiktokUrl = new URL(tiktok.destinationUrl);
assert.equal(tiktokUrl.origin, 'https://raport-finansowy24.pl');
assert.equal(tiktokUrl.pathname, '/loan');
assert.equal(tiktokUrl.searchParams.get('utm_source'), 'tiktok');
assert.equal(tiktokUrl.searchParams.get('utm_medium'), 'organic_social');
assert.equal(tiktokUrl.searchParams.get('utm_campaign'), 'shorts');
assert.equal(tiktokUrl.searchParams.get('utm_content'), 'job-123');
assert.equal(tiktok.descriptionUrl, tiktok.destinationUrl);
assert.ok(tiktok.pinnedComment.includes(tiktok.destinationUrl));
assert.equal(tiktok.metadata.destinationUrl, tiktok.destinationUrl);

const youtube = buildCampaignTrackingLinks({ platform: 'youtube-shorts', contentId: 'short ąę 01' });
const youtubeUrl = new URL(youtube.destinationUrl);
assert.equal(youtubeUrl.searchParams.get('utm_source'), 'youtube');
assert.equal(youtubeUrl.searchParams.get('utm_content'), 'short-ae-01');
assert.equal(youtubeUrl.pathname, '/');

const cta = selectFinanceCta({ title: 'RPP pozostawiła stopy procentowe bez zmian', category: 'Kredyty' });
assert.match(cta.spokenText, /raport-finansowy24\.pl/);
assert.match(cta.spokenText, /policz ratę kredytu/i);
assert.equal(cta.destinationUrl, 'https://raport-finansowy24.pl/loan');

const prompt = buildCtaPolicyPrompt();
assert.match(prompt, /MUSI jawnie wypowiedzieć adres/);
assert.match(prompt, /utm_source=tiktok lub youtube/);
assert.doesNotMatch(prompt, /NIGDY w tekście lektora/);
console.log('Campaign tracking and CTA tests passed');
