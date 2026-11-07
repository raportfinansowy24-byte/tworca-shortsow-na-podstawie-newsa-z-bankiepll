import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import type { RemoteAddress } from './remoteUrlSecurity';
import { pinnedLookup, validateRemoteUrl } from './remoteUrlSecurity';

type Validated = { url: URL; addresses: RemoteAddress[] };
type Validator = (value: string) => Promise<Validated>;
type Requester = typeof http;

/** Download bounded data while revalidating and repinning every redirect hop. */
export async function downloadRemoteFile(value: string, destination: string, options: {
  maxBytes: number; maxRedirects?: number; timeoutMs?: number; signal?: AbortSignal; validate?: Validator; http?: Requester; https?: Requester;
}): Promise<void> {
  const validate = options.validate ?? validateRemoteUrl;
  const maxRedirects = options.maxRedirects ?? 5;
  try {
    let current = value;
    for (let redirects = 0; ; redirects++) {
      const { url, addresses } = await validate(current);
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
  await new Promise<void>((resolve, reject) => {
    const req = client.request(url, { method: 'POST', lookup: pinnedLookup(addresses), headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      res.resume(); res.on('end', resolve);
    });
    req.setTimeout(options.timeoutMs ?? 5000, () => req.destroy(new Error('Webhook timeout')));
    req.on('error', reject);
    req.end(body);
  });
}
