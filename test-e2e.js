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
  let sceneAnalysis = null;

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
    sceneAnalysis = data;
    if (data.topicCategory === 'rates-credit' && keywords.some((keyword) => /cash|banknotes?|counting|bullion|gold vault|crypto|bitcoin/i.test(keyword))) {
      throw new Error('News o stopach/kredycie otrzymał ujęcie gotówki, złota lub krypto.');
    }
    console.log(`  Słowa dla 4 scen: ${keywords.join(', ')}`);
    return data;
  }));

  report.push(await runStep('3a. Kontrola semantyczna scen dla newsa o RPP', async () => {
    const fixtureArticle = {
      title: 'RPP utrzymuje stopy. Co oznacza to dla rat kredytów?',
      description: 'Rada Polityki Pieniężnej pozostawiła stopy procentowe bez zmian; materiał omawia możliwy wpływ na raty kredytowe.',
      category: 'Wiadomości'
    };
    const res = await fetch(`${BASE_URL}/api/news/analyze-scene-keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article: fixtureArticle, sceneCount: 4, niche: 'Finanse & Inwestycje' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || `HTTP ${res.status}: ${res.statusText}`);
    const keywords = (data.segments || []).map((segment) => segment.primaryKeyword);
    if (data.topicCategory !== 'rates-credit' || keywords.length !== 4) {
      throw new Error(`Oczekiwano kategorii rates-credit i czterech scen; otrzymano ${data.topicCategory || 'brak'} / ${keywords.length}.`);
    }
    if (keywords.some((keyword) => /cash|banknotes?|counting|bullion|gold vault|crypto|bitcoin/i.test(keyword))) {
      throw new Error(`Wykryto ujęcie spoza newsa o RPP: ${keywords.join(', ')}`);
    }
    console.log(`  Kategoria: ${data.topicCategory}; ujęcia: ${keywords.join(', ')}`);
    return { topicCategory: data.topicCategory, keywords };
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
    if (data.scenes.some((scene) => scene.source !== 'pexels' || !scene.pexelsId)) {
      throw new Error('Newsowy Short musi mieć cztery dopasowane klipy Pexels; test zatrzymuje się przed renderem.');
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

  report.push(await runStep('6. Pobranie czterech, tematycznie zweryfikowanych ujęć Pexels', async () => {
    const keywords = sceneAnalysis?.segments?.map((segment) => segment.primaryKeyword)
      || generatedScript?.scenes?.map((scene) => scene.searchKeyword)
      || ['loan payment calculator', 'interest rate chart', 'loan advisor client', 'monthly loan budget'];
    const res = await fetch(`${BASE_URL}/api/stock/fetch-scene-footage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        topic: bankierArticle.title,
        article: bankierArticle,
        requirePexelsMatch: true,
        duration: 4.5,
        orientation: 'portrait'
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || `HTTP ${res.status}: ${res.statusText}`);
    if (!data.success || !Array.isArray(data.footage) || data.footage.length !== 4) {
      throw new Error(`Oczekiwano czterech ujęć, otrzymano ${data.footage?.length || 0}.`);
    }
    if (data.footage.some((item) => !item.videoUrl || item.source !== 'pexels' || !item.pexelsId)) {
      throw new Error('Co najmniej jedna scena nie ma unikalnego klipu Pexels.');
    }
    if (new Set(data.footage.map((item) => item.pexelsId)).size !== 4) {
      throw new Error('Ten sam klip Pexels został przypisany do więcej niż jednej sceny.');
    }
    console.log(`  Źródło: Pexels; cztery różne identyfikatory: ${data.footage.map((item) => item.pexelsId).join(', ')}`);
    return data;
  }));

  report.push(await runStep('7. Katalog głosów konta i strumień ElevenLabs TTS', async () => {
    if (!generatedScript || !Array.isArray(generatedScript.scenes) || generatedScript.scenes.some((scene) => scene.source !== 'pexels' || !scene.pexelsId)) {
      throw new Error('Pomijam wywołanie ElevenLabs, aby nie zużyć limitu, gdy test nie ma kompletnego scenariusza z czterema klipami Pexels.');
    }
    const voicesRes = await fetch(`${BASE_URL}/api/tts/voices`);
    const voicesData = await voicesRes.json();
    if (!voicesRes.ok || !voicesData.success || voicesData.provider !== 'elevenlabs' || !Array.isArray(voicesData.voices)) {
      throw new Error(voicesData.message || `Nie można pobrać głosów ElevenLabs (HTTP ${voicesRes.status}).`);
    }
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'onwK4e9ZLuTAKqWW03F9';
    if (voicesData.defaultVoiceId !== voiceId) throw new Error(`Oczekiwano domyślnego voice ID ${voiceId}, otrzymano ${voicesData.defaultVoiceId || 'brak'}.`);
    if (!voicesData.voices.some((voice) => voice.id === voiceId)) throw new Error(`Konto ElevenLabs nie udostępnia wskazanego voice ID ${voiceId}.`);
    const sampleText = generatedScript?.scenes?.[0]?.voiceover_text || 'To jest test głosu lektora.';
    const params = new URLSearchParams({
      text: sampleText.slice(0, 160),
      lang: 'pl',
      voice: voiceId,
      speed: '1.0'
    });
    const res = await fetch(`${BASE_URL}/api/tts/stream?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    if (!(res.headers.get('content-type') || '').toLowerCase().startsWith('audio/mpeg')) {
      throw new Error(`Oczekiwano audio/mpeg, otrzymano ${res.headers.get('content-type') || 'brak Content-Type'}.`);
    }
    const audio = await res.arrayBuffer();
    if (audio.byteLength === 0) throw new Error('Strumień TTS jest pusty.');
    console.log(`  ElevenLabs voice ID: ${voiceId}; audio: ${audio.byteLength} bajtów.`);
    return { voiceId, bytes: audio.byteLength };
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
