/**
 * CitizenShield Ghana - Stealth OLED Blackout & Discretion Engine
 * File: js/engine/stealth-mode.js
 * 
 * Manages pitch-black OLED lock screen overlay (#000000), Screen WakeLock API,
 * 18g device shake trigger, Alt+S hotkey, accidental tap prevention, and
 * a 1.5-second press-and-hold progress-ring unlock gesture.
 */

(function (window) {
  'use strict';

  class StealthEngineClass {
    constructor() {
      this.isStealth = false;
      this.wakeLockSentinel = null;
      this.overlayElement = null;
      this.clockTimerId = null;

      // Shake detection state
      this.lastShakeTime = 0;
      this.lastAcc = { x: 0, y: 0, z: 0 };
      this.shakeThreshold = 18; // acceleration delta > 18

      // Unlock gesture state
      this.holdTimerId = null;
      this.holdStartTime = 0;
      this.holdDurationMs = 1500; // 1.5s hold
      this.holdProgressRing = null;
      this.holdAnimFrame = null;
      this.lastTapTime = 0;
      this.doubleTapThresholdMs = 350;

      // Event listeners
      this.listeners = {
        stealthChange: []
      };

      this.initDomOverlay();
      this.initShakeListener();
      this.initKeyboardShortcut();
      this.initVisibilityHandler();
    }

    /**
     * Subscribe to stealth engine events
     * @param {'stealthChange'} event 
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
            console.error('[StealthEngine] Listener error:', err);
          }
        });
      }
    }

    /**
     * Initialize DOM elements for Stealth Blackout Overlay
     */
    initDomOverlay() {
      if (typeof document === 'undefined') return;

      // Look for existing overlay or create dynamically
      let overlay = document.getElementById('stealth-overlay') || document.getElementById('cs-stealth-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'cs-stealth-overlay';
        overlay.style.cssText = `
          display: none;
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-color: #000000;
          color: #333333;
          z-index: 999999;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
          touch-action: none;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 60px 24px 40px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        `;

        overlay.innerHTML = `
          <div style="text-align: center; margin-top: 40px;">
            <div id="cs-stealth-time" style="font-size: 56px; font-weight: 200; color: #3a3a3a; letter-spacing: -1px; font-variant-numeric: tabular-nums;">--:--</div>
            <div id="cs-stealth-date" style="font-size: 13px; font-weight: 400; color: #2a2a2a; margin-top: 6px; letter-spacing: 0.5px;">--</div>
          </div>

          <div id="cs-stealth-unlock-zone" style="position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 50%;">
            <svg viewBox="0 0 100 100" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg);">
              <circle cx="50" cy="50" r="44" stroke="#141414" stroke-width="4" fill="none" />
              <circle id="cs-stealth-progress-ring" cx="50" cy="50" r="44" stroke="#444444" stroke-width="4" fill="none"
                stroke-dasharray="276.46" stroke-dashoffset="276.46" stroke-linecap="round" style="transition: stroke-dashoffset 50ms linear;" />
            </svg>
            <div style="text-align: center; z-index: 1;">
              <div style="font-size: 10px; color: #303030; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Hold to</div>
              <div style="font-size: 11px; color: #3d3d3d; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-top: 2px;">Unlock</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; width: 100%; font-size: 11px; color: #1c1c1c;">
            <span id="cs-stealth-corner-left" style="padding: 15px;">•••</span>
            <span style="padding: 15px;">•••</span>
          </div>
        `;

        document.body.appendChild(overlay);
      }

      this.overlayElement = overlay;
      this.holdProgressRing = overlay.querySelector('#stealth-progress-circle') || overlay.querySelector('#cs-stealth-progress-ring');

      // Bind Hold & Touch gestures
      const unlockZone = overlay.querySelector('#stealth-unlock-trigger') || overlay.querySelector('#cs-stealth-unlock-zone');
      const cornerLeft = overlay.querySelector('#cs-stealth-corner-left');

      // Prevent accidental single tap default actions
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Press and hold logic on unlock zone
      const startHold = (e) => {
        e.preventDefault();
        this.holdStartTime = Date.now();
        this.animateHoldProgress();
      };

      const endHold = (e) => {
        if (this.holdAnimFrame) {
          cancelAnimationFrame(this.holdAnimFrame);
          this.holdAnimFrame = null;
        }
        if (this.holdProgressRing) {
          this.holdProgressRing.style.strokeDashoffset = '276.46';
        }
      };

      if (unlockZone) {
        unlockZone.addEventListener('mousedown', startHold);
        unlockZone.addEventListener('touchstart', startHold, { passive: false });
        unlockZone.addEventListener('mouseup', endHold);
        unlockZone.addEventListener('mouseleave', endHold);
        unlockZone.addEventListener('touchend', endHold);
        unlockZone.addEventListener('touchcancel', endHold);
      }

      // Tactical backup: Double tap bottom-left corner
      if (cornerLeft) {
        cornerLeft.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const now = Date.now();
          if (now - this.lastTapTime < this.doubleTapThresholdMs) {
            this.exitStealth();
          }
          this.lastTapTime = now;
        });
      }
    }

    /**
     * Animate SVG circular progress ring during press-and-hold
     */
    animateHoldProgress() {
      const circumference = 276.46; // 2 * PI * 44

      const step = () => {
        const elapsed = Date.now() - this.holdStartTime;
        const progress = Math.min(1, elapsed / this.holdDurationMs);
        const offset = circumference * (1 - progress);

        if (this.holdProgressRing) {
          this.holdProgressRing.style.strokeDashoffset = offset.toString();
        }

        if (progress >= 1) {
          // Success: Held for full 1.5 seconds!
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          this.exitStealth();
        } else {
          this.holdAnimFrame = requestAnimationFrame(step);
        }
      };

      this.holdAnimFrame = requestAnimationFrame(step);
    }

    /**
     * Initialize device shake gesture (> 18 delta)
     */
    initShakeListener() {
      if (typeof window === 'undefined') return;

      window.addEventListener('devicemotion', (event) => {
        // Only trigger shake if Shield is active and not already in stealth
        const isShieldOn = window.MediaEngine ? window.MediaEngine.isShieldActive() : false;
        if (!isShieldOn || this.isStealth) return;

        const acc = event.accelerationIncludingGravity || event.acceleration;
        if (!acc) return;

        const now = Date.now();
        if (now - this.lastShakeTime < 1200) return; // Debounce shake triggers

        const dx = (acc.x || 0) - this.lastAcc.x;
        const dy = (acc.y || 0) - this.lastAcc.y;
        const dz = (acc.z || 0) - this.lastAcc.z;
        const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

        this.lastAcc = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };

        if (delta > this.shakeThreshold) {
          this.lastShakeTime = now;
          this.enterStealth();
        }
      }, { passive: true });
    }

    /**
     * Keyboard shortcut Alt+S to toggle stealth
     */
    initKeyboardShortcut() {
      if (typeof window === 'undefined') return;

      window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          this.toggleStealth();
        }
      });
    }

    /**
     * Handle visibility change to re-acquire wake lock if needed
     */
    initVisibilityHandler() {
      if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;

      document.addEventListener('visibilitychange', async () => {
        if (this.isStealth && document.visibilityState === 'visible') {
          await this.acquireWakeLock();
        }
      });
    }

    /**
     * Acquire Screen WakeLock
     */
    async acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLockSentinel = await navigator.wakeLock.request('screen');
          this.wakeLockSentinel.addEventListener('release', () => {
            this.wakeLockSentinel = null;
          });
        } catch (err) {
          console.warn('[StealthEngine] WakeLock notice:', err.message);
        }
      }
    }

    /**
     * Release Screen WakeLock
     */
    async releaseWakeLock() {
      if (this.wakeLockSentinel) {
        try {
          await this.wakeLockSentinel.release();
        } catch (e) {
          // ignore
        }
        this.wakeLockSentinel = null;
      }
    }

    /**
     * Update OLED Dim Clock
     */
    updateClock() {
      if (!this.overlayElement) return;

      const timeEl = this.overlayElement.querySelector('#stealth-clock-text') || this.overlayElement.querySelector('#cs-stealth-time');
      const dateEl = this.overlayElement.querySelector('#stealth-date-text') || this.overlayElement.querySelector('#cs-stealth-date');
      const now = new Date();

      if (timeEl) {
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}`;
      }

      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
      }
    }

    /**
     * Enter Stealth OLED Blackout Mode
     */
    async enterStealth() {
      if (this.isStealth) return;

      this.isStealth = true;

      if (this.overlayElement) {
        if (this.overlayElement.classList) {
          this.overlayElement.classList.add('active');
        }
        this.overlayElement.style.display = 'flex';
      }

      this.updateClock();
      clearInterval(this.clockTimerId);
      this.clockTimerId = setInterval(() => this.updateClock(), 1000);

      // Acquire wake lock
      await this.acquireWakeLock();

      this.emit('stealthChange', true);
    }

    /**
     * Exit Stealth Mode and restore normal CitizenShield interface
     */
    async exitStealth() {
      if (!this.isStealth) return;

      this.isStealth = false;
      clearInterval(this.clockTimerId);

      if (this.overlayElement) {
        if (this.overlayElement.classList) {
          this.overlayElement.classList.remove('active');
        }
        this.overlayElement.style.display = 'none';
      }

      await this.releaseWakeLock();

      this.emit('stealthChange', false);
    }

    /**
     * Toggle Stealth Mode
     */
    toggleStealth() {
      if (this.isStealth) {
        this.exitStealth();
      } else {
        this.enterStealth();
      }
    }

    /**
     * Check if stealth is currently active
     */
    isStealthActive() {
      return this.isStealth;
    }
  }

  // Export singleton and class
  const instance = new StealthEngineClass();
  window.StealthEngineClass = StealthEngineClass;
  window.StealthEngine = instance;

})(typeof window !== 'undefined' ? window : this);
