export function isTrustedStockVideoDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trustedHost = host === 'pexels.com' || host.endsWith('.pexels.com')
      || host === 'pixabay.com' || host.endsWith('.pixabay.com');
    return url.protocol === 'https:' && trustedHost && !url.username && !url.password
      && (!url.port || url.port === '443');
  } catch {
    return false;
  }
}

/** Three low-cost frames distributed through the source clip for actual-video QA. */
export function buildStockClipSamplingFilter(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 3 || durationSeconds > 180) {
    throw new Error('Nieprawidłowa długość klipu stock do kontroli obrazu.');
  }
  const sampleInterval = durationSeconds / 2.2;
  return "select='isnan(prev_selected_t)+gte(t-prev_selected_t," + sampleInterval.toFixed(4) + ")',scale=512:-2";
}

export function stockClipSamplingFrameCountIsSufficient(frameCount: number): boolean {
  return Number.isInteger(frameCount) && frameCount >= 3;
}
