/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { handleShoppingOperation } from '../src/server/shoppingStore';

/**
 * Liest optional eine lokale .env-Datei ein.
 *
 * Beim Hoster (z. B. Render) gibt es keine .env - dort kommen die Werte aus den
 * Umgebungsvariablen. Lokal kann so eine .env mit MONGODB_URI angelegt werden,
 * ohne dass die Zugangsdaten im Projekt oder in Git landen.
 */
function loadLocalEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Bereits gesetzte Umgebungsvariablen haben Vorrang.
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY_BYTES = 1_000_000;

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  });
  response.end(body);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('BODY_TOO_LARGE'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    });
    response.end();
    return;
  }

  if (url.pathname === '/health') {
    sendJson(response, 200, { ok: true, status: 'healthy' });
    return;
  }

  if (url.pathname !== '/api/shopping') {
    sendJson(response, 404, {
      ok: false,
      error: 'NOT_FOUND',
      message: 'Unbekannter Endpunkt.',
    });
    return;
  }

  if (request.method === 'GET') {
    sendJson(response, 200, { ok: true, service: 'shopping-sync' });
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, {
      ok: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Nur GET und POST sind erlaubt.',
    });
    return;
  }

  let body: unknown;
  try {
    const raw = await readBody(request);
    body = raw ? JSON.parse(raw) : null;
  } catch (error) {
    const tooLarge =
      error instanceof Error && error.message === 'BODY_TOO_LARGE';
    sendJson(response, tooLarge ? 413 : 400, {
      ok: false,
      error: tooLarge ? 'BODY_TOO_LARGE' : 'BAD_REQUEST',
      message: tooLarge
        ? 'Die Anfrage ist zu groß.'
        : 'Die Anfrage konnte nicht gelesen werden.',
    });
    return;
  }

  try {
    const result = await handleShoppingOperation(body);
    sendJson(response, result.ok ? 200 : result.status, result);
  } catch (error) {
    console.error('[sync-server] Unerwarteter Fehler:', error);
    sendJson(response, 500, {
      ok: false,
      error: 'SERVER_ERROR',
      message: 'Der Server konnte die Anfrage nicht verarbeiten.',
    });
  }
});

server.listen(PORT, () => {
  console.log(`Shopping-Sync-Server läuft auf Port ${PORT}.`);
  console.log(
    process.env.MONGODB_URI
      ? 'Datenbank: MongoDB (MONGODB_URI gesetzt).'
      : 'Datenbank: MongoDB unter mongodb://127.0.0.1:27017 (MONGODB_URI nicht gesetzt).',
  );
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
