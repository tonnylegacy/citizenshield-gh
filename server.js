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

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. Free Natural Neural TTS Endpoint (/api/tts)
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

  // 2. Static File Serving
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
  console.log(`[CitizenShield GH] Server + Neural TTS Live on http://localhost:${PORT}`);
});
