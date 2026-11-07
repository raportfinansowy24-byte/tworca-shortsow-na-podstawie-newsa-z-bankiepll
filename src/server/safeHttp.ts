import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import type { RemoteAddress } from './remoteUrlSecurity';
import { pinnedLookup, validateRemoteUrl } from './remoteUrlSecurity';

type Validated = { url: URL; addresses: RemoteAddress[] };
type Validator = (value: string) => Promise<Validated>;
type Requester = typeof http;

/** Download with both a socket inactivity timeout and a hard end-to-end deadline. */
export async function downloadRemoteFile(value: string, destination: string, options: {
  maxBytes: number; maxRedirects?: number; timeoutMs?: number; signal?: AbortSignal; validate?: Validator; http?: Requester; https?: Requester;
}): Promise<void> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeoutMs = options.timeoutMs ?? 12_000;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error(timedOut ? 'Download total timeout' : 'Download aborted'));
    if (controller.signal.aborted) onAbort();
    else controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    await Promise.race([downloadRemoteFileImpl(value, destination, { ...options, timeoutMs, signal: controller.signal }), aborted]);
  } catch (error) {
    controller.abort();
    await fs.promises.unlink(destination).catch(() => undefined);
    if (timedOut) throw new Error('Download total timeout');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
  }
}

/** Download bounded data while revalidating and repinning every redirect hop. */
async function downloadRemoteFileImpl(value: string, destination: string, options: {
  maxBytes: number; maxRedirects?: number; timeoutMs?: number; signal?: AbortSignal; validate?: Validator; http?: Requester; https?: Requester;
}): Promise<void> {
  const validate = options.validate ?? validateRemoteUrl;
  const maxRedirects = options.maxRedirects ?? 5;
  try {
    let current = value;
    for (let redirects = 0; ; redirects++) {
      const { url, addresses } = await validate(current);
      if (options.signal?.aborted) throw new Error('Download aborted');
      const client = url.protocol === 'https:' ? (options.https ?? https) : (options.http ?? http);
      let redirected = false;
      await new Promise<void>((resolve, reject) => {
        let completed = false;
        let file: fs.WriteStream | undefined;
        let req: http.ClientRequest | undefined;
        const finish = (error?: Error) => {
          if (completed) return;
          completed = true;
          options.signal?.removeEventListener('abort', onAbort);
          if (error) { req?.destroy(); file?.destroy(); reject(error); }
          else resolve();
        };
        const onAbort = () => finish(new Error('Download aborted'));
        if (options.signal?.aborted) return onAbort();
        options.signal?.addEventListener('abort', onAbort, { once: true });
        req = client.get(url, { lookup: pinnedLookup(addresses) }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            if (redirects >= maxRedirects) return finish(new Error('Redirect limit exceeded'));
            current = new URL(res.headers.location, url).toString();
            redirected = true;
            finish();
            return;
          }
          if (res.statusCode !== 200 && res.statusCode !== 206) { res.resume(); return finish(new Error(`HTTP ${res.statusCode}`)); }
          if (Number(res.headers['content-length']) > options.maxBytes) { res.destroy(); return finish(new Error('Response too large')); }
          let bytes = 0;
          file = fs.createWriteStream(destination);
          res.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > options.maxBytes) finish(new Error('Response too large'));
          });
          res.on('error', finish);
          file.on('error', finish);
          file.on('finish', () => finish());
          res.pipe(file);
        });
        req.on('error', finish);
        if (options.timeoutMs) req.setTimeout(options.timeoutMs, () => finish(new Error('Download timeout')));
      });
      if (redirected) continue;
      return;
    }
  } catch (error) {
    await fs.promises.unlink(destination).catch(() => undefined);
    throw error;
  }
}

export async function postWebhook(value: string, body: string, options: {
  timeoutMs?: number; validate?: Validator; http?: Requester; https?: Requester;
} = {}): Promise<void> {
  const { url, addresses } = await (options.validate ?? validateRemoteUrl)(value);
  const client = url.protocol === 'https:' ? (options.https ?? https) : (options.http ?? http);
  const timeoutMs = options.timeoutMs ?? 5000;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const req = client.request(url, { method: 'POST', lookup: pinnedLookup(addresses), headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      res.on('error', finish);
      res.on('end', () => finish());
      res.resume();
    });
    // Socket inactivity timeout is not an end-to-end deadline: enforce both.
    timer = setTimeout(() => req.destroy(new Error('Webhook total deadline exceeded')), timeoutMs);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Webhook inactivity timeout')));
    req.on('error', finish);
    req.end(body);
  });
}
