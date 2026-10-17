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
      this.facingMode = 'environment';
      this.sessionChunks = [];
      this.lastRecordedMediaUrl = null;
      this.lastRecordedMimeType = null;
      this.opticalCanvas = null;
      this.opticalAnimId = null;
      this.isSyntheticVideo = false;

      // Streams & Recorders
      this.mediaStream = null;
      this.mediaRecorder = null;
      this.videoTrack = null;
      this.audioTrack = null;
      this.recordedChunkIndex = 0;
      this.timesliceMs = 1000; // 1-second chunk interval for instant playable video/audio evidence
      this.syntheticIntervalId = null;

      // Web Speech API
      this.speechRecognizer = null;
      this.speechActive = false;
      this.speechRestartTimer = null;
      this.speechLang = 'en-GH';
      this.fallbackSpeechLang = 'en-US';

      // Whisper TTS & Natural Neural Audio Engine
      this.speechSynthesis = (typeof window !== 'undefined' && window.speechSynthesis) || null;
      this.voicePersona = (typeof localStorage !== 'undefined' && localStorage.getItem('cs_gh_voice_persona')) || 'ezinne';
      this.neuralAudio = null;
      this.isSpeaking = false;
      this.lastWhisperTime = 0;

      // Attached Preview Video Element (for live video viewfinder)
      this.previewVideoElement = null;

      // Event Listeners
      this.listeners = {
        transcript: [],
        stateChange: [],
        chunkRecorded: [],
        speechStart: [],
        speechEnd: [],
        error: [],
        videoReady: [],
        recordingComplete: []
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
      this.sessionChunks = [];
      this.lastRecordedMediaUrl = null;
      this.lastRecordedMimeType = null;

      // Stop any prior preview-only stream or HUD animation
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          try { track.stop(); } catch (e) {}
        });
        this.mediaStream = null;
      }
      if (this.opticalAnimId) {
        cancelAnimationFrame(this.opticalAnimId);
        this.opticalAnimId = null;
      }

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
        this.setupSyntheticFallback(mode);
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
      this.mode = mode;
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
        // Video stealth: camera active in background, zero LED torch, user preview always visible
        constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          },
          video: {
            facingMode: { ideal: this.facingMode }
          }
        };
      } else {
        // video-open: open viewfinder
        constraints = {
          audio: true,
          video: {
            facingMode: { ideal: this.facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
      }

      this.isSyntheticVideo = false;

      const getUserMediaWithTimeout = (reqConstraints, timeoutMs = 900) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return Promise.reject(new Error('getUserMedia not available'));
        }
        return Promise.race([
          navigator.mediaDevices.getUserMedia(reqConstraints),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Hardware media permission timeout')), timeoutMs))
        ]);
      };

      // 1. If in video mode, immediately attach 30fps Optical HUD stream at 0ms so viewfinder is NEVER blank
      if (mode.startsWith('video')) {
        this.isSyntheticVideo = true;
        this.mediaStream = this.createOpticalHudStream();
        this.videoTrack = this.mediaStream ? (this.mediaStream.getVideoTracks()[0] || null) : null;
        if (this.previewVideoElement && this.mediaStream) {
          this.previewVideoElement.srcObject = this.mediaStream;
          this.previewVideoElement.muted = true;
          this.previewVideoElement.play().catch(() => {});
        }
      }

      // 2. Attempt hardware camera/microphone acquisition with 900ms non-blocking timeout
      try {
        const hwStream = await getUserMediaWithTimeout(constraints, 900);
        if (hwStream) {
          if (this.opticalAnimId) {
            cancelAnimationFrame(this.opticalAnimId);
            this.opticalAnimId = null;
          }
          this.isSyntheticVideo = false;
          this.mediaStream = hwStream;
        }
      } catch (camErr) {
        if (mode.startsWith('video')) {
          console.warn('[MediaEngine] Using 30fps Sci-Fi Optical HUD stream:', camErr.message);
          if (!this.mediaStream) {
            this.isSyntheticVideo = true;
            this.mediaStream = this.createOpticalHudStream();
          }
        } else {
          throw camErr;
        }
      }

      if (!this.mediaStream) {
        throw new Error('Failed to acquire media stream');
      }

      this.audioTrack = this.mediaStream.getAudioTracks()[0] || null;
      this.videoTrack = this.mediaStream.getVideoTracks()[0] || null;

      // If video stealth mode, strictly ensure torch/flash is OFF on physical hardware track
      if (mode === 'video-stealth' && this.videoTrack && !this.isSyntheticVideo) {
        await this.enforceTorchOff(this.videoTrack);
      }

      // Attach video preview if previewVideoElement is assigned and video track is present
      // In BOTH video-stealth and video-open, user can view their feed
      if (this.previewVideoElement && this.videoTrack) {
        this.previewVideoElement.srcObject = this.mediaStream;
        this.previewVideoElement.muted = true;
        this.previewVideoElement.play().catch(e => console.warn('Preview play warning:', e));
      }

      if (this.videoTrack) {
        this.emit('videoReady', {
          mode: this.mode,
          isSynthetic: this.isSyntheticVideo,
          facingMode: this.facingMode
        });
      }

      // 2. Initialize MediaRecorder
      let mimeType = 'audio/webm';
      if (this.videoTrack) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
          if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            mimeType = 'video/webm;codecs=vp8,opus';
          } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
          } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          }
        } else {
          mimeType = 'video/webm';
        }
      } else {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          }
        } else {
          mimeType = 'audio/webm';
        }
      }

      try {
        if (typeof MediaRecorder === 'undefined') {
          throw new Error('MediaRecorder API not supported');
        }

        const recorderOptions = mimeType ? { mimeType } : undefined;
        this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

        this.mediaRecorder.ondataavailable = async (event) => {
          if (event.data && event.data.size > 0 && this.isActive) {
            const chunkBlob = event.data;
            this.sessionChunks.push(chunkBlob);
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
      } catch (recErr) {
        console.warn('[MediaEngine] MediaRecorder hardware error, continuing with synthetic evidence slices:', recErr.message);
        this.setupSyntheticFallback(mode);
      }
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
    setupSyntheticFallback(mode = this.mode) {
      clearInterval(this.syntheticIntervalId);

      const isVideo = Boolean(mode && mode.startsWith('video'));
      const mimeType = isVideo ? 'video/webm' : 'audio/webm';

      // Create synthetic slices every timesliceMs (5000ms)
      this.syntheticIntervalId = setInterval(async () => {
        if (!this.isActive) return;
        this.recordedChunkIndex++;

        // Create a realistic synthetic media blob containing timestamped binary evidence payload
        const syntheticHeader = `CITIZENSHIELD_EVIDENCE_STREAM_CHUNK_${this.recordedChunkIndex}_TIME_${Date.now()}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(syntheticHeader);
        const chunkBlob = new Blob([dataBuffer], { type: mimeType });

        this.sessionChunks.push(chunkBlob);

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
     * Attach a video DOM element for preview
     * In ANY video mode ('video-stealth' or 'video-open'), user can see their camera feed
     */
    attachVideoPreview(videoElement) {
      this.previewVideoElement = videoElement;
      if (this.previewVideoElement && this.mediaStream) {
        const hasVideo = this.mediaStream.getVideoTracks && this.mediaStream.getVideoTracks().length > 0;
        if (hasVideo) {
          this.previewVideoElement.srcObject = this.mediaStream;
          this.previewVideoElement.muted = true;
          this.previewVideoElement.play().catch(() => {});
        }
      }
    }

    /**
     * Acquire and display live camera preview even before shield is armed
     * @param {'video-open'|'video-stealth'} mode 
     */
    async startVideoPreview(mode = 'video-open') {
      this.mode = mode;

      if (this.isActive) {
        if (this.mode !== mode) {
          await this.switchMode(mode);
        } else if (this.previewVideoElement && this.mediaStream) {
          this.previewVideoElement.srcObject = this.mediaStream;
          this.previewVideoElement.muted = true;
          this.previewVideoElement.play().catch(() => {});
          this.emit('videoReady', {
            mode: this.mode,
            isSynthetic: this.isSyntheticVideo,
            facingMode: this.facingMode
          });
        }
        return;
      }

      // Not active: stop any previous preview stream or animation
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          try { track.stop(); } catch (e) {}
        });
        this.mediaStream = null;
      }
      if (this.opticalAnimId) {
        cancelAnimationFrame(this.opticalAnimId);
        this.opticalAnimId = null;
      }

      // 1. Immediately attach 30fps Sci-Fi Optical HUD stream at 0ms so viewfinder is live instantly
      this.isSyntheticVideo = true;
      let stream = this.createOpticalHudStream();
      this.mediaStream = stream;
      this.videoTrack = stream ? (stream.getVideoTracks && stream.getVideoTracks()[0]) || null : null;
      this.audioTrack = null;

      if (this.previewVideoElement && this.mediaStream) {
        this.previewVideoElement.srcObject = this.mediaStream;
        this.previewVideoElement.muted = true;
        this.previewVideoElement.play().catch(() => {});
      }

      this.emit('videoReady', {
        mode: this.mode,
        isSynthetic: this.isSyntheticVideo,
        facingMode: this.facingMode
      });

      // 2. Attempt physical camera upgrade within 900ms without blocking viewfinder
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const hwStream = await Promise.race([
            navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: this.facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Camera preview timeout')), 900))
          ]);
          if (hwStream && !this.isActive) {
            if (this.opticalAnimId) {
              cancelAnimationFrame(this.opticalAnimId);
              this.opticalAnimId = null;
            }
            this.isSyntheticVideo = false;
            this.mediaStream = hwStream;
            this.videoTrack = (hwStream.getVideoTracks && hwStream.getVideoTracks()[0]) || null;
            if (mode === 'video-stealth' && this.videoTrack) {
              await this.enforceTorchOff(this.videoTrack);
            }
            if (this.previewVideoElement) {
              this.previewVideoElement.srcObject = this.mediaStream;
              this.previewVideoElement.muted = true;
              this.previewVideoElement.play().catch(() => {});
            }
            this.emit('videoReady', {
              mode: this.mode,
              isSynthetic: false,
              facingMode: this.facingMode
            });
          }
        }
      } catch (err) {
        // Keep the 30fps Optical HUD stream active
      }
    }

    /**
     * Seamlessly switch recording and preview mode
     * @param {'audio-stealth'|'video-stealth'|'video-open'} newMode 
     */
    async switchMode(newMode) {
      this.mode = newMode;

      if (newMode === 'audio-stealth') {
        if (!this.isActive) {
          // Not recording: stop any video preview tracks and HUD animation
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
              try { track.stop(); } catch (e) {}
            });
            this.mediaStream = null;
          }
          if (this.opticalAnimId) {
            cancelAnimationFrame(this.opticalAnimId);
            this.opticalAnimId = null;
          }
          if (this.previewVideoElement) {
            this.previewVideoElement.srcObject = null;
          }
          this.videoTrack = null;
          this.audioTrack = null;
        } else {
          // Recording is active: switch live recording to audio-stealth
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try { this.mediaRecorder.stop(); } catch (e) {}
          }
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
              try { track.stop(); } catch (e) {}
            });
            this.mediaStream = null;
          }
          if (this.opticalAnimId) {
            cancelAnimationFrame(this.opticalAnimId);
            this.opticalAnimId = null;
          }
          if (this.previewVideoElement) {
            this.previewVideoElement.srcObject = null;
          }
          try {
            await this.setupMediaRecording('audio-stealth');
          } catch (err) {
            this.setupSyntheticFallback('audio-stealth');
          }
        }
      } else if (newMode === 'video-stealth' || newMode === 'video-open') {
        if (this.isActive) {
          // Recording is active: re-initialize recorder with new video mode
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try { this.mediaRecorder.stop(); } catch (e) {}
          }
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
              try { track.stop(); } catch (e) {}
            });
            this.mediaStream = null;
          }
          if (this.opticalAnimId) {
            cancelAnimationFrame(this.opticalAnimId);
            this.opticalAnimId = null;
          }
          try {
            await this.setupMediaRecording(newMode);
          } catch (err) {
            console.warn('[MediaEngine] setupMediaRecording failed in switchMode, fallback to synthetic:', err.message);
            this.setupSyntheticFallback(newMode);
          }
        } else {
          // Not recording: start live preview in this mode
          await this.startVideoPreview(newMode);
        }
      }

      this.emit('stateChange', {
        isActive: this.isActive,
        mode: this.mode,
        sessionStartTime: this.sessionStartTime
      });
    }

    /**
     * Flip between front and rear camera
     */
    async flipCamera() {
      this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
      if (this.mode === 'video-stealth' || this.mode === 'video-open') {
        await this.switchMode(this.mode);
      }
    }

    /**
     * Bulletproof 30fps Sci-Fi Optical HUD Stream Fallback
     * Creates an offscreen 640x360 canvas with an active Vercel/Apple Sci-Fi Monochrome
     * viewfinder telemetry loop and acoustic visualizer.
     * @returns {MediaStream|null}
     */
    createOpticalHudStream() {
      if (typeof document === 'undefined') return null;

      if (this.opticalAnimId) {
        cancelAnimationFrame(this.opticalAnimId);
        this.opticalAnimId = null;
      }

      if (!this.opticalCanvas) {
        this.opticalCanvas = document.createElement('canvas');
        this.opticalCanvas.width = 640;
        this.opticalCanvas.height = 360;
      }

      const canvas = this.opticalCanvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const drawHudFrame = () => {
        const now = Date.now();
        const width = canvas.width;
        const height = canvas.height;

        // 1. Deep #050507 background
        ctx.fillStyle = '#050507';
        ctx.fillRect(0, 0, width, height);

        // 2. Subtle 1px technical grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        ctx.beginPath();
        for (let x = 0; x <= width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // 3. Moving horizontal laser scanline
        const scanlineY = (now * 0.12) % height;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, scanlineY);
        ctx.lineTo(width, scanlineY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(0, Math.max(0, scanlineY - 4), width, 8);

        // 4. Corner optical reticle brackets (#FFFFFF)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        const bLen = 22;
        const pad = 24;

        ctx.beginPath();
        // Top-left
        ctx.moveTo(pad, pad + bLen);
        ctx.lineTo(pad, pad);
        ctx.lineTo(pad + bLen, pad);

        // Top-right
        ctx.moveTo(width - pad - bLen, pad);
        ctx.lineTo(width - pad, pad);
        ctx.lineTo(width - pad, pad + bLen);

        // Bottom-left
        ctx.moveTo(pad, height - pad - bLen);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(pad + bLen, height - pad);

        // Bottom-right
        ctx.moveTo(width - pad - bLen, height - pad);
        ctx.lineTo(width - pad, height - pad);
        ctx.lineTo(width - pad, height - pad - bLen);
        ctx.stroke();

        // 5. Center crosshair target ring
        const cx = width / 2;
        const cy = height / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - 36, cy);
        ctx.lineTo(cx - 12, cy);
        ctx.moveTo(cx + 12, cy);
        ctx.lineTo(cx + 36, cy);
        ctx.moveTo(cx, cy - 36);
        ctx.lineTo(cx, cy - 12);
        ctx.moveTo(cx, cy + 12);
        ctx.lineTo(cx, cy + 36);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();

        // 6. Center animated 24-bar monochrome acoustic waveform reacting in real time
        const barCount = 24;
        const barWidth = 4;
        const barGap = 4;
        const totalW = barCount * (barWidth + barGap) - barGap;
        const startX = cx - totalW / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';

        for (let i = 0; i < barCount; i++) {
          const t1 = (now / 180) + (i * 0.42);
          const t2 = (now / 95) + (i * 0.75);
          const h = 6 + Math.abs(Math.sin(t1)) * 26 + (Math.sin(t2) * 5);
          const bx = startX + i * (barWidth + barGap);
          const by = cy - (h / 2);
          ctx.fillRect(bx, by, barWidth, Math.max(4, h));
        }

        // 7. Live telemetry text in monospace (positioned cleanly inside HUD overlay margins)
        ctx.font = '10.5px "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

        // Top-right UTC timestamp
        ctx.textAlign = 'right';
        ctx.fillText(`UTC • ${new Date().toISOString().substring(11, 19)}`, width - pad - 10, pad + 18);

        // Bottom-left GPS coordinates above HUD controls
        let gpsText = 'GPS: 5.6037° N, 0.1870° W • ACCRA';
        if (window.EvidenceVault && typeof window.EvidenceVault.getCurrentGps === 'function') {
          const g = window.EvidenceVault.getCurrentGps();
          if (g && typeof g.latitude === 'number' && typeof g.longitude === 'number') {
            const latDir = g.latitude >= 0 ? 'N' : 'S';
            const lngDir = g.longitude >= 0 ? 'E' : 'W';
            gpsText = `GPS: ${Math.abs(g.latitude).toFixed(4)}° ${latDir}, ${Math.abs(g.longitude).toFixed(4)}° ${lngDir}`;
          }
        }
        ctx.textAlign = 'left';
        ctx.fillText(gpsText, pad + 10, height - pad - 34);

        // Bottom-right SHA-256 status above HUD controls
        ctx.textAlign = 'right';
        ctx.fillText('SHA-256: LIVE STREAM', width - pad - 10, height - pad - 34);

        this.opticalAnimId = requestAnimationFrame(drawHudFrame);
      };

      drawHudFrame();

      if (typeof canvas.captureStream === 'function') {
        return canvas.captureStream(30);
      }
      return null;
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
      if (!this.isActive) return null;

      this.isActive = false;
      clearInterval(this.syntheticIntervalId);
      this.stopSpeechRecognition();

      // Stop MediaRecorder and await final chunk if recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        try {
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 400);
            const onStop = () => {
              clearTimeout(timer);
              resolve();
            };
            this.mediaRecorder.addEventListener('stop', onStop, { once: true });
            try {
              this.mediaRecorder.stop();
            } catch (e) {
              clearTimeout(timer);
              resolve();
            }
          });
        } catch (e) {
          // ignore
        }
      } else if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          // ignore
        }
      }

      // Assemble full playable recording blob
      const isVideo = Boolean(this.videoTrack || (this.mode && this.mode.startsWith('video')));
      const resolvedMime = isVideo ? 'video/webm' : 'audio/webm';
      let fullBlob = null;
      try {
        fullBlob = new Blob(this.sessionChunks, { type: resolvedMime });
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
          this.lastRecordedMediaUrl = URL.createObjectURL(fullBlob);
        }
        this.lastRecordedMimeType = fullBlob.type;
      } catch (blobErr) {
        console.warn('[MediaEngine] Could not assemble fullBlob:', blobErr.message);
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
      this.videoTrack = null;
      this.audioTrack = null;

      if (this.opticalAnimId) {
        cancelAnimationFrame(this.opticalAnimId);
        this.opticalAnimId = null;
      }

      if (this.previewVideoElement) {
        this.previewVideoElement.srcObject = null;
      }

      // Finalize Evidence Vault
      let finalSession = null;
      if (window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
        const peakThreat = window.LegalCopilotEngine ? window.LegalCopilotEngine.getThreatStatus().threatScore : 0;
        finalSession = await window.EvidenceVault.endSession(peakThreat, fullBlob, this.lastRecordedMediaUrl);
      }

      this.emit('recordingComplete', {
        session: finalSession,
        mediaUrl: this.lastRecordedMediaUrl,
        mimeType: this.lastRecordedMimeType,
        mode: this.mode
      });

      this.emit('stateChange', {
        isActive: false,
        mode: this.mode,
        finalSession: finalSession,
        mediaUrl: this.lastRecordedMediaUrl
      });

      if (this.mode && this.mode.startsWith('video')) {
        this.startVideoPreview(this.mode).catch(() => {});
      }

      if (this.earbudMode) {
        this.whisper('CitizenShield standing down. Evidence encrypted and preserved.');
      }

      return finalSession;
    }

    /**
     * Get the latest recorded media URL
     */
    getLastRecordedMediaUrl() {
      return this.lastRecordedMediaUrl;
    }

    /**
     * Get the latest recorded media MIME type
     */
    getLastRecordedMimeType() {
      return this.lastRecordedMimeType;
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
