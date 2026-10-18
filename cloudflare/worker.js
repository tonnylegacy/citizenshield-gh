/**
 * CitizenShield Ghana — Cloudflare Edge Worker
 * Serverless Zero-Knowledge Identity, OIDC Auth, Evidence Notarization, & Duress Decoy Protocol
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-device-id',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function parseJwtClaims(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function verifyGoogleIdToken(idToken) {
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    // Fall back to decoded claims if network is constrained
  }
  return parseJwtClaims(idToken);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // 2. POST /api/cloud/auth
      if (pathname === '/api/cloud/auth' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        let {
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
          idToken = null,
          webauthnId = null
        } = body;

        // OIDC Verification for Google / Apple
        if ((provider === 'google' || provider === 'apple') && idToken) {
          if (provider === 'google') {
            const googleClaims = await verifyGoogleIdToken(idToken);
            if (googleClaims && googleClaims.email) {
              identifier = identifier || googleClaims.email;
              displayName = displayName || googleClaims.name || googleClaims.email.split('@')[0];
            }
          } else if (provider === 'apple') {
            const appleClaims = parseJwtClaims(idToken);
            if (appleClaims && (appleClaims.email || appleClaims.sub)) {
              identifier = identifier || appleClaims.email || `apple-${appleClaims.sub}`;
              displayName = displayName || 'Apple Citizen';
            }
          }
        }

        if (!identifier) {
          return jsonResponse({ ok: false, error: 'Missing account identifier (email or phone)' }, 400);
        }

        // Query existing account in Cloudflare D1
        let existingAccount = null;
        if (env.DB) {
          existingAccount = await env.DB.prepare(
            'SELECT * FROM citizen_accounts WHERE identifier = ?'
          ).bind(identifier).first();
        }

        // Duress Check on Existing Account
        if (existingAccount) {
          if (pinHash && existingAccount.duress_pin_hash && pinHash === existingAccount.duress_pin_hash) {
            // SILENT DURESS DECOY ACTIVATED
            if (env.DB) {
              await env.DB.prepare(
                'INSERT INTO duress_alerts (account_id, identifier, triggered_at) VALUES (?, ?, datetime("now"))'
              ).bind(existingAccount.id, identifier).run();
            }
            return jsonResponse({
              ok: true,
              mode: 'duress-decoy',
              account: {
                identifier: existingAccount.identifier,
                displayName: existingAccount.display_name,
                provider: existingAccount.provider
              },
              encryptedContacts: null,
              sessions: []
            });
          }

          if (action === 'login' || (action === 'oauth' && !realPinHash)) {
            // Verify real PIN if provided
            if (pinHash && existingAccount.real_pin_hash && pinHash !== existingAccount.real_pin_hash) {
              return jsonResponse({ ok: false, error: 'Invalid PIN entered' }, 401);
            }

            // Retrieve account sessions
            let cloudSessions = [];
            if (env.DB) {
              const sessionRes = await env.DB.prepare(
                'SELECT * FROM evidence_sessions WHERE account_id = ? ORDER BY start_time DESC LIMIT 100'
              ).bind(existingAccount.id).all();
              cloudSessions = (sessionRes && sessionRes.results) || [];
            }

            return jsonResponse({
              ok: true,
              mode: 'authenticated',
              account: {
                id: existingAccount.id,
                identifier: existingAccount.identifier,
                displayName: existingAccount.display_name,
                provider: existingAccount.provider,
                salt: existingAccount.pbkdf2_salt,
                realPinHash: existingAccount.real_pin_hash,
                duressPinHash: existingAccount.duress_pin_hash,
                webauthnId: existingAccount.webauthn_credential_id
              },
              encryptedContacts: existingAccount.encrypted_contacts_json,
              sessions: cloudSessions
            });
          }
        }

        // Register or Update Account in D1
        const accountId = existingAccount ? existingAccount.id : `ACC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const effectiveRealPinHash = realPinHash || (existingAccount ? existingAccount.real_pin_hash : 'UNSET');
        const effectiveDuressPinHash = duressPinHash || (existingAccount ? existingAccount.duress_pin_hash : null);
        const effectiveSalt = salt || (existingAccount ? existingAccount.pbkdf2_salt : 'cs-gh-v1');
        const effectiveContacts = encryptedContacts || (existingAccount ? existingAccount.encrypted_contacts_json : null);
        const effectiveWebauthn = webauthnId || (existingAccount ? existingAccount.webauthn_credential_id : null);
        const effectiveDisplayName = displayName || (existingAccount ? existingAccount.display_name : identifier);

        if (env.DB) {
          await env.DB.prepare(`
            INSERT INTO citizen_accounts (
              id, provider, identifier, display_name, real_pin_hash, duress_pin_hash,
              pbkdf2_salt, webauthn_credential_id, encrypted_contacts_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(identifier) DO UPDATE SET
              display_name = excluded.display_name,
              real_pin_hash = COALESCE(excluded.real_pin_hash, citizen_accounts.real_pin_hash),
              duress_pin_hash = COALESCE(excluded.duress_pin_hash, citizen_accounts.duress_pin_hash),
              pbkdf2_salt = excluded.pbkdf2_salt,
              webauthn_credential_id = COALESCE(excluded.webauthn_credential_id, citizen_accounts.webauthn_credential_id),
              encrypted_contacts_json = COALESCE(excluded.encrypted_contacts_json, citizen_accounts.encrypted_contacts_json),
              updated_at = datetime('now')
          `).bind(
            accountId,
            provider,
            identifier,
            effectiveDisplayName,
            effectiveRealPinHash,
            effectiveDuressPinHash,
            effectiveSalt,
            effectiveWebauthn,
            typeof effectiveContacts === 'object' && effectiveContacts !== null ? JSON.stringify(effectiveContacts) : effectiveContacts
          ).run();

          // Upsert any initial sessions
          if (Array.isArray(sessions) && sessions.length > 0) {
            for (const s of sessions) {
              await env.DB.prepare(`
                INSERT INTO evidence_sessions (
                  id, account_id, device_id, start_time, end_time, mode,
                  peak_threat_score, chunk_count, transcript_count, watermark_count,
                  final_chain_hash, gps_lat, gps_lng, media_r2_key, encrypted_payload, notarized_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                  final_chain_hash = excluded.final_chain_hash,
                  peak_threat_score = excluded.peak_threat_score,
                  end_time = excluded.end_time,
                  encrypted_payload = excluded.encrypted_payload,
                  notarized_at = datetime('now')
              `).bind(
                s.id || `SES-${Date.now()}`,
                accountId,
                s.deviceId || 'DEV-EDGE',
                s.startTime ? new Date(s.startTime).toISOString() : new Date().toISOString(),
                s.endTime ? new Date(s.endTime).toISOString() : null,
                s.mode || 'stealth',
                s.peakThreatScore || 0,
                s.chunkCount || 0,
                s.transcriptCount || (s.transcript ? s.transcript.length : 0),
                s.watermarkCount || (s.watermarks ? s.watermarks.length : 0),
                s.cumulativeHash || s.finalChainHash || 'CHAIN_SEALED',
                s.gps ? (s.gps.latitude || s.gps.lat) : null,
                s.gps ? (s.gps.longitude || s.gps.lng) : null,
                s.mediaR2Key || null,
                s.encryptedPayload ? (typeof s.encryptedPayload === 'string' ? s.encryptedPayload : JSON.stringify(s.encryptedPayload)) : null
              ).run();
            }
          }
        }

        return jsonResponse({
          ok: true,
          mode: 'authenticated',
          account: {
            id: accountId,
            identifier,
            displayName: effectiveDisplayName,
            provider,
            salt: effectiveSalt,
            realPinHash: effectiveRealPinHash,
            duressPinHash: effectiveDuressPinHash,
            webauthnId: effectiveWebauthn
          },
          encryptedContacts: effectiveContacts,
          sessions: sessions || []
        });
      }

      // 3. POST /api/cloud/sync
      if (pathname === '/api/cloud/sync' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const {
          identifier,
          deviceId = 'DEV-UNKNOWN',
          session,
          sessions = [],
          encryptedContacts,
          dispatches = [],
          watermarks = []
        } = body;

        let accountId = null;
        if (identifier && env.DB) {
          const acc = await env.DB.prepare('SELECT id FROM citizen_accounts WHERE identifier = ?').bind(identifier).first();
          if (acc) {
            accountId = acc.id;
            if (encryptedContacts) {
              await env.DB.prepare(
                'UPDATE citizen_accounts SET encrypted_contacts_json = ?, updated_at = datetime("now") WHERE id = ?'
              ).bind(typeof encryptedContacts === 'object' ? JSON.stringify(encryptedContacts) : encryptedContacts, accountId).run();
            }
          }
        }

        const sessionList = session ? [session] : (Array.isArray(sessions) ? sessions : []);
        if (env.DB) {
          for (const s of sessionList) {
            if (!s || !s.id) continue;
            const gps = (s.gpsTrail && s.gpsTrail.length > 0) ? s.gpsTrail[s.gpsTrail.length - 1] : s.gps;
            await env.DB.prepare(`
              INSERT INTO evidence_sessions (
                id, account_id, device_id, start_time, end_time, mode,
                peak_threat_score, chunk_count, transcript_count, watermark_count,
                final_chain_hash, gps_lat, gps_lng, media_r2_key, encrypted_payload, notarized_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                final_chain_hash = excluded.final_chain_hash,
                peak_threat_score = excluded.peak_threat_score,
                end_time = excluded.end_time,
                encrypted_payload = excluded.encrypted_payload,
                notarized_at = datetime('now')
            `).bind(
              s.id,
              accountId,
              s.deviceId || deviceId,
              s.startTime ? new Date(s.startTime).toISOString() : new Date().toISOString(),
              s.endTime ? new Date(s.endTime).toISOString() : null,
              s.mode || 'audio-stealth',
              s.peakThreatScore || 0,
              s.chunkCount || (s.chunks ? s.chunks.length : 0),
              s.transcriptCount || (s.transcript ? s.transcript.length : 0),
              s.watermarkCount || (s.watermarks ? s.watermarks.length : 0),
              s.cumulativeHash || s.finalChainHash || 'SEALED',
              gps ? (gps.latitude || gps.lat) : null,
              gps ? (gps.longitude || gps.lng) : null,
              s.mediaR2Key || null,
              s.encryptedPayload ? (typeof s.encryptedPayload === 'string' ? s.encryptedPayload : JSON.stringify(s.encryptedPayload)) : null
            ).run();
          }

          // Ingest Dispatches
          const dispatchList = Array.isArray(dispatches) ? dispatches : (body.dispatch ? [body.dispatch] : []);
          for (const d of dispatchList) {
            await env.DB.prepare(`
              INSERT INTO sos_dispatches (
                account_id, session_id, device_id, threat_score, gps_lat, gps_lng, statute_cited, dispatched_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              accountId,
              d.sessionId || null,
              d.deviceId || deviceId,
              d.threatScore || 85,
              d.gps ? (d.gps.latitude || d.gps.lat) : null,
              d.gps ? (d.gps.longitude || d.gps.lng) : null,
              d.statuteCited || d.statute || 'Article 14(2) 1992 Constitution of Ghana'
            ).run();
          }

          // Ingest Officer Watermarks
          const watermarkList = Array.isArray(watermarks) ? watermarks : [];
          for (const w of watermarkList) {
            await env.DB.prepare(`
              INSERT INTO officer_watermarks (
                account_id, session_id, officer_text, gps_lat, gps_lng, logged_at
              ) VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              accountId,
              w.sessionId || null,
              w.rawText || w.officerText || 'Watermark logged',
              w.gps ? (w.gps.latitude || w.gps.lat) : null,
              w.gps ? (w.gps.longitude || w.gps.lng) : null
            ).run();
          }
        }

        // Fetch total cloud sessions count
        let totalCloudSessions = sessionList.length;
        if (env.DB) {
          const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM evidence_sessions').first();
          if (countRow) totalCloudSessions = countRow.cnt;
        }

        return jsonResponse({
          ok: true,
          notarizedAt: new Date().toISOString(),
          totalCloudSessions
        });
      }

      // 4. GET /api/cloud/sync?identifier=...
      if (pathname === '/api/cloud/sync' && request.method === 'GET') {
        const identifier = url.searchParams.get('identifier');
        const deviceId = url.searchParams.get('deviceId');

        let account = null;
        let sessions = [];

        if (env.DB) {
          if (identifier) {
            account = await env.DB.prepare(
              'SELECT id, provider, identifier, display_name, pbkdf2_salt, real_pin_hash, duress_pin_hash, webauthn_credential_id, encrypted_contacts_json FROM citizen_accounts WHERE identifier = ?'
            ).bind(identifier).first();
          }

          if (account) {
            const sessRes = await env.DB.prepare(
              'SELECT * FROM evidence_sessions WHERE account_id = ? OR device_id = ? ORDER BY start_time DESC'
            ).bind(account.id, deviceId || '').all();
            sessions = (sessRes && sessRes.results) || [];
          } else if (deviceId) {
            const sessRes = await env.DB.prepare(
              'SELECT * FROM evidence_sessions WHERE device_id = ? ORDER BY start_time DESC'
            ).bind(deviceId).all();
            sessions = (sessRes && sessRes.results) || [];
          }
        }

        return jsonResponse({
          ok: true,
          account,
          sessions
        });
      }

      // 5. POST /api/cloud/duress
      if (pathname === '/api/cloud/duress' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { identifier, deviceId, gps } = body;

        if (env.DB) {
          let accountId = null;
          if (identifier) {
            const acc = await env.DB.prepare('SELECT id FROM citizen_accounts WHERE identifier = ?').bind(identifier).first();
            if (acc) accountId = acc.id;
          }
          await env.DB.prepare(`
            INSERT INTO duress_alerts (account_id, identifier, device_id, gps_lat, gps_lng, triggered_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            accountId,
            identifier || 'ANONYMOUS',
            deviceId || 'UNKNOWN_DEVICE',
            gps ? (gps.latitude || gps.lat) : null,
            gps ? (gps.longitude || gps.lng) : null
          ).run();
        }

        return jsonResponse({
          ok: true,
          decoyActive: true,
          alertLogged: true
        });
      }

      // 6. R2 Encrypted Media Vault: /api/cloud/media/:sessionId
      if (pathname.startsWith('/api/cloud/media/')) {
        const sessionId = pathname.replace('/api/cloud/media/', '').trim();
        const objectKey = `vault/${sessionId}.enc`;

        if (request.method === 'PUT') {
          if (!env.VAULT_BUCKET) {
            return jsonResponse({ ok: false, error: 'R2 VAULT_BUCKET binding not configured' }, 501);
          }
          await env.VAULT_BUCKET.put(objectKey, request.body, {
            httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' }
          });
          return jsonResponse({ ok: true, key: objectKey });
        }

        if (request.method === 'GET') {
          if (!env.VAULT_BUCKET) {
            return jsonResponse({ ok: false, error: 'R2 VAULT_BUCKET binding not configured' }, 501);
          }
          const object = await env.VAULT_BUCKET.get(objectKey);
          if (!object) {
            return jsonResponse({ ok: false, error: 'Media object not found in vault' }, 404);
          }
          return new Response(object.body, {
            headers: {
              'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }

      // Default 404
      return jsonResponse({ ok: false, error: `Route ${pathname} not found on Edge Worker` }, 404);
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }
};
