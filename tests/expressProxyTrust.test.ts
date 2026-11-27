import assert from 'node:assert/strict';
import { request as httpRequest, type Server } from 'node:http';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { configureExpressProxyTrust, TRUSTED_PROXY_HOPS } from '../src/server/expressProxyTrust';

interface HttpResult {
  statusCode: number;
  body: string;
}

function get(port: number, forwardedFor: string): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      host: '127.0.0.1',
      port,
      path: '/limited',
      method: 'GET',
      headers: { 'x-forwarded-for': forwardedFor }
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
        body
      }));
    });
    request.on('error', reject);
    request.end();
  });
}

async function main(): Promise<void> {
  const app = express();
  configureExpressProxyTrust(app);

  assert.equal(TRUSTED_PROXY_HOPS, 1);
  assert.equal(app.get('trust proxy'), 1);

  app.get('/limited', rateLimit({
    windowMs: 60_000,
    limit: 1,
    standardHeaders: false,
    legacyHeaders: false
  }), (request, response) => {
    response.json({ ip: request.ip });
  });

  const server: Server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const port = address.port;

    // The leftmost entry simulates a client-supplied value. With one trusted
    // proxy hop, Express must use the rightmost forwarded address instead.
    const firstClient = await get(port, '192.0.2.99, 198.51.100.10');
    assert.equal(firstClient.statusCode, 200);
    assert.equal(JSON.parse(firstClient.body).ip, '198.51.100.10');

    // A different client gets its own rate-limit bucket.
    const secondClient = await get(port, '192.0.2.99, 198.51.100.11');
    assert.equal(secondClient.statusCode, 200);
    assert.equal(JSON.parse(secondClient.body).ip, '198.51.100.11');

    // Changing only the untrusted leftmost entry cannot bypass the first
    // client's rate limit; the trusted proxy's rightmost client IP is stable.
    const firstClientAgain = await get(port, '203.0.113.55, 198.51.100.10');
    assert.equal(firstClientAgain.statusCode, 429);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  console.log('Express trusted-proxy and per-client rate-limit tests passed.');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
