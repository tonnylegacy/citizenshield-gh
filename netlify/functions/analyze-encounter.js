/**
 * Pocket Barrister Ghana - Serverless AI Encounter Analyzer
 * Endpoint: /.netlify/functions/analyze-encounter
 *
 * Grounded in the 1992 Constitution of Ghana, Criminal Procedure Act (Act 30),
 * Road Traffic Act (Act 683), Cybersecurity Act (Act 1038), and C.I. 76.
 *
 * Seamlessly integrates Google Gemini Flash when GEMINI_API_KEY is present,
 * with zero-downtime deterministic Ghanaian statutory fallback.
 */

const https = require('https');

// Fallback law data in case bundler isolates functions from root /js/data/
let lawsRepository = [];
try {
  const ghanaLaws = require('../../js/data/ghana-laws.js');
  lawsRepository = ghanaLaws.GHANA_LAWS_DATA || [];
} catch (e) {
  lawsRepository = [];
}

// Critical threat keywords indicative of physical danger, extortion, or rights violations
const CRITICAL_KEYWORDS = ['slap', 'beat', 'hit', 'kill', 'gun', 'cock', 'force', 'shoot', 'assault', 'drag', 'boot'];
const HIGH_KEYWORDS = ['unlock', 'phone', 'laptop', 'crypto', 'cash', 'momo', 'bribe', 'arrest', 'handcuff', 'cell', '48 hours', 'weekend'];
const ELEVATED_KEYWORDS = ['license', 'licence', 'impound', 'tow', 'station', 'dreadlocks', 'rasta', 'inspect', 'triangle', 'extinguisher'];

/**
 * Deterministic Legal Analysis Fallback Engine
 */
function analyzeDeterministically(transcript = '', location = '', badges = '') {
  const lower = (transcript + ' ' + badges).toLowerCase();

  let matchedLaw = null;
  let maxScore = 0;

  if (lawsRepository.length > 0) {
    for (const law of lawsRepository) {
      let hits = 0;
      for (const kw of law.keywords) {
        if (lower.includes(kw)) {
          hits += kw.length > 5 ? 2 : 1;
        }
      }
      if (hits > 0 && (hits * 10 + law.threatScore) > maxScore) {
        maxScore = hits * 10 + law.threatScore;
        matchedLaw = law;
      }
    }
  }

  // Assess threat severity
  let threatScore = 20;
  let threatState = 'LOW';
  let shouldTriggerSOS = false;

  const hasCritical = CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
  const hasHigh = HIGH_KEYWORDS.some((kw) => lower.includes(kw));
  const hasElevated = ELEVATED_KEYWORDS.some((kw) => lower.includes(kw));

  if (hasCritical) {
    threatScore = 95;
    threatState = 'CRITICAL';
    shouldTriggerSOS = true;
  } else if (hasHigh) {
    threatScore = 78;
    threatState = 'HIGH';
  } else if (hasElevated) {
    threatScore = 55;
    threatState = 'ELEVATED';
  } else if (matchedLaw) {
    threatScore = matchedLaw.threatScore;
    threatState = matchedLaw.threatLevel;
  }

  if (matchedLaw) {
    return {
      engine: 'deterministic-ghana-statutory',
      threatScore,
      threatState,
      matchedLawId: matchedLaw.id,
      title: matchedLaw.title,
      legalCitation: `${matchedLaw.statute} | Precedent: ${matchedLaw.caseLaw}`,
      sayThis: matchedLaw.sayThis,
      earbudWhisper: matchedLaw.earbudWhisper,
      citizenRights: matchedLaw.citizenRights,
      officerLimits: matchedLaw.officerLimits,
      shouldTriggerSOS: threatScore >= 90
    };
  }

  // General default Ghanaian encounter advice if no specific statute matched
  return {
    engine: 'deterministic-ghana-general',
    threatScore,
    threatState,
    matchedLawId: 'general-stop',
    title: 'General Lawful Citizen Encounter',
    legalCitation: '1992 Constitution Art. 14(2) & Criminal Procedure Act, 1960 (Act 30) Sec. 10',
    sayThis: 'Good day Officer. I am cooperating respectfully. Could you kindly clarify the specific reason for this stop and allow me to present my valid identification?',
    earbudWhisper: 'Remain calm and polite. Under Article 14(2), the officer must state the specific reason for stopping you.',
    citizenRights: [
      'Right to be informed immediately of the reason for the stop in a language understood.',
      'Right to inspect the officer\'s name tag or warrant card.'
    ],
    officerLimits: [
      'Cannot use physical restraint without reasonable cause.',
      'Cannot solicit cash roadside gifts or spot fines.'
    ],
    shouldTriggerSOS: threatScore >= 90
  };
}

/**
 * Call Gemini Flash API via HTTPS REST if API key is present
 */
async function callGemini(apiKey, transcript, location, badges) {
  const prompt = `You are a Ghanaian Senior Advocate and Human Rights Defense Barrister specializing in Ghanaian law (1992 Constitution, Criminal Procedure Act Act 30, Road Traffic Act Act 683, Cybersecurity Act Act 1038, C.I. 76).
Analyze this police encounter transcript:
TRANSCRIPT: "${transcript}"
LOCATION: "${location || 'Accra, Ghana'}"
OFFICER/BADGES: "${badges || 'Not observed'}"

Respond ONLY with a valid raw JSON object (no markdown, no backticks, no wrap):
{
  "threatScore": <integer 15-100>,
  "threatState": <"LOW" | "ELEVATED" | "HIGH" | "CRITICAL">,
  "legalCitation": "<exact Ghanaian statutes and landmark cases e.g. 1992 Constitution Art. 18(2), Act 1038, Edmund Addo v AG>",
  "sayThis": "<exact courteous, respectful Ghanaian script for the citizen to read aloud to the officer>",
  "earbudWhisper": "<short 1-2 sentence spoken instruction for the citizen's earbud>",
  "shouldTriggerSOS": <boolean, true if physical violence, unconstitutional detention, weapon drawn, or kidnapping risk>,
  "title": "<short descriptive title of the legal issue>"
}`;

  const payload = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800
    }
  });

  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 8000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              return reject(new Error(`Gemini HTTP ${res.statusCode}: ${data}`));
            }
            const parsed = JSON.parse(data);
            const textContent = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textContent) return reject(new Error('Empty Gemini response'));
            // Strip any backticks if returned
            const cleanJson = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);
            result.engine = 'gemini-1.5-flash';
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API timeout (8s)'));
    });

    req.write(payload);
    req.end();
  });
}

exports.handler = async function (event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    body = {};
  }

  const transcript = body.transcript || '';
  const location = body.location || '';
  const badges = body.badges || '';

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const geminiResult = await callGemini(apiKey, transcript, location, badges);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(geminiResult)
      };
    } catch (err) {
      console.warn('[analyze-encounter] Gemini failed, falling back to deterministic analysis:', err.message);
    }
  }

  // Deterministic Ghanaian legal analysis fallback
  const fallbackResult = analyzeDeterministically(transcript, location, badges);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(fallbackResult)
  };
};
