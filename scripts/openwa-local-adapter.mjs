import http from 'node:http';
import { onRequest } from '../functions/[[path]].js';
import { readFileSync, existsSync } from 'node:fs';

const env = {};
if (existsSync('.dev.vars')) {
  for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const body = Buffer.concat(chunks);
      const request = new Request(`http://127.0.0.1:8788${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      });

      const response = await onRequest({
        request,
        env,
        next: async () => new Response('Not Found', { status: 404 }),
      });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      const out = Buffer.from(await response.arrayBuffer());
      res.end(out);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
});

server.listen(8788, '127.0.0.1', () => {
  console.log('Local function adapter running on http://127.0.0.1:8788');
});
