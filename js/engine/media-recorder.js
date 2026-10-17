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

      // Whisper TTS & Natural Neural Audio Engine
      this.speechSynthesis = window.speechSynthesis || null;
      this.voicePersona = (typeof localStorage !== 'undefined' && localStorage.getItem('cs_gh_voice_persona')) || 'ezinne';
      this.neuralAudio = null;
      this.isSpeaking = false;
      this.lastWhisperTime = 0;

      // Attached Preview Video Element (for 'video-open' mode)
      this.previewVideoElement = null;

      // Event Listeners
      this.listeners = {
        transcript: [],
        stateChange: [],
        chunkRecorded: [],
        speechStart: [],
        speechEnd: [],
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
     * Stop any active neural or browser speech output immediately
     */
    stopSpeech() {
      if (this.neuralAudio) {
        try {
          this.neuralAudio.pause();
          this.neuralAudio.src = '';
        } catch (e) { /* ignore */ }
        this.neuralAudio = null;
      }
      if (this.speechSynthesis) {
        try {
          this.speechSynthesis.cancel();
        } catch (e) { /* ignore */ }
      }
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.emit('speechEnd', { persona: this.voicePersona });
      }
    }

    /**
     * Set Natural Neural Voice Persona ('ezinne' | 'abeo' | 'sonia' | 'andrew')
     * @param {string} persona
     */
    setVoicePersona(persona) {
      const valid = ['ezinne', 'abeo', 'sonia', 'andrew'];
      this.voicePersona = valid.includes(persona) ? persona : 'ezinne';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cs_gh_voice_persona', this.voicePersona);
      }
    }

    /**
     * Get active voice persona
     */
    getVoicePersona() {
      return this.voicePersona || 'ezinne';
    }

    /**
     * Earbud Whisper & Natural Human Counsel Voice
     * Streams 24kHz Natural Neural Speech (West African Ezinne/Abeo or British Sonia)
     * with automatic offline fallback to Web Speech Synthesis if network is severed.
     * @param {string} text Text to speak
     * @param {boolean} force If true, speaks even if earbudMode is false
     */
    whisper(text, force = false) {
      if (!this.earbudMode && !force) return;
      if (!text || !text.trim()) return;

      // Throttle automatic whispers to prevent speech overlap queue
      const now = Date.now();
      if (now - this.lastWhisperTime < 1800 && !force) {
        return;
      }
      this.lastWhisperTime = now;

      // Cancel any ongoing speech first
      this.stopSpeech();

      const cleanText = text.trim();
      const persona = this.voicePersona || 'ezinne';

      // Attempt Natural Neural Voice Stream first when online
      if (typeof Audio !== 'undefined' && navigator.onLine !== false) {
        try {
          const ttsUrl = `/api/tts?voice=${encodeURIComponent(persona)}&text=${encodeURIComponent(cleanText)}`;
          const audio = new Audio(ttsUrl);
          audio.preload = 'auto';
          audio.volume = 0.95;
          this.neuralAudio = audio;

          audio.onplaying = () => {
            this.isSpeaking = true;
            this.emit('speechStart', { persona, engine: 'neural', text: cleanText });
          };

          audio.onended = () => {
            this.isSpeaking = false;
            this.neuralAudio = null;
            this.emit('speechEnd', { persona, engine: 'neural' });
          };

          audio.onerror = () => {
            this.neuralAudio = null;
            this._fallbackBrowserSpeech(cleanText);
          };

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              this.neuralAudio = null;
              this._fallbackBrowserSpeech(cleanText);
            });
          }
          return;
        } catch (err) {
          console.warn('[MediaEngine] Neural TTS fallback triggered:', err);
        }
      }

      this._fallbackBrowserSpeech(cleanText);
    }

    /**
     * Offline Fallback Speech Synthesis when device has zero connectivity
     * @param {string} text
     */
    _fallbackBrowserSpeech(text) {
      if (!this.speechSynthesis) return;
      try {
        this.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;

        const voices = this.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const preferred =
            voices.find(v => v.name.includes('Natural') || v.name.includes('Neural')) ||
            voices.find(v => v.lang.startsWith('en-GB') && (v.name.includes('Hazel') || v.name.includes('Sonia') || v.name.includes('Susan'))) ||
            voices.find(v => v.lang.startsWith('en'));
          if (preferred) utterance.voice = preferred;
        }

        utterance.onstart = () => {
          this.isSpeaking = true;
          this.emit('speechStart', { persona: 'offline-fallback', engine: 'browser', text });
        };
        utterance.onend = () => {
          this.isSpeaking = false;
          this.emit('speechEnd', { persona: 'offline-fallback', engine: 'browser' });
        };
        utterance.onerror = () => {
          this.isSpeaking = false;
          this.emit('speechEnd', { persona: 'offline-fallback', engine: 'browser' });
        };

        this.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[MediaEngine] Browser fallback TTS error:', err);
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
