/**
 * Netlify Serverless Function: neural-tts.js
 * Streams 100% Free Microsoft Edge Neural TTS (West African & British Counsel Voices)
 */

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const ALLOWED_VOICES = {
  'ezinne': 'en-NG-EzinneNeural',
  'abeo': 'en-NG-AbeoNeural',
  'sonia': 'en-GB-SoniaNeural',
  'andrew': 'en-US-AndrewMultilingualNeural'
};

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

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const text = params.text || '';
  const voiceKey = params.voice || 'ezinne';

  if (!text.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing text parameter' })
    };
  }

  try {
    const voiceId = ALLOWED_VOICES[voiceKey] || 'en-NG-EzinneNeural';
    const cleanText = humanizeLegalText(text).slice(0, 900);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const buffer = await new Promise((resolve, reject) => {
      const { audioStream } = tts.toStream(cleanText);
      const chunks = [];
      audioStream.on('data', (c) => chunks.push(c));
      audioStream.on('end', () => {
        try { tts.close(); } catch (e) {}
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err) => {
        try { tts.close(); } catch (e) {}
        reject(err);
      });
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: err.message })
    };
  }
};
