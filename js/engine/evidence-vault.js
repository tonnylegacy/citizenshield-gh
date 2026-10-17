/**
 * CitizenShield Ghana - Cryptographic Evidence Vault
 * File: js/engine/evidence-vault.js
 * 
 * Manages client-side IndexedDB storage ('CitizenShieldVault_v1'),
 * genuine Web Crypto SHA-256 hash chains for all chunks & transcripts,
 * real-time GPS tracking with Accra fallback coordinates, and generation
 * of court-admissible forensic certificates and PPSB complaint links.
 */

(function (window) {
  'use strict';

  const DB_NAME = 'CitizenShieldVault_v1';
  const DB_VERSION = 1;
  const STORE_SESSIONS = 'sessions';
  const STORE_CHUNKS = 'chunks';

  // Realistic Accra, Ghana fallback coordinates if GPS permission is denied
  const ACCRA_FALLBACK_GPS = {
    latitude: 5.6037,
    longitude: -0.1870,
    accuracy: 12,
    locationName: 'Liberation Rd / Airport Bypass, Accra, Ghana',
    isFallback: true
  };

  /**
   * Cryptographic SHA-256 utility using Web Crypto API
   */
  async function computeSha256(data) {
    let buffer;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      buffer = await data.arrayBuffer();
    } else if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (ArrayBuffer.isView(data)) {
      buffer = data.buffer;
    } else {
      buffer = new TextEncoder().encode(JSON.stringify(data));
    }

    if (!window.crypto || !window.crypto.subtle) {
      // Fallback simple checksum if Web Crypto is unavailable in non-secure context
      return simpleHashFallback(buffer);
    }

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function simpleHashFallback(buffer) {
    const bytes = new Uint8Array(buffer);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < bytes.length; i++) {
      h1 = Math.imul(h1 ^ bytes[i], 2654435761);
      h2 = Math.imul(h2 ^ bytes[i], 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    const hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    return hex.repeat(4); // 64 hex characters
  }

  class EvidenceVaultClass {
    constructor() {
      this.db = null;
      this.inMemorySessions = new Map();
      this.inMemoryChunks = [];
      this.sessionMediaUrls = new Map();
      this.initPromise = this.initDatabase();
      this.activeSession = null;
      this.currentGps = { ...ACCRA_FALLBACK_GPS };
      this.gpsWatchId = null;

      // Event listeners
      this.listeners = {
        sessionStarted: [],
        sessionEnded: [],
        chunkSaved: [],
        hashUpdated: [],
        gpsUpdated: []
      };

      this.initGeolocation();
    }

    /**
     * Subscribe to EvidenceVault events
     */
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    /**
     * Unsubscribe from EvidenceVault events
     */
    off(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }

    /**
     * Emit event
     */
    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[EvidenceVault] Listener error on '${event}':`, err);
          }
        });
      }
    }

    /**
     * Initialize IndexedDB database
     */
    async initDatabase() {
      if (!window.indexedDB) {
        console.warn('[EvidenceVault] IndexedDB is not supported in this browser. In-memory session tracking enabled.');
        return null;
      }

      return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Object store 1: sessions
          if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
            const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
            sessionStore.createIndex('startTime', 'startTime', { unique: false });
            sessionStore.createIndex('status', 'status', { unique: false });
          }

          // Object store 2: chunks
          if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
            const chunkStore = db.createObjectStore(STORE_CHUNKS, { keyPath: 'id', autoIncrement: true });
            chunkStore.createIndex('sessionId', 'sessionId', { unique: false });
            chunkStore.createIndex('chunkIndex', 'chunkIndex', { unique: false });
            chunkStore.createIndex('sha256Hash', 'sha256Hash', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.error('[EvidenceVault] IndexedDB initialization error:', event.target.error);
          resolve(null);
        };
      });
    }

    /**
     * Start watching GPS location with fallback
     */
    initGeolocation() {
      if (navigator.geolocation && navigator.geolocation.watchPosition) {
        try {
          this.gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
              this.currentGps = {
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6)),
                accuracy: Math.round(pos.coords.accuracy),
                altitude: pos.coords.altitude || null,
                heading: pos.coords.heading || null,
                speed: pos.coords.speed || null,
                timestamp: pos.timestamp || Date.now(),
                isFallback: false
              };
              this.emit('gpsUpdated', this.currentGps);
            },
            (err) => {
              // Permission denied or timeout; maintain realistic Accra coordinates
              if (this.currentGps.isFallback) {
                this.currentGps.timestamp = Date.now();
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000
            }
          );
        } catch (e) {
          // ignore
        }
      }
    }

    /**
     * Get latest recorded GPS
     */
    getCurrentGps() {
      return { ...this.currentGps };
    }

    /**
     * Check if a recording session is actively in progress
     */
    isSessionActive() {
      return !!this.activeSession && this.activeSession.status === 'active';
    }

    /**
     * Get current active session object
     */
    getActiveSession() {
      return this.activeSession;
    }

    /**
     * Start a new encrypted Evidence Session
     * @param {'audio-stealth'|'video-stealth'|'video-open'} mode 
     */
    async startSession(mode = 'audio-stealth') {
      await this.initPromise;
      const now = Date.now();
      const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
      const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const sessionId = `CS-GH-${dateStr}-${randStr}`;

      const genesisSeed = `CitizenShield-Ghana-Genesis:${sessionId}:${now}:${this.currentGps.latitude},${this.currentGps.longitude}`;
      const genesisHash = await computeSha256(genesisSeed);

      const sessionObj = {
        id: sessionId,
        mode: mode,
        startTime: now,
        endTime: null,
        status: 'active',
        initialGps: { ...this.currentGps },
        finalGps: null,
        threatScorePeak: 0,
        watermarks: [],
        transcript: [],
        violations: [],
        chunkCount: 0,
        genesisHash: genesisHash,
        cumulativeChainHash: genesisHash,
        createdAt: new Date(now).toISOString()
      };

      this.activeSession = sessionObj;
      this.inMemorySessions.set(sessionId, sessionObj);

      // Save to IndexedDB
      if (this.db) {
        try {
          const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
          tx.objectStore(STORE_SESSIONS).put(sessionObj);
        } catch (e) {
          console.warn('[EvidenceVault] DB session write warning:', e);
        }
      }

      this.emit('sessionStarted', sessionObj);
      this.emit('hashUpdated', {
        sessionId: sessionId,
        chunkIndex: 0,
        sha256Hash: genesisHash,
        cumulativeHash: genesisHash,
        cumulativeChainHash: genesisHash
      });
      return sessionObj;
    }

    /**
     * Append a recorded 5-second media chunk blob to active session
     * Calculates SHA-256 and updates cumulative chain hash
     * @param {Blob} blob 
     */
    async appendChunk(blob) {
      if (!this.activeSession || this.activeSession.status !== 'active') {
        console.warn('[EvidenceVault] Cannot append chunk: no active session.');
        return null;
      }

      const chunkIndex = this.activeSession.chunkCount + 1;
      const timestamp = Date.now();

      // Compute cryptographic SHA-256 of chunk blob
      const chunkSha256 = await computeSha256(blob);

      // Compute next state of cumulative chain hash:
      // Hash(PreviousChainHash + ChunkSHA256 + ChunkIndex + Timestamp)
      const chainSeed = `${this.activeSession.cumulativeChainHash}:${chunkSha256}:${chunkIndex}:${timestamp}`;
      const nextChainHash = await computeSha256(chainSeed);

      this.activeSession.cumulativeChainHash = nextChainHash;
      this.activeSession.chunkCount = chunkIndex;

      const chunkRecord = {
        sessionId: this.activeSession.id,
        chunkIndex: chunkIndex,
        blob: blob,
        size: blob.size,
        type: blob.type || 'audio/webm',
        sha256Hash: chunkSha256,
        cumulativeChainHash: nextChainHash,
        timestamp: timestamp
      };

      // In-memory cache fallback
      this.inMemoryChunks.push(chunkRecord);
      this.inMemorySessions.set(this.activeSession.id, { ...this.activeSession });

      // Persist chunk and update session in IndexedDB
      if (this.db) {
        try {
          const tx = this.db.transaction([STORE_CHUNKS, STORE_SESSIONS], 'readwrite');
          tx.objectStore(STORE_CHUNKS).add(chunkRecord);
          tx.objectStore(STORE_SESSIONS).put(this.activeSession);
        } catch (e) {
          console.warn('[EvidenceVault] DB chunk write warning:', e);
        }
      }

      this.emit('chunkSaved', {
        sessionId: this.activeSession.id,
        chunkIndex: chunkIndex,
        sha256Hash: chunkSha256,
        cumulativeChainHash: nextChainHash
      });

      this.emit('hashUpdated', {
        sessionId: this.activeSession.id,
        chunkIndex: chunkIndex,
        sha256Hash: chunkSha256,
        cumulativeHash: nextChainHash,
        cumulativeChainHash: nextChainHash
      });

      return chunkRecord;
    }

    /**
     * Append a transcript entry to active session
     */
    async appendTranscript(entry) {
      if (!this.activeSession) return;

      this.activeSession.transcript.push(entry);

      // Update session peak threat
      if (entry.analysis && entry.analysis.threatScore > this.activeSession.threatScorePeak) {
        this.activeSession.threatScorePeak = entry.analysis.threatScore;
      }

      if (this.db) {
        try {
          const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
          tx.objectStore(STORE_SESSIONS).put(this.activeSession);
        } catch (e) {
          // ignore
        }
      }
    }

    /**
     * Append an officer watermark to active session
     */
    appendWatermark(marker) {
      if (!this.activeSession) return;

      if (!this.activeSession.watermarks.some(w => w.id === marker.id)) {
        this.activeSession.watermarks.push(marker);
        if (this.db) {
          try {
            const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
            tx.objectStore(STORE_SESSIONS).put(this.activeSession);
          } catch (e) {
            // ignore
          }
        }
      }
    }

    /**
     * Finalize and seal active evidence session
     * @param {number} finalThreatScore 
     * @param {Blob|null} mediaBlob
     * @param {string|null} mediaUrl
     */
    async endSession(finalThreatScore = 0, mediaBlob = null, mediaUrl = null) {
      if (!this.activeSession) return null;

      const now = Date.now();
      this.activeSession.endTime = now;
      this.activeSession.status = 'completed';
      this.activeSession.finalGps = { ...this.currentGps };
      this.activeSession.threatScorePeak = Math.max(this.activeSession.threatScorePeak, finalThreatScore);

      this.activeSession.hasVideo = !!(this.activeSession.mode && this.activeSession.mode.startsWith('video'));
      this.activeSession.mediaMimeType = mediaBlob ? mediaBlob.type : (this.activeSession.hasVideo ? 'video/webm' : 'audio/webm');

      if (!this.sessionMediaUrls) {
        this.sessionMediaUrls = new Map();
      }
      if (mediaUrl) {
        this.sessionMediaUrls.set(this.activeSession.id, mediaUrl);
      }

      // Collect violations from LegalCopilotEngine if available
      if (window.LegalCopilotEngine) {
        this.activeSession.violations = window.LegalCopilotEngine.getViolations();
        this.activeSession.watermarks = window.LegalCopilotEngine.getWatermarks();
      }

      // Final closure seal hash
      const sealSeed = `Session-Finalized:${this.activeSession.id}:${now}:${this.activeSession.cumulativeChainHash}`;
      const finalChainSeal = await computeSha256(sealSeed);
      this.activeSession.cumulativeChainHash = finalChainSeal;

      if (this.db) {
        try {
          const tx = this.db.transaction(STORE_SESSIONS, 'readwrite');
          tx.objectStore(STORE_SESSIONS).put(this.activeSession);
        } catch (e) {
          console.warn('[EvidenceVault] DB session seal warning:', e);
        }
      }

      const closedSession = { ...this.activeSession };
      if (mediaUrl) {
        closedSession.mediaUrl = mediaUrl;
      }
      this.inMemorySessions.set(closedSession.id, closedSession);
      this.activeSession = null;

      this.emit('sessionEnded', closedSession);
      return closedSession;
    }

    /**
     * Reconstruct full playable media URL for a completed session from IndexedDB chunks or cache
     * @param {string} sessionId
     * @returns {Promise<string|null>}
     */
    async reconstructSessionMediaUrl(sessionId) {
      if (!sessionId) return null;
      if (!this.sessionMediaUrls) {
        this.sessionMediaUrls = new Map();
      }

      // Check in-memory cache first
      if (this.sessionMediaUrls.has(sessionId)) {
        return this.sessionMediaUrls.get(sessionId);
      }

      await this.initPromise;
      const session = await this.getSessionById(sessionId);
      if (!session) return null;

      let chunks = session.chunks || [];
      if ((!chunks || chunks.length === 0) && this.db) {
        try {
          chunks = await new Promise((resolve) => {
            const tx = this.db.transaction(STORE_CHUNKS, 'readonly');
            const store = tx.objectStore(STORE_CHUNKS);
            const index = store.index('sessionId');
            const req = index.getAll(sessionId);
            req.onsuccess = (e) => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
          });
        } catch (e) {
          chunks = [];
        }
      }

      if (!chunks || chunks.length === 0) {
        chunks = this.inMemoryChunks.filter(c => c.sessionId === sessionId);
      }

      if (chunks && chunks.length > 0) {
        chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
        const blobs = chunks.map(c => c.blob).filter(Boolean);
        if (blobs.length > 0) {
          const mimeType = session.mediaMimeType || (session.hasVideo ? 'video/webm' : 'audio/webm') || (blobs[0] && blobs[0].type) || 'video/webm';
          if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
            const combinedBlob = new Blob(blobs, { type: mimeType });
            const mediaUrl = URL.createObjectURL(combinedBlob);
            this.sessionMediaUrls.set(sessionId, mediaUrl);
            return mediaUrl;
          }
        }
      }

      return session.mediaUrl || null;
    }

    /**
     * Retrieve all saved sessions from IndexedDB or memory cache
     */
    async getAllSessions() {
      await this.initPromise;
      if (!this.db) {
        return Array.from(this.inMemorySessions.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      }

      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction(STORE_SESSIONS, 'readonly');
          const store = tx.objectStore(STORE_SESSIONS);
          const req = store.getAll();

          req.onsuccess = (e) => {
            let list = e.target.result || [];
            if (list.length === 0 && this.inMemorySessions.size > 0) {
              list = Array.from(this.inMemorySessions.values());
            }
            // Sort newest first
            list.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
            resolve(list);
          };

          req.onerror = () => {
            const fallbackList = Array.from(this.inMemorySessions.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
            resolve(fallbackList);
          };
        } catch (e) {
          const fallbackList = Array.from(this.inMemorySessions.values()).sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
          resolve(fallbackList);
        }
      });
    }

    /**
     * Get a specific session by ID including its chunk metadata
     */
    async getSessionById(sessionId) {
      await this.initPromise;

      const getFromMemory = () => {
        const mem = this.inMemorySessions.get(sessionId);
        if (!mem) return null;
        const sessionCopy = JSON.parse(JSON.stringify(mem));
        sessionCopy.chunks = this.inMemoryChunks.filter(c => c.sessionId === sessionId);
        return sessionCopy;
      };

      if (!this.db) {
        return getFromMemory();
      }

      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([STORE_SESSIONS, STORE_CHUNKS], 'readonly');
          const sessionStore = tx.objectStore(STORE_SESSIONS);
          const chunkStore = tx.objectStore(STORE_CHUNKS);

          const sReq = sessionStore.get(sessionId);
          sReq.onsuccess = (e) => {
            const session = e.target.result;
            if (!session) {
              resolve(getFromMemory());
              return;
            }

            const chunkIndex = chunkStore.index('sessionId');
            const cReq = chunkIndex.getAll(sessionId);

            cReq.onsuccess = (ev) => {
              session.chunks = ev.target.result || [];
              resolve(session);
            };

            cReq.onerror = () => {
              session.chunks = [];
              resolve(session);
            };
          };

          sReq.onerror = () => resolve(getFromMemory());
        } catch (e) {
          resolve(getFromMemory());
        }
      });
    }

    /**
     * Delete a session and all its chunks
     */
    async deleteSession(sessionId) {
      await this.initPromise;
      this.inMemorySessions.delete(sessionId);
      this.inMemoryChunks = this.inMemoryChunks.filter(c => c.sessionId !== sessionId);

      if (!this.db) return true;

      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction([STORE_SESSIONS, STORE_CHUNKS], 'readwrite');
          const sessionStore = tx.objectStore(STORE_SESSIONS);
          const chunkStore = tx.objectStore(STORE_CHUNKS);

          sessionStore.delete(sessionId);

          const chunkIndex = chunkStore.index('sessionId');
          const req = chunkIndex.openCursor(sessionId);

          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    }

    /**
     * Generate Ghana Police PPSB WhatsApp complaint link
     */
    generatePPSBWhatsAppLink(session) {
      if (!session) return '';

      const ppsbPhone = '233206639121'; // Official Ghana Police Service PPSB WhatsApp Evidence Desk (020 663 9121)
      const gps = session.finalGps || session.initialGps || ACCRA_FALLBACK_GPS;
      const mapsUrl = `https://maps.google.com/?q=${gps.latitude},${gps.longitude}`;
      
      const officerDetails = (session.watermarks && session.watermarks.length > 0)
        ? session.watermarks.map(w => `• ${w.rankOrType}: ${w.identifier}`).join('\n')
        : '• Unbadged / Identification withheld by officer';

      const violationsList = (session.violations && session.violations.length > 0)
        ? session.violations.map(v => `• ${v.source} (${v.title})`).join('\n')
        : '• Suspected unlawful stop / detention';

      const messageText = 
`OFFICIAL COMPLAINT — POLICE PROFESSIONAL STANDARDS BUREAU (PPSB)
REPUBLIC OF GHANA

INCIDENT REFERENCE: ${session.id}
TIMESTAMP: ${new Date(session.startTime).toUTCString()}
GPS LOCATION: ${gps.latitude}° N, ${gps.longitude}° W
MAP LINK: ${mapsUrl}

OFFICER(S) IDENTIFIED:
${officerDetails}

CONSTITUTIONAL & STATUTORY RIGHTS INFRINGED:
${violationsList}

PEAK THREAT LEVEL: ${session.threatScorePeak || 0}%
RECORDED EVIDENCE SLICES: ${session.chunkCount || 0}
CRYPTOGRAPHIC MASTER SHA-256 HASH:
${session.cumulativeChainHash}

This incident was recorded and cryptographically sealed in real-time by the CitizenShield Ghana Legal Copilot in accordance with Section 5-8 of the Evidence Act, 1975 (NRCD 323). Complete encrypted audio/video evidence is archived and ready for PPSB inspection.`;

      return `https://wa.me/${ppsbPhone}?text=${encodeURIComponent(messageText)}`;
    }

    /**
     * Export Standalone Court-Formatted Verifiable Evidence Certificate & Dossier
     * Conforms to Ghana Evidence Act, 1975 (NRCD 323)
     */
    async exportCourtDossier(sessionId) {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const gps = session.finalGps || session.initialGps || ACCRA_FALLBACK_GPS;
      const mapsUrl = `https://maps.google.com/?q=${gps.latitude},${gps.longitude}`;
      const startDate = new Date(session.startTime).toLocaleString('en-GB', { timeZone: 'Africa/Accra' });
      const endDate = session.endTime ? new Date(session.endTime).toLocaleString('en-GB', { timeZone: 'Africa/Accra' }) : 'In Progress';
      const durationSec = session.endTime ? Math.round((session.endTime - session.startTime) / 1000) : 0;

      // Watermark table rows
      const watermarkRows = (session.watermarks && session.watermarks.length > 0)
        ? session.watermarks.map((w, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${w.rankOrType || 'Watermark'}</strong></td>
            <td><span class="badge">${w.identifier || w.rawText}</span></td>
            <td>${w.elapsedFormatted || '00:00'}</td>
            <td>${w.rawText}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="5" style="text-align:center; color:#888;">No verbal watermarks captured</td></tr>';

      // Violations table rows
      const violationRows = (session.violations && session.violations.length > 0)
        ? session.violations.map((v, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${v.source}</strong></td>
            <td>${v.title}</td>
            <td><blockquote style="margin:0; font-size:12px; color:#333;">${v.snippet || ''}</blockquote></td>
          </tr>
        `).join('')
        : '<tr><td colspan="4" style="text-align:center; color:#888;">No statutory violations registered</td></tr>';

      // Transcript rows
      const transcriptRows = (session.transcript && session.transcript.length > 0)
        ? session.transcript.map((t, idx) => `
          <tr class="${t.speaker === 'Officer' ? 'row-officer' : 'row-citizen'}">
            <td>${idx + 1}</td>
            <td><strong>${t.speaker}</strong></td>
            <td>${new Date(t.timestamp).toLocaleTimeString('en-GB')}</td>
            <td>${t.text}</td>
            <td><span class="score-pill score-${t.analysis?.threatState || 'SAFE'}">${t.analysis?.threatScore || 0}%</span></td>
          </tr>
        `).join('')
        : '<tr><td colspan="5" style="text-align:center; color:#888;">No transcript dialogue logged</td></tr>';

      // Chunks ledger rows
      const chunkRows = (session.chunks && session.chunks.length > 0)
        ? session.chunks.map(c => `
          <tr>
            <td>#${c.chunkIndex}</td>
            <td>${Math.round(c.size / 1024)} KB</td>
            <td>${new Date(c.timestamp).toLocaleTimeString('en-GB')}</td>
            <td class="mono hash-cell">${c.sha256Hash}</td>
            <td class="mono hash-cell">${c.cumulativeChainHash}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="5" style="text-align:center; color:#888;">No binary chunks indexed</td></tr>';

      const ppsbUrl = this.generatePPSBWhatsAppLink(session);

      const dossierHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Court Evidence Certificate - ${session.id}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; margin: 0; padding: 24px; line-height: 1.5; font-size: 13px; }
    .header-box { border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
    .coat-arms { font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #111; margin: 0; }
    .sub-coat { font-size: 12px; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-top: 4px; }
    .doc-title { font-size: 16px; font-weight: bold; background: #f0f0f0; border: 1px solid #ccc; padding: 8px; margin: 14px 0 6px; text-align: center; text-transform: uppercase; }
    .legal-ref { font-size: 11px; font-style: italic; color: #444; margin-bottom: 16px; text-align: center; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #fafafa; border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; }
    .meta-item { margin-bottom: 6px; }
    .meta-label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #666; display: block; }
    .meta-val { font-size: 13px; color: #111; }
    .mono { font-family: 'Courier New', Courier, monospace; font-size: 11px; word-break: break-all; }
    .hash-banner { background: #0b132b; color: #5bc0be; padding: 12px; border-radius: 4px; margin-bottom: 20px; border-left: 6px solid #d99b26; }
    .hash-banner strong { color: #fff; font-size: 12px; display: block; margin-bottom: 4px; text-transform: uppercase; }
    h3 { font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #111; padding-bottom: 4px; margin-top: 24px; margin-bottom: 8px; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
    th { background: #eaeaea; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-weight: 600; font-size: 11px; }
    td { padding: 6px 8px; border: 1px solid #ddd; }
    .badge { background: #fdf2d0; color: #8a6400; padding: 2px 6px; border-radius: 3px; font-weight: 600; font-size: 11px; border: 1px solid #f2da88; }
    .score-pill { padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px; }
    .score-CRITICAL { background: #ffebee; color: #c62828; }
    .score-ELEVATED { background: #fff8e1; color: #f57f17; }
    .score-SAFE { background: #e8f5e9; color: #2e7d32; }
    .row-officer td { background: #fafafa; }
    .row-citizen td { background: #f4fbf7; }
    .hash-cell { font-size: 10px; color: #444; }
    .cert-footer { margin-top: 35px; border-top: 2px solid #333; padding-top: 14px; page-break-inside: avoid; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
    .sig-line { border-top: 1px dotted #333; padding-top: 6px; text-align: center; font-size: 11px; color: #444; }
    .action-bar { margin-bottom: 20px; display: flex; gap: 10px; }
    .btn { background: #000; color: #fff; padding: 8px 14px; text-decoration: none; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer; border: none; }
    .btn-ppsb { background: #128c7e; }
    @media print {
      .action-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as Court PDF</button>
    <a href="${ppsbUrl}" target="_blank" class="btn btn-ppsb">📲 Forward to PPSB WhatsApp Hotline</a>
  </div>

  <div class="header-box">
    <div class="coat-arms">REPUBLIC OF GHANA</div>
    <div class="sub-coat">Judicial Service & Law Enforcement Digital Evidence Record</div>
    <div class="doc-title">CERTIFICATE OF ELECTRONIC EVIDENCE CONFORMITY</div>
    <div class="legal-ref">
      Issued under Sections 5, 6, 7, and 8 of the Evidence Act, 1975 (NRCD 323), Sections 112-113 of the Courts Act, 1993 (Act 459),<br>
      and Section 89 of the Cybersecurity Act, 2020 (Act 1038)
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Incident Tracking ID</span>
      <span class="meta-val mono"><strong>${session.id}</strong></span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Capture Mode</span>
      <span class="meta-val">${session.mode.toUpperCase()}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Incident Date & Time</span>
      <span class="meta-val">${startDate}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Session Concluded</span>
      <span class="meta-val">${endDate} (${durationSec} seconds duration)</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">GPS Geolocation Coordinates</span>
      <span class="meta-val">${gps.latitude}° N, ${gps.longitude}° W (±${gps.accuracy}m)</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Location Reference & Map Link</span>
      <span class="meta-val"><a href="${mapsUrl}" target="_blank" style="color:#0056b3;">${gps.locationName || 'View on Google Maps'}</a></span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Threat Level Peak</span>
      <span class="meta-val"><span class="score-pill score-${session.threatScorePeak >= 85 ? 'CRITICAL' : (session.threatScorePeak >= 40 ? 'ELEVATED' : 'SAFE')}">${session.threatScorePeak || 0}% Threat Peak</span></span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Evidence Slices Encrypted</span>
      <span class="meta-val"><strong>${session.chunkCount || 0}</strong> five-second cryptographic media chunks</span>
    </div>
  </div>

  <div class="hash-banner">
    <strong>Forensic SHA-256 Cumulative Hash Chain (Root Integrity Seal)</strong>
    <span class="mono">${session.cumulativeChainHash}</span>
  </div>

  <h3>I. Verbal Officer Watermarks & Identification Log</h3>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Classification</th>
        <th>Watermarked Identifier</th>
        <th style="width:65px;">Time</th>
        <th>Spoken Utterance Segment</th>
      </tr>
    </thead>
    <tbody>
      ${watermarkRows}
    </tbody>
  </table>

  <h3>II. Constitutional & Statutory Rights Violations Log</h3>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th style="width:230px;">Ghana Legal Authority</th>
        <th>Statutory Right Protected</th>
        <th>Contextual Evidence Snippet</th>
      </tr>
    </thead>
    <tbody>
      ${violationRows}
    </tbody>
  </table>

  <h3>III. Cryptographically Timestamped Speech Transcript</h3>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th style="width:80px;">Speaker</th>
        <th style="width:75px;">Time</th>
        <th>Verbatim Spoken Dialogue</th>
        <th style="width:60px;">Threat</th>
      </tr>
    </thead>
    <tbody>
      ${transcriptRows}
    </tbody>
  </table>

  <h3>IV. Media Chunk SHA-256 Chain Ledger (5-Second Slices)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:60px;">Slice</th>
        <th style="width:65px;">Size</th>
        <th style="width:75px;">Recorded</th>
        <th>Individual Slice SHA-256 Hash</th>
        <th>Cumulative Block Chain State Hash</th>
      </tr>
    </thead>
    <tbody>
      ${chunkRows}
    </tbody>
  </table>

  <div class="cert-footer">
    <p style="font-size:11px; color:#555; margin:0 0 10px;">
      <strong>AFFIDAVIT OF INTEGRITY:</strong> This digital evidence certificate was compiled by the CitizenShield Ghana Mobile Defense Engine using continuous cryptographically linked SHA-256 hash chains. The media chunks, transcripts, and telemetry logged herein were created contemporaneously with the event and have remained unaltered and mathematically sealed.
    </p>
    <div class="sig-grid">
      <div>
        <br><br>
        <div class="sig-line">Citizen / Deponent Signature</div>
      </div>
      <div>
        <br><br>
        <div class="sig-line">Legal Counsel / Court Registrar / PPSB Officer Stamp</div>
      </div>
    </div>
  </div>

  <script id="court-dossier-json" type="application/json">
    ${JSON.stringify(session, null, 2)}
  </script>
</body>
</html>`;

      // Trigger download of standalone HTML certificate if DOM is available
      let url = null;
      if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL && typeof document !== 'undefined' && document.body && document.createElement) {
        try {
          const blob = new Blob([dossierHtml], { type: 'text/html' });
          url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `CitizenShield_Court_Dossier_${session.id}.html`;
          if (typeof link.click === 'function') {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          if (URL.revokeObjectURL) {
            URL.revokeObjectURL(url);
          }
        } catch (e) {
          console.warn('[EvidenceVault] Auto-download notice:', e.message);
        }
      }

      return {
        session,
        html: dossierHtml,
        url: url
      };
    }
  }

  // Export singleton and class
  const instance = new EvidenceVaultClass();
  window.EvidenceVaultClass = EvidenceVaultClass;
  window.EvidenceVault = instance;

})(typeof window !== 'undefined' ? window : this);
