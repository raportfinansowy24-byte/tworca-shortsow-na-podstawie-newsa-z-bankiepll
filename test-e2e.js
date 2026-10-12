// End-to-end smoke test for the RaportFinansowy24 Shorts pipeline.
// Run against a locally running server with: npm run test:e2e

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

async function runStep(name, fn) {
  process.stdout.write(`\n=== [TEST] ${name} ===\n`);
  const start = Date.now();
  try {
    const result = await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[PASS] ${name} (${duration}s)`);
    return { name, success: true, result, duration };
  } catch (error) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[FAIL] ${name} (${duration}s): ${message}`);
    return { name, success: false, error: message, duration };
  }
}

async function main() {
  console.log('Uruchamiam test E2E pipeline RaportFinansowy24 Shorts.');
  console.log(`URL bazowy: ${BASE_URL}`);

  const report = [];
  let bankierArticle = null;
  let generatedScript = null;

  report.push(await runStep('1. Katalog profili nisz', async () => {
    const res = await fetch(`${BASE_URL}/api/viral-niches`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.niches) || data.niches.length < 5) {
      throw new Error('Nieprawidłowa odpowiedź katalogu profili nisz.');
    }
    console.log(`  Profile dostępne: ${data.niches.length}`);
    return data;
  }));

  report.push(await runStep('2. Pobranie aktualnych newsów Bankier.pl', async () => {
    const res = await fetch(`${BASE_URL}/api/news/bankier`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const articles = data.articles || (Array.isArray(data) ? data : []);
    if (!Array.isArray(articles) || articles.length === 0) {
      throw new Error('Bankier.pl nie zwrócił żadnego artykułu.');
    }
    bankierArticle = articles[0];
    console.log(`  Pobrano ${articles.length} newsów; pierwszy: "${bankierArticle.title}"`);
    return bankierArticle;
  }));

  if (!bankierArticle) {
    bankierArticle = {
      title: 'Decyzja RPP a raty kredytów — test awaryjnego wejścia',
      description: 'Materiał testowy używany wyłącznie wtedy, gdy źródło Bankier.pl jest niedostępne.',
      category: 'Finanse & Inwestycje'
    };
  }

  report.push(await runStep('3. Analiza czterech segmentów i słów kluczowych Pexels', async () => {
    const res = await fetch(`${BASE_URL}/api/news/analyze-scene-keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article: bankierArticle, sceneCount: 4, niche: 'Finanse & Inwestycje' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const keywords = Array.isArray(data.sceneKeywords)
      ? data.sceneKeywords
      : (Array.isArray(data.segments) ? data.segments.map((segment) => segment.primaryKeyword) : []);
    if (keywords.length !== 4 || keywords.some((keyword) => typeof keyword !== 'string' || !keyword.trim())) {
      throw new Error(`Oczekiwano 4 niepustych słów kluczowych, otrzymano ${keywords.length}.`);
    }
    console.log(`  Słowa dla 4 scen: ${keywords.join(', ')}`);
    return data;
  }));

  report.push(await runStep('4. Generowanie skryptu: 4 sceny × 4,5 s', async () => {
    const res = await fetch(`${BASE_URL}/api/generate-viral-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: bankierArticle.title,
        niche: 'Finanse & Inwestycje',
        sceneCount: 4,
        bankierArticle,
        articleContext: bankierArticle.description
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data.scenes) || data.scenes.length !== 4) {
      throw new Error(`Oczekiwano 4 scen, otrzymano ${data.scenes?.length || 0}.`);
    }
    const durations = data.scenes.map((scene) => Number(scene.duration));
    if (durations.some((duration) => duration !== 4.5)) {
      throw new Error(`Każda scena powinna trwać 4,5 s; otrzymano: ${durations.join(', ')}.`);
    }
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    if (totalDuration !== 18) throw new Error(`Łączny czas powinien wynosić 18 s, otrzymano ${totalDuration} s.`);
    const overlongSceneIndex = data.scenes.findIndex((scene) => {
      const text = String(scene.voiceover_text || scene.subtitles || '').trim();
      const words = text.split(/\s+/).filter(Boolean);
      return words.length === 0 || words.length > 10;
    });
    if (overlongSceneIndex !== -1) {
      throw new Error(`Scena ${overlongSceneIndex + 1} ma pusty lektor lub przekracza limit 10 słów.`);
    }
    if (!String(data.description || '').includes('raport-finansowy24.pl')) {
      throw new Error('Opis nie zawiera wymaganego CTA do raport-finansowy24.pl.');
    }
    const finalSceneText = data.scenes[3].voiceover_text || data.scenes[3].subtitles || '';
    if (!finalSceneText.includes('raport-finansowy24.pl')) {
      throw new Error('Ostatnia scena nie zawiera wymaganego CTA do raport-finansowy24.pl.');
    }
    if (data.scenes.some((scene) => !scene.searchKeyword || !scene.subtitles)) {
      throw new Error('Co najmniej jedna scena nie ma tekstu lub searchKeyword.');
    }
    generatedScript = data;
    console.log(`  Tytuł roboczy: "${data.title}"; łączny czas: ${totalDuration} s.`);
    return data;
  }));

  report.push(await runStep('5. Status harmonogramu cztery razy dziennie', async () => {
    const res = await fetch(`${BASE_URL}/api/autopilot/scheduler/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const state = data.state || data;
    if (!Array.isArray(state.dailySlots) || state.dailySlots.length !== 4) {
      throw new Error(`Oczekiwano 4 slotów dziennych, otrzymano ${state.dailySlots?.length || 0}.`);
    }
    if (state.sceneCount !== 4) throw new Error(`Harmonogram ma sceneCount=${state.sceneCount}, oczekiwano 4.`);
    console.log(`  Sloty: ${state.dailySlots.join(', ')}; sceny: ${state.sceneCount}.`);
    return state;
  }));

  report.push(await runStep('6. Pobranie ujęcia stock dla sceny', async () => {
    const keyword = generatedScript?.scenes?.[0]?.searchKeyword || 'finance investment graph';
    const res = await fetch(`${BASE_URL}/api/stock/fetch-scene-footage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, duration: 4.5, orientation: 'portrait' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const videoUrl = data.videoUrl || data.footage?.[0]?.videoUrl;
    if (!data.success || !videoUrl) throw new Error('Endpoint nie zwrócił działającego wyniku z URL-em wideo.');
    console.log(`  Źródło: ${data.source || data.footage?.[0]?.source || 'niepodane'}`);
    return data;
  }));

  report.push(await runStep('7. Strumieniowy podgląd głosu TTS bez trwałego pliku', async () => {
    const sampleText = generatedScript?.scenes?.[0]?.voiceover_text || 'To jest test głosu lektora.';
    const params = new URLSearchParams({
      text: sampleText.slice(0, 160),
      lang: 'pl',
      voice: generatedScript?.aiDecisions?.optimalVoice || 'pl-PL-MarekNeural',
      speed: String(generatedScript?.aiDecisions?.voiceSpeed || 1.15)
    });
    const res = await fetch(`${BASE_URL}/api/tts/stream?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    if (!(res.headers.get('content-type') || '').toLowerCase().startsWith('audio/mpeg')) {
      throw new Error(`Oczekiwano audio/mpeg, otrzymano ${res.headers.get('content-type') || 'brak Content-Type'}.`);
    }
    const audio = await res.arrayBuffer();
    if (audio.byteLength === 0) throw new Error('Strumień TTS jest pusty.');
    console.log(`  Otrzymano strumień audio: ${audio.byteLength} bajtów.`);
    return { bytes: audio.byteLength };
  }));

  console.log('\n======================================================');
  console.log('PODSUMOWANIE TESTU END-TO-END');
  console.log('======================================================');
  const allPassed = report.every((result) => result.success);
  report.forEach((result) => {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    console.log(`${status.padEnd(8)} | ${result.name.padEnd(52)} | ${result.duration}s`);
  });
  console.log('======================================================');
  console.log(`WYNIK OGÓLNY: ${allPassed ? 'SUKCES' : 'NIEPOWODZENIE'}`);
  console.log('======================================================\n');
  if (!allPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Błąd krytyczny w test-e2e.js:', error);
  process.exitCode = 1;
});
