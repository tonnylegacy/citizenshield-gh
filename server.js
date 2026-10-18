/**
 * CitizenShield GH — Production Local & Edge Server
 * Serves static PWA assets + Free Microsoft Edge Neural TTS (/api/tts)
 * + Serverless Function routes (/api/analyze-encounter, /api/dispatch-sos, /api/cloud-vault)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg'
};

// Supported Natural Neural Voices
const ALLOWED_VOICES = {
  'ezinne': 'en-NG-EzinneNeural',
  'abeo': 'en-NG-AbeoNeural',
  'sonia': 'en-GB-SoniaNeural',
  'andrew': 'en-US-AndrewMultilingualNeural',
  'en-NG-EzinneNeural': 'en-NG-EzinneNeural',
  'en-NG-AbeoNeural': 'en-NG-AbeoNeural',
  'en-GB-SoniaNeural': 'en-GB-SoniaNeural',
  'en-US-AndrewMultilingualNeural': 'en-US-AndrewMultilingualNeural'
};

// In-memory LRU cache for instant (<5ms) replay of common legal scripts
const ttsCache = new Map();

/**
 * Formats legal citations so the neural voice speaks naturally like a human lawyer
 */
function humanizeLegalText(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/^["“]|["”]$/g, '')
    .replace(/\bArt\.\s*(\d+)/gi, 'Article $1')
    .replace(/\bSec\.\s*(\d+)/gi, 'Section $1')
    .replace(/\bReg\.\s*(\d+)/gi, 'Regulation $1')
    .replace(/\bL\.I\.\s*(\d+)/gi, 'Legislative Instrument $1')
    .replace(/\bC\.I\.\s*(\d+)/gi, 'Constitutional Instrument $1')
    .replace(/\bIGP\b/g, 'Inspector General of Police')
    .replace(/\bMTTD\b/g, 'M T T D')
    .replace(/\bPPSB\b/g, 'Police Professional Standards Bureau')
    .replace(/\bv\.\b/gi, 'versus')
    .trim();
}

async function synthesizeNeuralAudio(text, voiceKey = 'ezinne') {
  const voiceId = ALLOWED_VOICES[voiceKey] || 'en-NG-EzinneNeural';
  const cleanText = humanizeLegalText(text).slice(0, 900);
  const cacheKey = `${voiceId}::${cleanText}`;

  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey);
  }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const buffer = await new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(cleanText);
    const chunks = [];
    const timeout = setTimeout(() => {
      try { tts.close(); } catch (e) {}
      reject(new Error('Neural TTS timeout'));
    }, 9000);

    audioStream.on('data', (chunk) => chunks.push(chunk));
    audioStream.on('end', () => {
      clearTimeout(timeout);
      try { tts.close(); } catch (e) {}
      resolve(Buffer.concat(chunks));
    });
    audioStream.on('error', (err) => {
      clearTimeout(timeout);
      try { tts.close(); } catch (e) {}
      reject(err);
    });
  });

  if (buffer && buffer.length > 200) {
    if (ttsCache.size > 60) {
      const oldestKey = ttsCache.keys().next().value;
      ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, buffer);
  }
  return buffer;
}

// Local Cloudflare Edge Store (Persistence for Cross-Device Testing & Decoy Simulation)
const STORE_FILE = path.join(__dirname, '.cloud-edge-store.json');

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const data = JSON.parse(raw);
      return {
        accounts: data.accounts || [],
        sessions: data.sessions || [],
        dispatches: data.dispatches || [],
        watermarks: data.watermarks || [],
        duressAlerts: data.duressAlerts || []
      };
    }
  } catch (err) {
    console.warn('[CloudEdgeStore] Load notice, initializing fresh store:', err.message);
  }
  return { accounts: [], sessions: [], dispatches: [], watermarks: [], duressAlerts: [] };
}

function saveStore(store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[CloudEdgeStore] Failed to save store:', err.message);
  }
}

const EDGE_CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-device-id'
};

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. Local Edge Mirror Endpoints (/api/cloud/*)
  if (pathname && pathname.startsWith('/api/cloud/')) {
    // Handle CORS Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, EDGE_CORS_HEADERS);
      res.end();
      return;
    }

    const store = loadStore();

    // 1a. POST /api/cloud/auth
    if (pathname === '/api/cloud/auth' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const {
        action = 'login',
        provider = 'phone',
        identifier,
        displayName,
        realPinHash,
        duressPinHash,
        pinHash,
        salt = 'cs-gh-v1',
        encryptedContacts = null,
        sessions = [],
        webauthnId = null
      } = body;

      if (!identifier) {
        res.writeHead(400, EDGE_CORS_HEADERS);
        res.end(JSON.stringify({ ok: false, error: 'Missing account identifier' }));
        return;
      }

      let account = store.accounts.find(a => a.identifier === identifier);

      // Existing Account Checks
      if (account) {
        // Duress Decoy Check
        if (pinHash && account.duressPinHash && pinHash === account.duressPinHash) {
          store.duressAlerts.push({
            identifier,
            accountId: account.id,
            timestamp: new Date().toISOString(),
            mode: 'duress-decoy'
          });
          saveStore(store);

          res.writeHead(200, EDGE_CORS_HEADERS);
          res.end(JSON.stringify({
            ok: true,
            mode: 'duress-decoy',
            account: {
              identifier: account.identifier,
              displayName: account.displayName,
              provider: account.provider
            },
            encryptedContacts: null,
            sessions: []
          }));
          return;
        }

        // Standard Login / OAuth
        if (action === 'login' || (action === 'oauth' && !realPinHash)) {
          if (pinHash && account.realPinHash && pinHash !== account.realPinHash) {
            res.writeHead(401, EDGE_CORS_HEADERS);
            res.end(JSON.stringify({ ok: false, error: 'Invalid PIN entered' }));
            return;
          }

          const userSessions = store.sessions.filter(s => s.identifier === identifier || s.accountId === account.id);
          res.writeHead(200, EDGE_CORS_HEADERS);
          res.end(JSON.stringify({
            ok: true,
            mode: 'authenticated',
            account: {
              id: account.id,
              identifier: account.identifier,
              displayName: account.displayName,
              provider: account.provider,
              salt: account.salt,
              realPinHash: account.realPinHash,
              duressPinHash: account.duressPinHash,
              webauthnId: account.webauthnId
            },
            encryptedContacts: account.encryptedContacts,
            sessions: userSessions
          }));
          return;
        }

        // Profile Update / Re-registration
        account.displayName = displayName || account.displayName;
        if (realPinHash) account.realPinHash = realPinHash;
        if (duressPinHash) account.duressPinHash = duressPinHash;
        if (salt) account.salt = salt;
        if (encryptedContacts) account.encryptedContacts = encryptedContacts;
        if (webauthnId) account.webauthnId = webauthnId;
        account.updatedAt = new Date().toISOString();
      } else {
        // Create New Account
        account = {
          id: `ACC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          provider,
          identifier,
          displayName: displayName || identifier,
          realPinHash: realPinHash || 'UNSET',
          duressPinHash: duressPinHash || null,
          salt,
          encryptedContacts: encryptedContacts || null,
          webauthnId: webauthnId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store.accounts.push(account);
      }

      // Upsert Initial Sessions
      if (Array.isArray(sessions) && sessions.length > 0) {
        for (const s of sessions) {
          if (!s || !s.id) continue;
          const idx = store.sessions.findIndex(existing => existing.id === s.id);
          const sObj = { ...s, identifier, accountId: account.id, notarizedAt: new Date().toISOString() };
          if (idx >= 0) store.sessions[idx] = sObj;
          else store.sessions.push(sObj);
        }
      }

      saveStore(store);

      const userSessions = store.sessions.filter(s => s.identifier === identifier || s.accountId === account.id);
      res.writeHead(200, EDGE_CORS_HEADERS);
      res.end(JSON.stringify({
        ok: true,
        mode: 'authenticated',
        account: {
          id: account.id,
          identifier: account.identifier,
          displayName: account.displayName,
          provider: account.provider,
          salt: account.salt,
          realPinHash: account.realPinHash,
          duressPinHash: account.duressPinHash,
          webauthnId: account.webauthnId
        },
        encryptedContacts: account.encryptedContacts,
        sessions: userSessions
      }));
      return;
    }

    // 1b. POST /api/cloud/sync
    if (pathname === '/api/cloud/sync' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const {
        identifier,
        deviceId = 'DEV-LOCAL',
        session,
        sessions = [],
        encryptedContacts,
        dispatches = [],
        watermarks = []
      } = body;

      if (identifier) {
        const account = store.accounts.find(a => a.identifier === identifier);
        if (account && encryptedContacts) {
          account.encryptedContacts = encryptedContacts;
          account.updatedAt = new Date().toISOString();
        }
      }

      const sessionList = session ? [session] : (Array.isArray(sessions) ? sessions : []);
      for (const s of sessionList) {
        if (!s || !s.id) continue;
        const idx = store.sessions.findIndex(existing => existing.id === s.id);
        const sObj = {
          ...s,
          identifier: identifier || s.identifier,
          deviceId: deviceId || s.deviceId,
          notarizedAt: new Date().toISOString()
        };
        if (idx >= 0) store.sessions[idx] = sObj;
        else store.sessions.push(sObj);
      }

      const dispatchList = Array.isArray(dispatches) ? dispatches : (body.dispatch ? [body.dispatch] : []);
      for (const d of dispatchList) {
        store.dispatches.push({
          ...d,
          identifier: identifier || null,
          deviceId: deviceId || 'DEV-LOCAL',
          dispatchedAt: new Date().toISOString()
        });
      }

      const watermarkList = Array.isArray(watermarks) ? watermarks : [];
      for (const w of watermarkList) {
        store.watermarks.push({
          ...w,
          identifier: identifier || null,
          loggedAt: new Date().toISOString()
        });
      }

      saveStore(store);

      res.writeHead(200, EDGE_CORS_HEADERS);
      res.end(JSON.stringify({
        ok: true,
        notarizedAt: new Date().toISOString(),
        totalCloudSessions: store.sessions.length
      }));
      return;
    }

    // 1c. GET /api/cloud/sync?identifier=...
    if (pathname === '/api/cloud/sync' && req.method === 'GET') {
      const identifier = parsedUrl.query.identifier;
      const deviceId = parsedUrl.query.deviceId;

      const account = identifier ? store.accounts.find(a => a.identifier === identifier) : null;
      const userSessions = store.sessions.filter(s => {
        if (identifier && s.identifier === identifier) return true;
        if (account && s.accountId === account.id) return true;
        if (deviceId && s.deviceId === deviceId) return true;
        return false;
      });

      res.writeHead(200, EDGE_CORS_HEADERS);
      res.end(JSON.stringify({
        ok: true,
        account: account ? {
          id: account.id,
          identifier: account.identifier,
          displayName: account.displayName,
          provider: account.provider,
          salt: account.salt,
          realPinHash: account.realPinHash,
          duressPinHash: account.duressPinHash,
          webauthnId: account.webauthnId,
          encryptedContacts: account.encryptedContacts
        } : null,
        sessions: userSessions
      }));
      return;
    }

    // 1d. POST /api/cloud/duress
    if (pathname === '/api/cloud/duress' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { identifier, deviceId, gps, timestamp } = body;

      store.duressAlerts.push({
        identifier: identifier || 'ANONYMOUS',
        deviceId: deviceId || 'DEV-LOCAL',
        gps: gps || null,
        timestamp: timestamp || new Date().toISOString()
      });
      saveStore(store);

      res.writeHead(200, EDGE_CORS_HEADERS);
      res.end(JSON.stringify({
        ok: true,
        decoyActive: true
      }));
      return;
    }

    res.writeHead(404, EDGE_CORS_HEADERS);
    res.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
    return;
  }

  // 2. Free Natural Neural TTS Endpoint (/api/tts)
  if (pathname === '/api/tts' || pathname === '/.netlify/functions/neural-tts') {
    const text = parsedUrl.query.text || '';
    const voice = parsedUrl.query.voice || 'ezinne';

    if (!text.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing text parameter' }));
      return;
    }

    try {
      const mp3Buffer = await synthesizeNeuralAudio(text, voice);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': mp3Buffer.length,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(mp3Buffer);
    } catch (err) {
      console.error('[Neural TTS Error]:', err.message);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Neural stream unavailable, use local fallback' }));
    }
    return;
  }

  // 3. Static File Serving
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[CitizenShield GH] Server + Neural TTS + Cloudflare Edge Mirror Live on http://localhost:${PORT}`);
});
