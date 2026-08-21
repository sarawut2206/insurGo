/* server.js — local dev server
 *
 * Node built-ins only, no dependencies.
 *   npm run dev          -> http://localhost:5173
 *   node server.js 8080  -> custom port
 *
 * Binds 0.0.0.0 so a phone on the same Wi-Fi can open it.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const project = dirname(fileURLToPath(import.meta.url));

// Supports both layouts: repo root (GitHub Pages) and app/ during development
const ROOT = existsSync(join(project, 'index.html')) ? project : join(project, 'app');
const PORT = Number(process.argv[2]) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon'
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  if (!resolve(file).startsWith(resolve(ROOT))) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + urlPath);
  }
}).listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces()).flat()
    .filter(n => n && n.family === 'IPv4' && !n.internal)
    .map(n => n.address);

  console.log('insurGo dev server');
  console.log('  serving : ' + ROOT);
  console.log('  local   : http://localhost:' + PORT);
  lan.forEach(ip => console.log('  phone   : http://' + ip + ':' + PORT + '  (same Wi-Fi)'));
  console.log('\nCtrl+C to stop');
});
