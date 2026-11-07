import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { isSafeExportPath, parseByteRange } from '../src/server/byteRange';
import { isPublicAddress, pinnedLookup, validateRemoteUrl } from '../src/server/remoteUrlSecurity';
import { downloadRemoteFile, postWebhook } from '../src/server/safeHttp';

const resolver = (records: Array<{ address: string; family: number }>) => async (_host: string) => records;
for (const ip of ['10.0.0.1','127.0.0.1','169.254.169.254','192.168.1.2','100.64.0.1','::1','fc00::1','fe80::1','ff02::1','2001:db8::1','2001:2::1','::ffff:127.0.0.1','2001::1','3fff::1']) assert.equal(isPublicAddress(ip), false, `${ip} must be blocked`);
assert.equal(isPublicAddress('8.8.8.8'), true);
assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
await assert.rejects(validateRemoteUrl('http://example.test', resolver([{ address: '127.0.0.1', family: 4 }])));
await assert.rejects(validateRemoteUrl('http://example.test', resolver([{ address: '2606:4700:4700::1111', family: 6 }, { address: '10.0.0.1', family: 4 }])));
const validated = await validateRemoteUrl('https://example.test/path', resolver([{ address: '8.8.8.8', family: 4 }]));
assert.equal(validated.url.hostname, 'example.test');
assert.equal(validated.addresses[0].address, '8.8.8.8');
const lookup = pinnedLookup(validated.addresses);
await new Promise<void>((resolve, reject) => lookup('example.test', {}, (err, address, family) => {
  if (err) return reject(err); assert.equal(address, '8.8.8.8'); assert.equal(family, 4); resolve();
}));
await assert.rejects(validateRemoteUrl('https://user:pass@example.test', resolver([{ address: '8.8.8.8', family: 4 }])));
await assert.rejects(validateRemoteUrl('file:///etc/passwd', resolver([])));
await assert.rejects(validateRemoteUrl('ftp://example.test/file', resolver([{ address: '8.8.8.8', family: 4 }])));

assert.deepEqual(parseByteRange('bytes=2-5', 10), { start: 2, end: 5 });
assert.deepEqual(parseByteRange('bytes=7-', 10), { start: 7, end: 9 });
assert.deepEqual(parseByteRange('bytes=-3', 10), { start: 7, end: 9 });
for (const range of ['bytes=0-1,4-5','bytes=x-y','bytes=-','bytes=10-','bytes=4-2']) assert.equal(parseByteRange(range, 10), null, range);
assert.deepEqual(parseByteRange('bytes=3-999', 10), { start: 3, end: 9 });
assert.equal(parseByteRange('bytes=0-', 0), null);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'exports-security-'));
const root = path.join(temp, 'exports'); const outside = path.join(temp, 'outside');
fs.mkdirSync(root); fs.writeFileSync(path.join(root, 'video.mp4'), 'ok'); fs.writeFileSync(outside, 'secret');
fs.symlinkSync(outside, path.join(root, 'link.mp4'));
assert.equal(isSafeExportPath(root, path.join(root, 'video.mp4')), true);
assert.equal(isSafeExportPath(root, path.join(root, 'link.mp4')), false);
assert.equal(isSafeExportPath(root, path.join(root, '..', 'outside')), false);
fs.rmSync(temp, { recursive: true, force: true });

// Local-only transport integration coverage: every hostname resolves through an injected,
// pinned loopback address, so these tests never use public DNS or the internet.
const localAddress = [{ address: '127.0.0.1', family: 4 as const }];
const validateLocal = async (value: string) => {
  const url = new URL(value);
  if (url.hostname === 'private.test') return validateRemoteUrl(value, resolver(localAddress));
  return { url, addresses: localAddress };
};
const listen = async (server: http.Server | https.Server) => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  return { port: address.port, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
};
const netTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'remote-security-'));
const httpServer = http.createServer();
const httpAddress = await listen(httpServer);
const base = `http://pinned.test:${httpAddress.port}`;
let pinnedLookupCalls = 0;
httpServer.on('request', (req, res) => {
  if (req.url === '/redirect-private') { res.writeHead(302, { Location: `http://private.test:${httpAddress.port}/must-not-connect` }); res.end(); }
  else if (req.url === '/loop') { res.writeHead(302, { Location: '/loop' }); res.end(); }
  else if (req.url === '/large') { res.writeHead(200, { 'Content-Length': '8' }); res.end('12345678'); }
  else if (req.url === '/slow') { setTimeout(() => res.end('late'), 250); }
  else if (req.url === '/slow-drip') { res.write('x'); const timer = setInterval(() => res.write('x'), 10); setTimeout(() => { clearInterval(timer); res.end(); }, 250); }
  else if (req.url === '/redirect') { res.writeHead(302, { Location: '/hook-target' }); res.end(); }
  else { res.end(req.url === '/hook-target' ? 'target' : 'ok'); }
});
const trackingHttp = Object.create(http) as typeof http;
trackingHttp.get = ((...args: Parameters<typeof http.get>) => {
  const options = args[1] as http.RequestOptions;
  const original = options.lookup;
  options.lookup = ((hostname: string, opts: any, callback: any) => { pinnedLookupCalls++; return (original as any)(hostname, opts, callback); }) as typeof options.lookup;
  return http.get(...args);
}) as typeof http.get;
await downloadRemoteFile(`${base}/ok`, path.join(netTemp, 'ok'), { maxBytes: 100, validate: validateLocal, http: trackingHttp });
assert.equal(fs.readFileSync(path.join(netTemp, 'ok'), 'utf8'), 'ok');
assert(pinnedLookupCalls > 0, 'HTTP client must use pinnedLookup rather than resolving DNS again');
await assert.rejects(downloadRemoteFile(`${base}/redirect-private`, path.join(netTemp, 'private'), { maxBytes: 100, validate: validateLocal, http: trackingHttp }));
assert.equal(fs.existsSync(path.join(netTemp, 'private')), false);
await assert.rejects(downloadRemoteFile(`${base}/loop`, path.join(netTemp, 'loop'), { maxBytes: 100, maxRedirects: 2, validate: validateLocal, http: trackingHttp }), /Redirect limit/);
await assert.rejects(downloadRemoteFile(`${base}/large`, path.join(netTemp, 'large'), { maxBytes: 4, validate: validateLocal, http: trackingHttp }));
await assert.rejects(downloadRemoteFile(`${base}/slow-drip`, path.join(netTemp, 'slow-drip'), { maxBytes: 100, timeoutMs: 40, validate: validateLocal, http: trackingHttp }), /total timeout/i);
assert.equal(fs.existsSync(path.join(netTemp, 'slow-drip')), false, 'total timeout removes partial file');
assert.equal(fs.existsSync(path.join(netTemp, 'large')), false, 'oversized partial file is removed');
let webhookRedirectTargetHit = false;
const webhookServer = http.createServer((req, res) => {
  if (req.url === '/redirect') { res.writeHead(302, { Location: '/target' }); res.end(); }
  else { webhookRedirectTargetHit = true; res.end('target'); }
});
const webhookAddress = await listen(webhookServer);
await postWebhook(`http://pinned.test:${webhookAddress.port}/redirect`, '{}', { validate: validateLocal, http: trackingHttp });
assert.equal(webhookRedirectTargetHit, false, 'webhook must not follow redirects');
await assert.rejects(postWebhook(`${base}/slow`, '{}', { timeoutMs: 30, validate: validateLocal, http: trackingHttp }), /timeout/i);
const tlsServer = https.createServer({ key: fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/local-test-key.pem')), cert: fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/local-test-cert.pem')) }, (_req, res) => res.end('tls'));
const tlsAddress = await listen(tlsServer);
const tlsLookup = pinnedLookup(localAddress);
const tlsResult = await new Promise<string>((resolve, reject) => {
  https.get(`https://localhost:${tlsAddress.port}/`, { lookup: tlsLookup, agent: new https.Agent({ rejectUnauthorized: false }) }, (res) => {
    let body = ''; res.setEncoding('utf8'); res.on('data', (chunk) => body += chunk); res.on('end', () => resolve(body));
  }).on('error', reject);
});
assert.equal(tlsResult, 'tls', 'HTTPS client connects through pinned lookup');
await httpAddress.close(); await webhookAddress.close(); await tlsAddress.close(); fs.rmSync(netTemp, { recursive: true, force: true });
console.log('Security, range and export path tests passed.');
