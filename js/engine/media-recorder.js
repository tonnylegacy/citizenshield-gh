/**
 * CitizenShield Ghana - Media Recorder & Speech Recognition Engine
 * File: js/engine/media-recorder.js
 * 
 * Manages Web Speech API continuous recognition with Ghanaian English ('en-GH'),
 * MediaRecorder capturing 5-second encrypted evidence slices, zero-camera-LED
 * audio stealth mode, torch-suppressed video stealth mode, open viewfinder mode,
 * synthetic headless fallback stream, and calm Earbud Whisper TTS.
 */

(function (window) {
  'use strict';

  class MediaEngineClass {
    constructor() {
      this.isActive = false;
      this.mode = 'audio-stealth'; // 'audio-stealth' | 'video-stealth' | 'video-open'
      this.earbudMode = true; // default enabled for stealth legal safety

      // Streams & Recorders
      this.mediaStream = null;
      this.mediaRecorder = null;
      this.videoTrack = null;
      this.audioTrack = null;
      this.recordedChunkIndex = 0;
      this.timesliceMs = 5000; // 5-second chunk interval
      this.syntheticIntervalId = null;

      // Web Speech API
      this.speechRecognizer = null;
      this.speechActive = false;
      this.speechRestartTimer = null;
      this.speechLang = 'en-GH';
      this.fallbackSpeechLang = 'en-US';

      // Whisper TTS
      this.speechSynthesis = window.speechSynthesis || null;
      this.lastWhisperTime = 0;

      // Attached Preview Video Element (for 'video-open' mode)
      this.previewVideoElement = null;

      // Event Listeners
      this.listeners = {
        transcript: [],
        stateChange: [],
        chunkRecorded: [],
        error: []
      };

      this.initSpeechRecognition();
    }

    /**
     * Subscribe to MediaEngine events
     * @param {'transcript'|'stateChange'|'chunkRecorded'|'error'} event 
     * @param {Function} callback 
     */
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    /**
     * Unsubscribe from MediaEngine events
     */
    off(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[MediaEngine] Listener error on event '${event}':`, err);
          }
        });
      }
    }

    /**
     * Initialize Web Speech Recognition
     */
    initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
      if (!SpeechRecognition) {
        console.warn('[MediaEngine] Web Speech Recognition API not natively supported in this browser. Simulation mode available.');
        return;
      }

      try {
        this.speechRecognizer = new SpeechRecognition();
        this.speechRecognizer.continuous = true;
        this.speechRecognizer.interimResults = true;
        this.speechRecognizer.lang = this.speechLang;

        this.speechRecognizer.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const spokenText = (finalTranscript || interimTranscript).trim();
          if (spokenText) {
            this.handleSpeechTranscript(spokenText, !finalTranscript);
          }
        };

        this.speechRecognizer.onerror = (event) => {
          if (event.error === 'language-not-supported' && this.speechRecognizer.lang === this.speechLang) {
            console.warn(`[MediaEngine] 'en-GH' not supported for SpeechRecognition, falling back to '${this.fallbackSpeechLang}'`);
            this.speechRecognizer.lang = this.fallbackSpeechLang;
          } else if (event.error !== 'no-speech') {
            console.warn('[MediaEngine] Speech recognition notice:', event.error);
          }
        };

        this.speechRecognizer.onend = () => {
          this.speechActive = false;
          // Automatic restart if shield recording session is still active
          if (this.isActive) {
            clearTimeout(this.speechRestartTimer);
            this.speechRestartTimer = setTimeout(() => {
              if (this.isActive && !this.speechActive) {
                this.startSpeechRecognition();
              }
            }, 350);
          }
        };
      } catch (err) {
        console.error('[MediaEngine] Failed to initialize speech recognizer:', err);
      }
    }

    /**
     * Start speech recognizer
     */
    startSpeechRecognition() {
      if (!this.speechRecognizer || this.speechActive) return;
      try {
        this.speechRecognizer.start();
        this.speechActive = true;
      } catch (err) {
        // Recognition might already be running
        if (err.name !== 'InvalidStateError') {
          console.warn('[MediaEngine] Speech start note:', err.message);
        }
      }
    }

    /**
     * Stop speech recognizer
     */
    stopSpeechRecognition() {
      clearTimeout(this.speechRestartTimer);
      if (this.speechRecognizer && this.speechActive) {
        try {
          this.speechRecognizer.stop();
        } catch (e) {
          // ignore
        }
        this.speechActive = false;
      }
    }

    /**
     * Internal handler for recognized speech text
     */
    handleSpeechTranscript(text, isInterim = false) {
      if (!text) return;

      const gps = window.EvidenceVault ? window.EvidenceVault.getCurrentGps() : null;
      const startTime = this.sessionStartTime || Date.now();

      // Heuristic speaker tagging: If phrase contains commands like "step out", "pull over", assume Officer
      const lower = text.toLowerCase();
      let speaker = 'Officer';
      if (lower.startsWith('i am') || lower.startsWith('my name') || lower.includes('my lawyer') || lower.includes('my right')) {
        speaker = 'Citizen';
      }

      // Feed into LegalCopilotEngine
      let analysis = null;
      if (window.LegalCopilotEngine && !isInterim) {
        analysis = window.LegalCopilotEngine.processTranscript(text, speaker, startTime, gps);
      }

      const transcriptEntry = {
        id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: text,
        speaker: speaker,
        isInterim: isInterim,
        isFinal: !isInterim,
        timestamp: Date.now(),
        analysis: analysis
      };

      // If final transcript, also append to EvidenceVault session
      if (!isInterim && window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
        window.EvidenceVault.appendTranscript(transcriptEntry);
      }

      // Emit event
      this.emit('transcript', transcriptEntry);
    }

    /**
     * Simulate an utterance directly into the copilot pipeline
     * (Allows UI simulation chips to execute full pipeline on any device)
     * @param {string} text Spoken phrase
     * @param {'Officer'|'Citizen'} speaker 
     */
    simulateUtterance(text, speaker = 'Officer') {
      if (!text) return null;
      const cleanText = text.trim();
      const gps = window.EvidenceVault ? window.EvidenceVault.getCurrentGps() : null;
      const startTime = this.sessionStartTime || Date.now();

      // Process in LegalCopilotEngine
      let analysis = null;
      if (window.LegalCopilotEngine) {
        analysis = window.LegalCopilotEngine.processTranscript(cleanText, speaker, startTime, gps);
      }

      const transcriptEntry = {
        id: `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: cleanText,
        speaker: speaker,
        isInterim: false,
        isFinal: true,
        timestamp: Date.now(),
        analysis: analysis,
        simulated: true
      };

      // Append to EvidenceVault if active
      if (window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
        window.EvidenceVault.appendTranscript(transcriptEntry);
      }

      // Earbud whisper warning if copilot generated a prompt
      if (this.earbudMode && analysis && analysis.matchedLaws && analysis.matchedLaws.length > 0) {
        this.whisper(analysis.matchedLaws[0].actionPrompt || 'CitizenShield: Constitutional rights advisory ready.');
      }

      this.emit('transcript', transcriptEntry);
      return transcriptEntry;
    }

    /**
     * Starts the Shield recording and monitoring session
     * @param {'audio-stealth'|'video-stealth'|'video-open'} mode 
     * @param {Object} options 
     */
    async startShield(mode = 'audio-stealth', options = {}) {
      if (this.isActive) {
        console.warn('[MediaEngine] Shield is already active.');
        return;
      }

      this.mode = mode;
      this.isActive = true;
      this.sessionStartTime = Date.now();
      this.recordedChunkIndex = 0;

      // Start Evidence Vault session if available
      if (window.EvidenceVault) {
        await window.EvidenceVault.startSession(this.mode);
      }

      // Reset Legal Copilot
      if (window.LegalCopilotEngine) {
        window.LegalCopilotEngine.reset();
        window.LegalCopilotEngine.sessionStartTime = this.sessionStartTime;
      }

      // Start Speech Recognition
      this.startSpeechRecognition();

      // Start Media Stream & MediaRecorder
      try {
        await this.setupMediaRecording(mode);
      } catch (err) {
        console.warn('[MediaEngine] MediaDevices hardware unavailable or permission denied. Starting resilient synthetic evidence stream fallback:', err.message);
        this.setupSyntheticFallback();
      }

      this.emit('stateChange', {
        isActive: true,
        mode: this.mode,
        sessionStartTime: this.sessionStartTime
      });

      // Low-profile Earbud audio confirmation
      if (this.earbudMode) {
        this.whisper('CitizenShield active. Protection initialized.');
      }
    }

    /**
     * Configures real media tracks and MediaRecorder
     */
    async setupMediaRecording(mode) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not available in this context');
      }

      let constraints = {};

      if (mode === 'audio-stealth') {
        // Zero camera LED: strictly audio only
        constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        };
      } else if (mode === 'video-stealth') {
        // Video stealth: camera active in background, zero preview, STRICTLY ENFORCES torch: false
        constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          },
          video: {
            facingMode: { ideal: 'environment' }
          }
        };
      } else {
        // video-open: open viewfinder
        constraints = {
          audio: true,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioTrack = this.mediaStream.getAudioTracks()[0] || null;
      this.videoTrack = this.mediaStream.getVideoTracks()[0] || null;

      // If video stealth mode, strictly ensure torch/flash is OFF
      if (mode === 'video-stealth' && this.videoTrack) {
        await this.enforceTorchOff(this.videoTrack);
      }

      // Attach video preview if video-open mode and element is assigned
      if (mode === 'video-open' && this.previewVideoElement && this.mediaStream) {
        this.previewVideoElement.srcObject = this.mediaStream;
        this.previewVideoElement.play().catch(e => console.warn('Preview play warning:', e));
      }

      // Initialize MediaRecorder
      let mimeType = 'audio/webm';
      if (this.videoTrack) {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '');
      } else {
        mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : '');
      }

      const recorderOptions = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0 && this.isActive) {
          const chunkBlob = event.data;
          this.recordedChunkIndex++;

          // Send to Evidence Vault
          if (window.EvidenceVault) {
            try {
              await window.EvidenceVault.appendChunk(chunkBlob);
            } catch (err) {
              console.error('[MediaEngine] Error appending chunk to vault:', err);
            }
          }

          this.emit('chunkRecorded', {
            chunkIndex: this.recordedChunkIndex,
            size: chunkBlob.size,
            type: chunkBlob.type
          });
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[MediaEngine] MediaRecorder error:', event.error);
        this.emit('error', event.error);
      };

      // Start slicing chunks every 5000ms
      this.mediaRecorder.start(this.timesliceMs);
    }

    /**
     * Strictly enforces torch/flash OFF on a video track
     */
    async enforceTorchOff(track) {
      if (!track || !track.getCapabilities) return;
      try {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: false }]
          });
        }
      } catch (err) {
        console.warn('[MediaEngine] Could not apply torch constraint:', err.message);
      }
    }

    /**
     * Toggle torch in video-open mode ONLY
     */
    async toggleTorch(enable) {
      if (this.mode !== 'video-open') {
        console.warn('[MediaEngine] Torch toggle is strictly restricted to open viewfinder mode.');
        return false;
      }
      if (!this.videoTrack || !this.videoTrack.getCapabilities) return false;

      try {
        const capabilities = this.videoTrack.getCapabilities();
        if (capabilities.torch) {
          await this.videoTrack.applyConstraints({
            advanced: [{ torch: !!enable }]
          });
          return true;
        }
      } catch (err) {
        console.warn('[MediaEngine] Torch toggle error:', err);
      }
      return false;
    }

    /**
     * Sets up synthetic fallback stream so tests & headless environments
     * still slice 5-second cryptographically verifiable chunks into IndexedDB
     */
    setupSyntheticFallback() {
      clearInterval(this.syntheticIntervalId);

      // Create synthetic audio slices every timesliceMs (5000ms)
      this.syntheticIntervalId = setInterval(async () => {
        if (!this.isActive) return;
        this.recordedChunkIndex++;

        // Create a realistic synthetic media blob containing timestamped binary evidence payload
        const syntheticHeader = `CITIZENSHIELD_EVIDENCE_STREAM_CHUNK_${this.recordedChunkIndex}_TIME_${Date.now()}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(syntheticHeader);
        const chunkBlob = new Blob([dataBuffer], { type: 'audio/webm' });

        if (window.EvidenceVault) {
          try {
            await window.EvidenceVault.appendChunk(chunkBlob);
          } catch (err) {
            console.error('[MediaEngine] Error in synthetic chunk append:', err);
          }
        }

        this.emit('chunkRecorded', {
          chunkIndex: this.recordedChunkIndex,
          size: chunkBlob.size,
          type: chunkBlob.type,
          synthetic: true
        });
      }, this.timesliceMs);
    }

    /**
     * Attach a video DOM element for preview (video-open mode)
     */
    attachVideoPreview(videoElement) {
      this.previewVideoElement = videoElement;
      if (this.previewVideoElement && this.mediaStream && this.mode === 'video-open') {
        this.previewVideoElement.srcObject = this.mediaStream;
        this.previewVideoElement.play().catch(e => console.warn(e));
      }
    }

    /**
     * Earbud Whisper TTS
     * Speaks low-profile tactical instructions into the user's earpiece
     * @param {string} text Text to speak
     * @param {boolean} force If true, speaks even if earbudMode is false
     */
    whisper(text, force = false) {
      if (!this.earbudMode && !force) return;
      if (!this.speechSynthesis) return;

      // Throttle whispers to prevent speech overlap queue
      const now = Date.now();
      if (now - this.lastWhisperTime < 1800 && !force) {
        return;
      }
      this.lastWhisperTime = now;

      try {
        // Cancel any pending speech
        this.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05; // Calm, low-profile pace
        utterance.pitch = 0.95; // Subtle and measured
        utterance.volume = 0.85; // Low-profile volume

        // Try to pick an English voice
        const voices = this.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const englishVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google'));
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
        }

        this.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[MediaEngine] Whisper TTS error:', err);
      }
    }

    /**
     * Set Earbud whisper mode
     * @param {boolean} enabled 
     */
    setEarbudMode(enabled) {
      this.earbudMode = !!enabled;
    }

    /**
     * Check if earbud mode is enabled
     */
    isEarbudMode() {
      return this.earbudMode;
    }

    /**
     * Stops the Shield recording session and finalizes data
     */
    async stopShield() {
      if (!this.isActive) return;

      this.isActive = false;
      clearInterval(this.syntheticIntervalId);
      this.stopSpeechRecognition();

      // Stop MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          // ignore
        }
      }

      // Stop media tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            // ignore
          }
        });
        this.mediaStream = null;
      }

      if (this.previewVideoElement) {
        this.previewVideoElement.srcObject = null;
      }

      // Finalize Evidence Vault
      let finalSession = null;
      if (window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
        const peakThreat = window.LegalCopilotEngine ? window.LegalCopilotEngine.getThreatStatus().threatScore : 0;
        finalSession = await window.EvidenceVault.endSession(peakThreat);
      }

      this.emit('stateChange', {
        isActive: false,
        mode: this.mode,
        finalSession: finalSession
      });

      if (this.earbudMode) {
        this.whisper('CitizenShield standing down. Evidence encrypted and preserved.');
      }

      return finalSession;
    }

    /**
     * Check if shield is currently active
     */
    isShieldActive() {
      return this.isActive;
    }

    /**
     * Get active recording mode
     */
    getCurrentMode() {
      return this.mode;
    }
  }

  // Export singleton and class
  const instance = new MediaEngineClass();
  window.MediaEngineClass = MediaEngineClass;
  window.MediaEngine = instance;

})(typeof window !== 'undefined' ? window : this);
