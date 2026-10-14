#!/usr/bin/env node
/*
 * Local dev server standing in for Vercel's static + Functions hosting,
 * since no Vercel CLI/account is available in this environment. It serves
 * the repo as static files and routes /api/<name> to api/<name>.js,
 * invoking the SAME handler modules Vercel would run — this is for
 * exercising the real code in tests, not a reimplementation of it.
 *
 * Usage: node scripts/dev-server.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { URL } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8930);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function augmentResponse(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    const body = JSON.stringify(obj);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(body);
    return res;
  };
  return res;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handleApi(req, res, url, apiName) {
  const modulePath = join(ROOT, 'api', `${apiName}.js`);
  let mod;
  try {
    mod = require(modulePath);
  } catch (err) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  req.query = Object.fromEntries(url.searchParams.entries());

  const skipBodyParsing = mod.config && mod.config.api && mod.config.api.bodyParser === false;
  if (!skipBodyParsing && (req.method === 'POST' || req.method === 'PUT')) {
    const raw = await readRawBody(req);
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        req.body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
      } catch {
        req.body = {};
      }
    } else {
      req.body = raw.toString('utf8');
    }
  }

  augmentResponse(res);
  try {
    await mod(req, res);
  } catch (err) {
    console.error(`[dev-server] /api/${apiName} threw:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
  }
}

async function serveStatic(req, res, pathname) {
  let filePath = normalize(join(ROOT, decodeURIComponent(pathname)));
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (pathname === '/') filePath = join(ROOT, 'index.html');

  try {
    let st = await stat(filePath);
    if (st.isDirectory()) {
      filePath = join(filePath, 'index.html');
      st = await stat(filePath);
    }
    const data = await readFile(filePath);
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.statusCode = 200;
    res.end(data);
  } catch {
    try {
      const notFound = await readFile(join(ROOT, '404.html'));
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(notFound);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    const apiName = url.pathname.slice('/api/'.length).replace(/\/$/, '');
    await handleApi(req, res, url, apiName);
    return;
  }
  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`dev-server listening on http://localhost:${PORT}`);
});
