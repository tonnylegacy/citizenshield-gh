/**
 * CitizenShield Ghana - SOS Emergency Dispatcher Engine
 * File: js/engine/sos-dispatcher.js
 * 
 * Manages 5-second auto-SOS countdown upon CRITICAL threat detection or manual trigger,
 * haptic vibration alert, earbud warning whisper, cancellation window, payload building
 * for 2 mandatory contacts + legal counsel, /api/dispatch-sos API invocation with
 * offline fallback, and generation of one-tap WhatsApp/SMS emergency broadcast links.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_CONTACTS = 'citizen_shield_contacts';
  const STORAGE_KEY_DISPATCHED = 'citizen_shield_dispatched_sos';

  const DEFAULT_CONTACTS = {
    primary: {
      name: 'Primary Kin / Next of Kin',
      phone: '+233241234567',
      relation: 'Family / Trusted Kin'
    },
    secondary: {
      name: 'Secondary Emergency Contact',
      phone: '+233209876543',
      relation: 'Colleague / Friend'
    },
    lawyer: {
      name: 'Legal Aid Commission Ghana',
      phone: '+233302669514',
      relation: 'Legal Counsel'
    },
    ppsb: {
      name: 'Police Professional Standards Bureau (PPSB)',
      phone: '+233244666999',
      relation: 'Police Oversight'
    }
  };

  class SOSDispatcherClass {
    constructor() {
      this.isCountingDown = false;
      this.countdownSeconds = 5;
      this.countdownTimerId = null;
      this.lastDispatchedPayload = null;
      this.contacts = this.loadContacts();
      this.autoTriggeredForCurrentSession = false;

      // Event listeners
      this.listeners = {
        countdownTick: [],
        sosDispatched: [],
        sosCancelled: []
      };

      this.initAutoCopilotListener();
    }

    /**
     * Subscribe to SOS dispatcher events
     * @param {'countdownTick'|'sosDispatched'|'sosCancelled'} event 
     * @param {Function} callback 
     */
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    /**
     * Unsubscribe
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
            console.error(`[SOSDispatcher] Listener error on '${event}':`, err);
          }
        });
      }
    }

    /**
     * Listen for CRITICAL threat updates from LegalCopilotEngine
     */
    initAutoCopilotListener() {
      if (typeof window === 'undefined') return;

      const checkAndAttach = () => {
        if (window.LegalCopilotEngine) {
          window.LegalCopilotEngine.on('threatUpdate', (data) => {
            if (data.threatState === 'CRITICAL' && !this.isCountingDown && !this.autoTriggeredForCurrentSession) {
              const reason = data.reasons && data.reasons.length > 0 
                ? data.reasons[0] 
                : 'Critical threat threshold exceeded (>= 85%)';
              this.triggerSOS(false, reason);
            }
          });
        } else {
          setTimeout(checkAndAttach, 100);
        }
      };
      checkAndAttach();
    }

    /**
     * Load user emergency contacts from localStorage
     */
    loadContacts() {
      if (typeof localStorage === 'undefined') return { ...DEFAULT_CONTACTS };
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CONTACTS);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_CONTACTS, ...parsed };
        }
      } catch (e) {
        console.warn('[SOSDispatcher] Could not parse stored contacts, using defaults.');
      }
      return { ...DEFAULT_CONTACTS };
    }

    /**
     * Save updated emergency contacts
     */
    saveContacts(newContacts) {
      this.contacts = { ...this.contacts, ...newContacts };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(this.contacts));
        } catch (e) {
          // ignore
        }
      }
      return this.contacts;
    }

    /**
     * Get current configured emergency contacts
     */
    getContacts() {
      return { ...this.contacts };
    }

    /**
     * Trigger the 5-Second SOS Countdown
     * @param {boolean} manual True if initiated manually by user tap
     * @param {string} reason Reason description
     */
    triggerSOS(manual = false, reason = 'Emergency SOS Alert') {
      if (this.isCountingDown) return;

      this.isCountingDown = true;
      this.countdownSeconds = 5;
      if (!manual) {
        this.autoTriggeredForCurrentSession = true;
      }

      // Haptic vibration pattern
      if (navigator.vibrate) {
        navigator.vibrate([250, 100, 250, 100, 400]);
      }

      // Earbud whisper audio warning
      if (window.MediaEngine) {
        window.MediaEngine.whisper('Warning: Emergency SOS triggered. Cancelling in five seconds if not aborted.', true);
      }

      this.emit('countdownTick', this.countdownSeconds);

      // Start 1-second interval countdown
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = setInterval(() => {
        this.countdownSeconds--;

        if (this.countdownSeconds > 0) {
          // Haptic tick
          if (navigator.vibrate) {
            navigator.vibrate(120);
          }
          this.emit('countdownTick', this.countdownSeconds);
        } else {
          // 0 seconds reached: DISPATCH!
          clearInterval(this.countdownTimerId);
          this.isCountingDown = false;
          this.executeDispatch(reason);
        }
      }, 1000);
    }

    /**
     * Cancel ongoing SOS Countdown
     */
    cancelSOS() {
      if (!this.isCountingDown) return;

      clearInterval(this.countdownTimerId);
      this.isCountingDown = false;
      this.countdownSeconds = 5;

      if (window.MediaEngine) {
        window.MediaEngine.whisper('Emergency SOS cancelled. Resuming monitoring.', true);
      }

      this.emit('sosCancelled', { timestamp: Date.now() });
    }

    /**
     * Check if SOS countdown is currently active
     */
    isSOSActive() {
      return this.isCountingDown;
    }

    /**
     * Execute full SOS Dispatch Payload build, API POST, and link generation
     */
    async executeDispatch(reason = 'Critical Threat Encounter') {
      const now = Date.now();
      const gps = window.EvidenceVault ? window.EvidenceVault.getCurrentGps() : { latitude: 5.6037, longitude: -0.1870, accuracy: 12 };
      const session = window.EvidenceVault ? window.EvidenceVault.getActiveSession() : null;
      const copilot = window.LegalCopilotEngine;

      const watermarks = copilot ? copilot.getWatermarks() : [];
      const violations = copilot ? copilot.getViolations() : [];
      const threatScore = copilot ? copilot.getThreatStatus().threatScore : 90;
      const chainHash = session ? session.cumulativeChainHash : 'PENDING_CHAIN_SEAL';
      const sessionId = session ? session.id : `CS-SOS-${now}`;

      // Build recent transcript summary
      const transcripts = copilot ? copilot.getTranscriptHistory() : [];
      const lastDialogue = transcripts.slice(-3).map(t => `[${t.speaker}] "${t.text}"`).join(' | ');

      // Build comprehensive Alert Payload
      const payload = {
        alertId: `SOS-${now}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        sessionId: sessionId,
        timestamp: now,
        isoTime: new Date(now).toISOString(),
        citizenName: 'Ghanaian Citizen',
        contacts: [
          this.contacts.primary,
          this.contacts.secondary
        ],
        lawyer: this.contacts.lawyer,
        location: `${gps.latitude}, ${gps.longitude}`,
        coordinates: { latitude: gps.latitude, longitude: gps.longitude },
        transcriptSummary: lastDialogue || 'Audio stream currently recording in encrypted vault.',
        officerBadges: watermarks.map(w => w.identifier || w.rawText).join(', ') || 'Unspecified',
        sha256: chainHash,
        threatScore: threatScore,
        threatState: 'CRITICAL',
        triggerReason: reason,
        gps: {
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          mapsUrl: `https://maps.google.com/?q=${gps.latitude},${gps.longitude}`
        },
        officerWatermarks: watermarks,
        violations: violations,
        transcriptExcerpt: lastDialogue || 'Audio stream currently recording in encrypted vault.',
        cumulativeChainHash: chainHash,
        recipients: [
          { type: 'primary', name: this.contacts.primary.name, phone: this.contacts.primary.phone },
          { type: 'secondary', name: this.contacts.secondary.name, phone: this.contacts.secondary.phone },
          { type: 'lawyer', name: this.contacts.lawyer.name, phone: this.contacts.lawyer.phone },
          { type: 'ppsb', name: this.contacts.ppsb.name, phone: this.contacts.ppsb.phone }
        ]
      };

      this.lastDispatchedPayload = payload;

      // Log dispatch into Evidence Vault session
      if (window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
        window.EvidenceVault.appendTranscript({
          id: `SOS-EVENT-${now}`,
          speaker: 'CitizenShield System',
          text: `🚨 EMERGENCY SOS DISPATCHED: ${reason} (GPS: ${gps.latitude}, ${gps.longitude})`,
          timestamp: now,
          analysis: { threatScore: 100, threatState: 'CRITICAL', triggerReasons: [reason] }
        });
      }

      // Dispatch to Backend API: /api/dispatch-sos (with graceful offline fallback)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch('/api/dispatch-sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          payload.apiStatus = 'DISPATCHED_TO_SERVER';
        } else {
          payload.apiStatus = `SERVER_RETURNED_${response.status}`;
        }
      } catch (err) {
        // Offline or server not running; save locally and queue
        payload.apiStatus = 'QUEUED_LOCAL_OFFLINE';
        if (typeof localStorage !== 'undefined') {
          try {
            const queue = JSON.parse(localStorage.getItem(STORAGE_KEY_DISPATCHED) || '[]');
            queue.push(payload);
            localStorage.setItem(STORAGE_KEY_DISPATCHED, JSON.stringify(queue));
          } catch (e) {
            // ignore
          }
        }
      }

      // Generate instant WhatsApp and SMS communication links
      const links = {
        whatsApp: this.generateWhatsAppLinks(payload),
        sms: this.generateSMSLinks(payload)
      };

      payload.communicationLinks = links;

      // Low-profile earbud voice confirmation
      if (window.MediaEngine) {
        window.MediaEngine.whisper('SOS dispatched to your emergency contacts with GPS and officer watermark.', true);
      }

      this.emit('sosDispatched', payload);
      return payload;
    }

    /**
     * Generate WhatsApp emergency messages for all contacts
     */
    generateWhatsAppLinks(payload) {
      const p = payload || this.lastDispatchedPayload;
      if (!p) return [];

      const officerSummary = (p.officerWatermarks && p.officerWatermarks.length > 0)
        ? p.officerWatermarks.map(w => `${w.rankOrType}: ${w.identifier}`).join(', ')
        : 'Officer refused name tag / identification';

      const violationsSummary = (p.violations && p.violations.length > 0)
        ? p.violations.map(v => v.title).join('; ')
        : 'Unlawful detention / coercion';

      const cleanPhone = (phone) => (phone || '').replace(/[^0-9]/g, '');

      return [
        {
          recipient: this.contacts.primary.name,
          phone: this.contacts.primary.phone,
          url: `https://wa.me/${cleanPhone(this.contacts.primary.phone)}?text=${encodeURIComponent(
            `🚨 EMERGENCY SOS - CITIZENSHIELD GHANA 🚨\nI am currently in an active high-threat police stop!\n\n📍 LOCATION: ${p.gps.mapsUrl}\n⚠️ THREAT: ${p.threatScore}% (${p.triggerReason})\n👮 OFFICER: ${officerSummary}\n⚖️ VIOLATIONS: ${violationsSummary}\n🔒 EVIDENCE HASH: ${p.cumulativeChainHash.substring(0, 16)}...\n\nAudio/video evidence is being encrypted in real-time. Please monitor my location or call my lawyer!`
          )}`
        },
        {
          recipient: this.contacts.secondary.name,
          phone: this.contacts.secondary.phone,
          url: `https://wa.me/${cleanPhone(this.contacts.secondary.phone)}?text=${encodeURIComponent(
            `🚨 EMERGENCY SOS - CITIZENSHIELD GHANA 🚨\nI am in a critical police stop!\n📍 Location: ${p.gps.mapsUrl}\nOfficer: ${officerSummary}\nEvidence is being recorded live. Please keep this timestamp!`
          )}`
        },
        {
          recipient: this.contacts.lawyer.name,
          phone: this.contacts.lawyer.phone,
          url: `https://wa.me/${cleanPhone(this.contacts.lawyer.phone)}?text=${encodeURIComponent(
            `EMERGENCY LEGAL AID - ARTICLE 14 CONSTITUTIONAL INTERVENTION REQUIRED\nCitizenShield Session ID: ${p.sessionId}\nLocation: ${p.gps.mapsUrl}\nOfficer Watermark: ${officerSummary}\nInfringements: ${violationsSummary}\nForensic Chain Hash: ${p.cumulativeChainHash}\nImmediate legal representation requested.`
          )}`
        },
        {
          recipient: this.contacts.ppsb.name,
          phone: this.contacts.ppsb.phone,
          url: `https://wa.me/${cleanPhone(this.contacts.ppsb.phone)}?text=${encodeURIComponent(
            `GHANA POLICE PPSB COMPLAINT DISPATCH\nReference: ${p.sessionId}\nLocation: ${p.gps.mapsUrl}\nOfficer Identified: ${officerSummary}\nThreat Level: ${p.threatScore}%\nMaster Hash: ${p.cumulativeChainHash}`
          )}`
        }
      ];
    }

    /**
     * Generate SMS emergency links
     */
    generateSMSLinks(payload) {
      const p = payload || this.lastDispatchedPayload;
      if (!p) return [];

      const cleanPhone = (phone) => (phone || '').replace(/[^0-9]/g, '');
      const smsBody = `EMERGENCY SOS: In critical police stop! Loc: ${p.gps.mapsUrl} Threat: ${p.threatScore}% Evidence Hash: ${p.cumulativeChainHash.substring(0, 12)}`;

      return [
        {
          recipient: this.contacts.primary.name,
          phone: this.contacts.primary.phone,
          url: `sms:${cleanPhone(this.contacts.primary.phone)}?body=${encodeURIComponent(smsBody)}`
        },
        {
          recipient: this.contacts.secondary.name,
          phone: this.contacts.secondary.phone,
          url: `sms:${cleanPhone(this.contacts.secondary.phone)}?body=${encodeURIComponent(smsBody)}`
        }
      ];
    }

    /**
     * Reset SOS state for a new session
     */
    reset() {
      this.cancelSOS();
      this.autoTriggeredForCurrentSession = false;
      this.lastDispatchedPayload = null;
    }
  }

  // Export singleton and class
  const instance = new SOSDispatcherClass();
  window.SOSDispatcherClass = SOSDispatcherClass;
  window.SOSDispatcher = instance;

})(typeof window !== 'undefined' ? window : this);
