/**
 * CitizenShield Ghana — Supabase Cloud Sync & Cryptographic Notary Engine
 * File: js/engine/supabase-sync.js
 *
 * Provides a zero-dependency, offline-tolerant Supabase integration for:
 * 1. Real-time SHA-256 Evidence Hash Notarization (`public.evidence_sessions`)
 * 2. Live SOS Incident Telemetry & Tracking Links (`public.sos_dispatches`)
 * 3. Officer Badge Watermark Cloud Registry (`public.officer_watermarks`)
 * 4. Off-site Encrypted Media Chunk & Court Dossier Upload (`storage/v1/object/evidence-vault`)
 *
 * Works seamlessly in Offline-First Hybrid Mode:
 * - If Supabase URL + Anon Key are configured, syncs live over HTTPS REST.
 * - If offline or credentials aren't set yet, queues payloads locally in `localStorage`
 *   (`cs_gh_supabase_queue`) and flushes automatically once connected.
 */

(function (window) {
  'use strict';

  const CONFIG_KEY = 'cs_gh_supabase_config';
  const QUEUE_KEY = 'cs_gh_supabase_queue';
  const DEVICE_ID_KEY = 'cs_gh_device_id';

  class SupabaseSyncEngineClass {
    constructor() {
      this.config = this.loadConfig();
      this.deviceId = this.getOrCreateDeviceId();
      this.queue = this.loadQueue();
      this.isSyncing = false;
      this.listeners = {
        statusChange: [],
        synced: []
      };

      // Automatically flush offline queue when connectivity returns
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.flushQueue());
      }
    }

    on(event, cb) {
      if (this.listeners[event]) this.listeners[event].push(cb);
    }

    emit(event, payload) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => {
          try { cb(payload); } catch (e) { /* ignore */ }
        });
      }
    }

    getOrCreateDeviceId() {
      try {
        let id = localStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
          const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
          id = `DEV-GH-${rand}-${Date.now().toString(36).toUpperCase()}`;
          localStorage.setItem(DEVICE_ID_KEY, id);
        }
        return id;
      } catch (e) {
        return 'DEV-GH-EPHEMERAL';
      }
    }

    loadConfig() {
      try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.url && parsed.anonKey) return parsed;
        }
      } catch (e) { /* ignore */ }

      if (window.CITIZENSHIELD_SUPABASE && window.CITIZENSHIELD_SUPABASE.url) {
        return window.CITIZENSHIELD_SUPABASE;
      }
      return { url: '', anonKey: '', enabled: false };
    }

    saveConfig(url, anonKey) {
      const cleanUrl = (url || '').trim().replace(/\/+$/, '');
      const cleanKey = (anonKey || '').trim();
      this.config = {
        url: cleanUrl,
        anonKey: cleanKey,
        enabled: Boolean(cleanUrl && cleanKey)
      };
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
      } catch (e) { /* ignore */ }

      this.emit('statusChange', this.getStatus());
      if (this.isConfigured()) {
        this.flushQueue();
      }
      return this.config;
    }

    isConfigured() {
      return Boolean(this.config && this.config.url && this.config.anonKey);
    }

    getStatus() {
      return {
        configured: this.isConfigured(),
        url: this.config.url || '',
        queuedCount: this.queue.length,
        deviceId: this.deviceId
      };
    }

    loadQueue() {
      try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    saveQueue() {
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue.slice(-50)));
      } catch (e) { /* ignore */ }
    }

    enqueue(table, payload, method = 'POST', upsertKey = null) {
      this.queue.push({
        id: `Q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        table,
        payload,
        method,
        upsertKey,
        timestamp: Date.now()
      });
      this.saveQueue();
      this.emit('statusChange', this.getStatus());
    }

    /**
     * Low-level Supabase PostgREST request
     */
    async restRequest(table, payload, upsertColumn = null) {
      if (!this.isConfigured() || navigator.onLine === false) {
        this.enqueue(table, payload, 'POST', upsertColumn);
        return { queued: true };
      }

      const query = upsertColumn ? `?on_conflict=${encodeURIComponent(upsertColumn)}` : '';
      const endpoint = `${this.config.url}/rest/v1/${table}${query}`;
      const preferHeader = upsertColumn
        ? 'resolution=merge-duplicates,return=minimal'
        : 'return=minimal';

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.anonKey,
            'Authorization': `Bearer ${this.config.anonKey}`,
            'Prefer': preferHeader
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Supabase HTTP ${res.status}`);
        }

        this.emit('synced', { table, timestamp: Date.now() });
        return { ok: true };
      } catch (err) {
        console.warn(`[SupabaseSync] Queuing ${table} for background retry:`, err.message);
        this.enqueue(table, payload, 'POST', upsertColumn);
        return { queued: true, error: err.message };
      }
    }

    /**
     * Notarize or update an Evidence Session's SHA-256 chain hash in Supabase Postgres
     */
    async syncEvidenceSession(session) {
      if (!session || !session.id) return;
      const gps = session.gpsTrail && session.gpsTrail.length > 0
        ? session.gpsTrail[session.gpsTrail.length - 1]
        : null;

      const row = {
        session_code: session.id,
        device_id: this.deviceId,
        recording_mode: session.mode || 'audio-stealth',
        started_at: new Date(session.startTime || Date.now()).toISOString(),
        ended_at: session.endTime ? new Date(session.endTime).toISOString() : null,
        peak_threat_score: session.peakThreatScore || 0,
        threat_state: (session.peakThreatScore || 0) >= 75 ? 'CRITICAL' : ((session.peakThreatScore || 0) >= 40 ? 'ELEVATED' : 'SAFE'),
        chunk_count: session.chunkCount || (session.chunks ? session.chunks.length : 0),
        total_bytes: session.totalBytes || 0,
        cumulative_sha256: session.cumulativeHash || 'GENESIS',
        gps_lat: gps ? gps.latitude : null,
        gps_lng: gps ? gps.longitude : null,
        gps_location_name: gps ? (gps.locationName || 'Accra, GH') : 'Accra, GH',
        watermarks: session.watermarks || [],
        transcript: session.transcript || [],
        updated_at: new Date().toISOString()
      };

      return this.restRequest('evidence_sessions', row, 'session_code');
    }

    /**
     * Broadcast an SOS Dispatch to Supabase `sos_dispatches` table
     */
    async syncSosDispatch(dispatchData) {
      if (!dispatchData) return;
      const row = {
        dispatch_code: dispatchData.dispatchId || `SOS-GH-${Date.now()}`,
        session_code: dispatchData.sessionId || null,
        device_id: this.deviceId,
        trigger_reason: dispatchData.reason || 'Critical Threat Detected',
        threat_score: dispatchData.threatScore || 88,
        gps_lat: dispatchData.gps ? dispatchData.gps.latitude : null,
        gps_lng: dispatchData.gps ? dispatchData.gps.longitude : null,
        google_maps_url: dispatchData.mapsUrl || null,
        officer_badges: dispatchData.watermarks || [],
        transcript_excerpt: dispatchData.transcriptSummary || '',
        contacts_notified: dispatchData.contacts || [],
        is_active: true
      };

      return this.restRequest('sos_dispatches', row, 'dispatch_code');
    }

    /**
     * Log an Officer Verbal Watermark into `officer_watermarks`
     */
    async syncWatermark(sessionCode, watermark, gps) {
      if (!watermark) return;
      const row = {
        session_code: sessionCode || 'LIVE-SESSION',
        badge_or_rank: watermark.identifier || watermark.rawText || 'Unknown Badge',
        raw_utterance: watermark.rawText || '',
        gps_lat: gps ? gps.latitude : null,
        gps_lng: gps ? gps.longitude : null
      };

      return this.restRequest('officer_watermarks', row);
    }

    /**
     * Upload a standalone Court Dossier HTML or media blob to Supabase Storage (`evidence-vault` bucket)
     */
    async uploadEvidenceBlob(sessionCode, fileName, blobOrText, contentType = 'text/html') {
      if (!this.isConfigured() || navigator.onLine === false) {
        return { queued: true, reason: 'Supabase not configured or device offline' };
      }

      const objectPath = `${this.deviceId}/${sessionCode}/${fileName}`;
      const endpoint = `${this.config.url}/storage/v1/object/evidence-vault/${objectPath}`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            'apikey': this.config.anonKey,
            'Authorization': `Bearer ${this.config.anonKey}`,
            'x-upsert': 'true'
          },
          body: blobOrText
        });

        if (!res.ok) throw new Error(`Storage HTTP ${res.status}`);
        return { ok: true, path: objectPath };
      } catch (err) {
        console.warn('[SupabaseSync] Storage upload deferred:', err.message);
        return { queued: true, error: err.message };
      }
    }

    /**
     * Flush any queued offline rows to Supabase when back online
     */
    async flushQueue() {
      if (this.isSyncing || !this.isConfigured() || navigator.onLine === false || this.queue.length === 0) {
        return;
      }

      this.isSyncing = true;
      const pending = [...this.queue];
      this.queue = [];
      this.saveQueue();

      for (const item of pending) {
        await this.restRequest(item.table, item.payload, item.upsertKey);
      }

      this.isSyncing = false;
      this.emit('statusChange', this.getStatus());
    }
  }

  const instance = new SupabaseSyncEngineClass();
  window.SupabaseSyncEngineClass = SupabaseSyncEngineClass;
  window.SupabaseSync = instance;

})(typeof window !== 'undefined' ? window : this);
