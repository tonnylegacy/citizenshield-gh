/**
 * CitizenShield Ghana — Main Application Shell Controller
 * File: js/app.js
 * 
 * Aesthetic: Anti-Bloat Swiss Legal Instrument meets Tactical Civic Field Manual
 * Orchestrates:
 * - Tab switching & view states
 * - Master Shield recording deck (Audio Stealth / Secret Video / Open Viewfinder)
 * - Telemetry strip (Timer, GPS, SHA-256 chain hash ticker, dynamic threat meter)
 * - Legal Copilot integration & Active Legal Card de-escalation advice
 * - Pinned Officer Verbal Watermark chips
 * - Speech recognition & 8-scenario instant simulator
 * - Ghana Laws & Rights Compendium search & expandable statutory cards
 * - Encrypted Evidence Vault browsing, dossier export & PPSB WhatsApp dispatch
 * - Emergency contacts management & 5-second Auto-SOS modal
 * - Stealth OLED Blackout Screen synchronization
 */

(function () {
  'use strict';

  // ========================================================================
  // 1. APPLICATION STATE & GLOBALS
  // ========================================================================
  const AppState = {
    activeTab: 'view-shield',
    shieldActive: false,
    sessionSeconds: 0,
    sessionTimerId: null,
    tipRotationTimerId: null,
    lawsCategory: 'all',
    lawsSearchQuery: '',
    pinnedBadges: [],
    proSubscribed: false
  };

  // Rotating tactical tips for Ghana civic encounters
  const TACTICAL_TIPS = [
    'Spot the officer\'s badge? Say aloud: "Okay Sergeant Mensah, Service Number 44821" to timestamp it into court evidence.',
    'Under Art. 18(2) of the 1992 Constitution, your smartphone is private correspondence. Refuse passcode entry without a court warrant.',
    'Section 89 of Act 30 prohibits arbitrary key snatching. Police cannot confiscate your car keys at routine traffic checkpoints.',
    'Cash spot-fines are illegal in Ghana. All traffic fines must be assessed by a court magistrate or via official DVLA summons.',
    'Under Act 30 Section 7, female citizens can ONLY be physically searched by a female police officer with strict decency.',
    'You have a constitutional right to remain silent under Art. 19(10). Refuse caution statement signatures until your lawyer arrives.',
    'Citizens have the constitutional right under Art. 21(1)(f) to record public police duties in open public spaces.'
  ];

  // Fallback Ghanaian Laws if external dataset is still initializing
  const FALLBACK_LAWS = [
    {
      id: 'phone-privacy-art18',
      category: 'searches',
      title: 'Digital Privacy & Phone Search Prohibition',
      statute: '1992 Constitution of Ghana, Art. 18(2) & Cybersecurity Act 2020 (Act 1038) Sec. 89',
      caseLaw: 'Edmund Addo v. Inspector General of Police (High Court Ghana, 2021)',
      summary: 'Law enforcement officers have NO statutory right to demand access to, search, browse, or seize your mobile phone, laptop, or private electronic messages during traffic or pedestrian stops without a judicial search warrant.',
      citizenRights: [
        'You have the legal right to refuse unlocking your phone, typing your PIN, or providing biometric access.',
        'An officer cannot threaten you with arrest or obstruction of justice for protecting your constitutional privacy.'
      ],
      officerLimits: [
        'Officers cannot browse your WhatsApp, gallery, or bank apps.',
        'Officers cannot demand or seize your phone without a warrant signed by a Magistrate or High Court judge.'
      ],
      sayThis: 'Officer, good day. Under Article 18(2) of the 1992 Constitution and Section 89 of the Cybersecurity Act, my phone is protected private correspondence. I do not consent to an arbitrary phone search without a judicial court warrant.',
      earbudWhisper: 'Do not unlock your phone. Article 18(2) protects private correspondence. Insist calmly on a judicial warrant.'
    },
    {
      id: 'car-keys-impound-act30',
      category: 'traffic',
      title: 'Car Key Confiscation & Unlawful Impoundment',
      statute: 'Criminal Procedure Code, 1960 (Act 30) Sec. 89 & Road Traffic Act, 2004 (Act 683)',
      caseLaw: 'Ghana Police Service Standing Orders & C.I. 76 Regulations',
      summary: 'Police officers are NOT permitted to reach into your vehicle, snatch or seize ignition keys, or force you out of your car without formal impoundment documentation under Act 30.',
      citizenRights: [
        'You retain custody of your car keys at all times.',
        'If a vehicle is lawfully impounded, you have the right to personally drive it to the designated police station under escort.'
      ],
      officerLimits: [
        'Officers cannot reach into your car window to turn off the engine or take keys.',
        'Officers cannot abandon your vehicle on the highway.'
      ],
      sayThis: 'Officer, respectfully, under Act 30 Section 89, you are not authorized to confiscate my vehicle ignition keys. If my vehicle is being impounded, please issue the formal notice and I will personally drive it to the police station under your escort.',
      earbudWhisper: 'Keep your keys. Officers cannot seize vehicle keys. Offer to drive vehicle to the station if officially impounded.'
    },
    {
      id: 'cash-spot-fines-extortion',
      category: 'extortion',
      title: 'Prohibition of Cash Spot-Fines & Roadside Extortion',
      statute: 'Criminal Offences Act, 1960 (Act 29) Sec. 239–247 & Road Traffic Regulations 2012 (L.I. 2180)',
      caseLaw: 'Police Professional Standards Bureau (PPSB) Anti-Extortion Directives',
      summary: 'Roadside MTTD or general police officers have NO legal authority to assess or collect cash fines on the spot. All traffic fines must be levied by a court magistrate or via official DVLA billing.',
      citizenRights: [
        'You have the absolute right to refuse paying cash directly to any police officer.',
        'You have the right to request an official court charge sheet or traffic summons to appear before a Magistrate.'
      ],
      officerLimits: [
        'Officers cannot demand cash, Mobile Money (MoMo), or informal settlement.',
        'Demanding cash under threat of detention constitutes extortion under Section 239 of Act 29.'
      ],
      sayThis: 'Officer, Ghanaian law does not recognize cash spot-fines on the road. If I have committed a traffic infraction, please issue me a formal traffic summons to appear before the court. I will not pay cash or MoMo at this checkpoint.',
      earbudWhisper: 'Never pay cash on the road. Cash spot-fines are illegal extortion. Insist on a court summons.'
    },
    {
      id: 'license-24-hour-grace',
      category: 'traffic',
      title: 'Driver\'s License 24-Hour Production Grace Period',
      statute: 'Road Traffic Regulations, 2012 (L.I. 2180) Regulation 47 & Road Traffic Act, 2004 (Act 683)',
      caseLaw: 'Republic v. Driver License Enforcement Standards (Ghana Law Reports)',
      summary: 'If you do not have your physical driver\'s license on you, you are NOT automatically guilty of a crime and cannot be summarily arrested. The law grants you 24 hours to present it at any police station.',
      citizenRights: [
        'You have 24 hours to produce your valid driver\'s license at any police station of your choice.',
        'Digital DVLA app or verifiable photo proof must be provisionally accepted for identity verification.'
      ],
      officerLimits: [
        'Officers cannot arrest or impound your vehicle solely for failing to produce a physical license on the spot.'
      ],
      sayThis: 'Officer, under Regulation 47 of L.I. 2180, I have a statutory 24-hour grace period to produce my driver\'s license at a police station. Here is my digital DVLA confirmation in the meantime.',
      earbudWhisper: 'Regulation 47 gives you 24 hours to produce your license at any station. They cannot arrest you solely for this.'
    },
    {
      id: 'female-body-search-act30',
      category: 'women',
      title: 'Mandatory Female-Only Body Search Protocol',
      statute: 'Criminal Procedure Code, 1960 (Act 30) Section 7',
      caseLaw: 'Article 15(1) & (2) Human Dignity Inviolability Precedent',
      summary: 'A female citizen can ONLY be physically searched by a female police officer. Male officers are strictly barred by statutory law from conducting physical body searches on female citizens.',
      citizenRights: [
        'Female citizens have the absolute right to refuse any physical search conducted by a male officer.',
        'The search must be conducted with strict regard to decency and out of public view if thorough.'
      ],
      officerLimits: [
        'Male officers cannot touch, pat down, or search the person of a female citizen.',
        'Violation constitutes an assault and unlawful degradation of human dignity.'
      ],
      sayThis: 'Officer, under Section 7 of Act 30, a female citizen can only be searched by a female officer with strict decency. As a male officer, you are legally prohibited from touching me. I will wait for a female officer.',
      earbudWhisper: 'Section 7 of Act 30 strictly prohibits male officers from searching females. Demand a female officer immediately.'
    },
    {
      id: 'arrest-48-hour-rule',
      category: 'arrests',
      title: 'Mandatory Reason for Arrest & 48-Hour Detention Limit',
      statute: '1992 Constitution of Ghana, Article 14(2) & 14(3)',
      caseLaw: 'Martin Kpebu v. Attorney-General (Supreme Court of Ghana, 2016)',
      summary: 'Any person arrested or detained must be informed IMMEDIATELY of the reason for arrest, permitted access to a lawyer, and brought before a court of competent jurisdiction within 48 hours.',
      citizenRights: [
        'Immediate statement of reasons for arrest in a language you understand.',
        'Immediate access to your lawyer and family members.',
        'Mandatory release on bail or presentation before a court within 48 hours.'
      ],
      officerLimits: [
        'Officers cannot hold any citizen beyond 48 hours without a judicial remand order.',
        'Officers cannot deny immediate telephone access to your legal counsel.'
      ],
      sayThis: 'Officer, under Article 14(2) of the 1992 Constitution, please state immediately the specific lawful charge for this arrest. I am exercising my constitutional right to consult my lawyer before making any statement.',
      earbudWhisper: 'Article 14 mandates immediate reasons for arrest and lawyer access. Max 48 hours detention. Remain silent.'
    }
  ];

  // ========================================================================
  // 2. DOM ELEMENT REFERENCES
  // ========================================================================
  const DOM = {
    // Header
    btnTriggerStealth: document.getElementById('btn-trigger-stealth'),
    btnTriggerSos: document.getElementById('btn-trigger-sos'),
    headerDbIndicator: document.getElementById('header-db-indicator'),
    headerDbStatus: document.getElementById('header-db-status'),

    // Bottom Navigation
    navBtns: document.querySelectorAll('.bottom-nav .nav-item'),
    viewPanes: document.querySelectorAll('.view-pane'),

    // Tab 1: Shield Copilot
    shieldDeckContainer: document.getElementById('shield-deck-container'),
    shieldStatusDot: document.getElementById('shield-status-dot'),
    shieldStatusText: document.getElementById('shield-status-text'),
    shieldModeLabel: document.getElementById('shield-mode-label'),
    videoPreviewBox: document.getElementById('video-preview-box'),
    videoElement: document.getElementById('video-element'),
    btnShieldMaster: document.getElementById('btn-shield-master'),
    btnShieldMasterText: document.getElementById('btn-shield-master-text'),
    modeRadios: document.querySelectorAll('input[name="recording-mode"]'),
    toggleEarbudWhisper: document.getElementById('toggle-earbud-whisper'),
    toggleStealthBlackout: document.getElementById('toggle-stealth-blackout'),

    // Telemetry Strip
    threatBadge: document.getElementById('threat-badge'),
    threatBadgeText: document.getElementById('threat-badge-text'),
    sessionTimer: document.getElementById('session-timer'),
    threatMeterFill: document.getElementById('threat-meter-fill'),
    gpsDisplay: document.getElementById('gps-display'),
    gpsCoords: document.getElementById('gps-coords'),
    chainHashTicker: document.getElementById('chain-hash-ticker'),

    // Watermark Banner & Pinned Chips
    watermarkTipText: document.getElementById('watermark-tip-text'),
    pinnedCountLabel: document.getElementById('pinned-count-label'),
    pinnedChipsContainer: document.getElementById('pinned-chips-container'),
    emptyChipsMsg: document.getElementById('empty-chips-msg'),
    formPinBadge: document.getElementById('form-pin-badge'),
    inputPinBadge: document.getElementById('input-pin-badge'),

    // Active Legal Card
    activeLegalCard: document.getElementById('active-legal-card'),
    legalCardStatute: document.getElementById('legal-card-statute'),
    legalCardAuthority: document.getElementById('legal-card-authority'),
    legalCardRight: document.getElementById('legal-card-right'),
    legalCardScript: document.getElementById('legal-card-script'),
    legalCardBoundary: document.getElementById('legal-card-boundary'),
    btnWhisperActiveScript: document.getElementById('btn-whisper-active-script'),

    // Transcript & Simulator
    transcriptFeed: document.getElementById('transcript-feed'),
    scenarioChips: document.querySelectorAll('.btn-scenario-chip'),
    formCustomSim: document.getElementById('form-custom-sim'),
    inputCustomSim: document.getElementById('input-custom-sim'),

    // Tab 2: Ghana Laws
    lawsSearchBox: document.getElementById('laws-search-box'),
    btnClearLawsSearch: document.getElementById('btn-clear-laws-search'),
    lawsFilterPills: document.querySelectorAll('#laws-filter-pills .pill-filter'),
    statutoryCardsContainer: document.getElementById('statutory-cards-container'),

    // Tab 3: Evidence Vault
    vaultStatCount: document.getElementById('vault-stat-count'),
    vaultStatSize: document.getElementById('vault-stat-size'),
    vaultStatBadges: document.getElementById('vault-stat-badges'),
    btnRefreshVault: document.getElementById('btn-refresh-vault'),
    vaultEmptyState: document.getElementById('vault-empty-state'),
    vaultRecordsList: document.getElementById('vault-records-list'),

    // Tab 4: Contacts & Pro
    formEmergencyContacts: document.getElementById('form-emergency-contacts'),
    contact1Name: document.getElementById('contact1-name'),
    contact1Phone: document.getElementById('contact1-phone'),
    contact2Name: document.getElementById('contact2-name'),
    contact2Phone: document.getElementById('contact2-phone'),
    lawyerName: document.getElementById('lawyer-name'),
    lawyerPhone: document.getElementById('lawyer-phone'),
    contactsStatusBadge: document.getElementById('contacts-status-badge'),
    btnLoadDemoContacts: document.getElementById('btn-load-demo-contacts'),
    toggleAutoSos: document.getElementById('toggle-auto-sos'),
    toggleShakeStealth: document.getElementById('toggle-shake-stealth'),
    btnOpenProModal: document.getElementById('btn-open-pro-modal'),

    // Modals
    modalOnboarding: document.getElementById('modal-onboarding'),
    formOnboardingContacts: document.getElementById('form-onboarding-contacts'),
    onboardName1: document.getElementById('onboard-name1'),
    onboardPhone1: document.getElementById('onboard-phone1'),
    onboardName2: document.getElementById('onboard-name2'),
    onboardPhone2: document.getElementById('onboard-phone2'),
    btnCloseOnboarding: document.getElementById('btn-close-onboarding'),

    modalSosCountdown: document.getElementById('modal-sos-countdown'),
    sosCountdownView: document.getElementById('sos-countdown-view'),
    sosCountdownTimer: document.getElementById('sos-countdown-timer'),
    btnCancelSos: document.getElementById('btn-cancel-sos'),
    btnAbortSosX: document.getElementById('btn-abort-sos-x'),
    btnDispatchSosNow: document.getElementById('btn-dispatch-sos-now'),
    sosDispatchedView: document.getElementById('sos-dispatched-view'),
    sosDispatchedDetails: document.getElementById('sos-dispatched-details'),
    sosWhatsappLink: document.getElementById('sos-whatsapp-link'),
    btnDismissDispatchedSos: document.getElementById('btn-dismiss-dispatched-sos'),

    modalPro: document.getElementById('modal-pro'),
    btnClosePro: document.getElementById('btn-close-pro'),
    btnMomoUpgrade: document.getElementById('btn-momo-upgrade'),

    // Stealth Screen Overlay
    stealthOverlay: document.getElementById('stealth-overlay'),
    stealthClockText: document.getElementById('stealth-clock-text'),
    stealthDateText: document.getElementById('stealth-date-text'),
    stealthUnlockTrigger: document.getElementById('stealth-unlock-trigger'),
    stealthProgressCircle: document.getElementById('stealth-progress-circle'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // 3D Orb reactive state
  const OrbState = {
    armed: false,
    threatState: 'SAFE',
    voicePulse: 0,
    rotX: 0.25,
    rotY: 0.4,
    velX: 0.0015,
    velY: 0.0045,
    isDragging: false,
    dragMoved: false,
    lastX: 0,
    lastY: 0
  };

  // Crisp inline SVG helper icons
  const SVG_ICONS = {
    shield: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    warning: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    critical: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    badge: '<svg class="mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="3"/></svg>',
    audio: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
  };

  // ========================================================================
  // 3. TOAST NOTIFICATION UTILITY
  // ========================================================================
  function showToast(message, type = 'safe', duration = 3200) {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `tactical-toast toast-${type}`;
    
    let iconSvg = SVG_ICONS.shield;
    if (type === 'warning') iconSvg = SVG_ICONS.warning;
    if (type === 'critical') iconSvg = SVG_ICONS.critical;

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="color:var(--champagne-gold); display:flex;">${iconSvg}</span>
        <span>${message}</span>
      </div>
      <button style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; font-size:12px;">✕</button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => toast.remove());

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 200);
      }
    }, duration);
  }

  // ========================================================================
  // 4. TAB NAVIGATION & VIEW ROUTING
  // ========================================================================
  function switchTab(targetTabId) {
    AppState.activeTab = targetTabId;

    // Update bottom navigation buttons
    DOM.navBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', isTarget);
    });

    // Update view panes
    DOM.viewPanes.forEach(pane => {
      const isTarget = pane.id === targetTabId;
      pane.classList.toggle('active', isTarget);
    });

    // Contextual refresh actions
    if (targetTabId === 'view-vault') {
      renderVault();
    } else if (targetTabId === 'view-laws') {
      renderLaws();
    } else if (targetTabId === 'view-contacts') {
      loadContactsIntoForm();
    }
  }

  function initNavigation() {
    DOM.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) {
          switchTab(targetTab);
        }
      });
    });
  }

  // ========================================================================
  // 5. MASTER SHIELD CONTROLLER (START / STOP / SENSORS)
  // ========================================================================
  function getSelectedRecordingMode() {
    let selectedMode = 'audio';
    DOM.modeRadios.forEach(radio => {
      if (radio.checked) {
        selectedMode = radio.value;
      }
    });

    if (selectedMode === 'secret-video') return 'video-stealth';
    if (selectedMode === 'open-video') return 'video-open';
    return 'audio-stealth';
  }

  function updateModeLabel() {
    const rawValue = document.querySelector('input[name="recording-mode"]:checked')?.value || 'audio';
    
    // Update label classes
    document.querySelectorAll('.mode-radio-label').forEach(label => {
      const radio = label.querySelector('input');
      label.classList.toggle('selected', radio && radio.checked);
    });

    let displayStr = 'Stealth Audio';
    if (rawValue === 'secret-video') displayStr = 'Discrete Video (No Flash)';
    if (rawValue === 'open-video') displayStr = 'Open Viewfinder';
    
    if (DOM.shieldModeLabel) {
      DOM.shieldModeLabel.textContent = displayStr;
    }

    // Toggle video viewfinder box
    if (DOM.videoPreviewBox) {
      const isOpen = rawValue === 'open-video';
      DOM.videoPreviewBox.classList.toggle('visible', isOpen);
      if (isOpen && window.MediaEngine && DOM.videoElement) {
        window.MediaEngine.attachVideoPreview(DOM.videoElement);
      }
    }
  }

  async function activateShield() {
    const mode = getSelectedRecordingMode();
    AppState.shieldActive = true;
    AppState.sessionSeconds = 0;
    OrbState.armed = true;
    OrbState.voicePulse = 0.85;

    // Update UI Deck state
    DOM.shieldDeckContainer?.classList.add('shield-active');
    DOM.btnShieldMaster?.classList.add('recording');
    if (DOM.btnShieldMasterText) {
      DOM.btnShieldMasterText.textContent = 'Shield Active • Tap to Seal Vault';
    }
    if (DOM.shieldStatusText) {
      DOM.shieldStatusText.textContent = 'Listening & Encrypting Evidence';
    }
    const hintEl = document.querySelector('.orb-tap-hint');
    if (hintEl) hintEl.textContent = '3D Acoustic Guard Active';

    // Start timer
    clearInterval(AppState.sessionTimerId);
    DOM.sessionTimer.textContent = '00:00';
    AppState.sessionTimerId = setInterval(() => {
      AppState.sessionSeconds++;
      const m = Math.floor(AppState.sessionSeconds / 60).toString().padStart(2, '0');
      const s = (AppState.sessionSeconds % 60).toString().padStart(2, '0');
      if (DOM.sessionTimer) {
        DOM.sessionTimer.textContent = `${m}:${s}`;
      }
    }, 1000);

    // Call Media Engine
    if (window.MediaEngine) {
      if (DOM.videoElement && mode === 'video-open') {
        window.MediaEngine.attachVideoPreview(DOM.videoElement);
      }
      await window.MediaEngine.startShield(mode);
    } else if (window.EvidenceVault) {
      await window.EvidenceVault.startSession(mode);
    }

    appendTranscriptLine('System', `Pocket Counsel armed (${mode}). Continuous SHA-256 chain initiated.`, 'speaker-system');
    showToast('Pocket Counsel Armed • Continuous 5s Cryptographic Recording', 'safe');
  }

  async function deactivateShield() {
    AppState.shieldActive = false;
    OrbState.armed = false;

    // Reset UI Deck state
    DOM.shieldDeckContainer?.classList.remove('shield-active');
    DOM.btnShieldMaster?.classList.remove('recording');
    if (DOM.btnShieldMasterText) {
      DOM.btnShieldMasterText.textContent = 'Activate Pocket Counsel';
    }
    if (DOM.shieldStatusText) {
      DOM.shieldStatusText.textContent = 'Standby • Ready to Protect';
    }
    const hintEl = document.querySelector('.orb-tap-hint');
    if (hintEl) hintEl.textContent = 'Tap Sphere to Arm';

    clearInterval(AppState.sessionTimerId);

    // Stop Media Engine & Finalize Vault
    if (window.MediaEngine) {
      await window.MediaEngine.stopShield();
    } else if (window.EvidenceVault) {
      await window.EvidenceVault.endSession();
    }

    // Reset Threat Meter
    updateThreatUI(0, 'SAFE');

    appendTranscriptLine('System', 'Encounter ended. Dossier sealed in local cryptographic vault.', 'speaker-system');
    showToast('Session Sealed • Court Dossier Ready in Evidence Vault', 'safe');

    // Auto-refresh vault stats if on vault tab
    if (AppState.activeTab === 'view-vault') {
      renderVault();
    }
  }

  function initShieldDeck() {
    // Master trigger button
    DOM.btnShieldMaster?.addEventListener('click', async () => {
      if (AppState.shieldActive) {
        await deactivateShield();
      } else {
        await activateShield();
      }
    });

    // Recording mode radios
    DOM.modeRadios.forEach(radio => {
      radio.addEventListener('change', updateModeLabel);
    });
    updateModeLabel();

    // Earbud Whisper switch
    DOM.toggleEarbudWhisper?.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      if (window.MediaEngine) {
        window.MediaEngine.setEarbudMode(isEnabled);
      }
      showToast(`Earbud Whisper Coaching: ${isEnabled ? 'Active' : 'Muted'}`, 'safe');
    });

    // Stealth Blackout switch
    DOM.toggleStealthBlackout?.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      if (window.StealthEngine) {
        if (isEnabled) {
          window.StealthEngine.enterStealth();
        } else {
          window.StealthEngine.exitStealth();
        }
      } else {
        toggleFallbackStealth();
      }
    });

    // Top Header Quick Stealth
    DOM.btnTriggerStealth?.addEventListener('click', () => {
      if (window.StealthEngine) {
        window.StealthEngine.toggleStealth();
      } else {
        toggleFallbackStealth();
      }
    });

    // Top Header Quick SOS
    DOM.btnTriggerSos?.addEventListener('click', () => {
      if (window.SOSDispatcher) {
        window.SOSDispatcher.triggerSOS(true, 'Manual Top Header Trigger');
      } else {
        openSosCountdownModal(5);
      }
    });
  }

  // ========================================================================
  // 6. TELEMETRY, THREAT METER & SHA-256 INTEGRITY
  // ========================================================================
  function updateThreatUI(score, state) {
    const s = Math.max(0, Math.min(100, score || 0));
    const st = state || 'SAFE';
    OrbState.threatState = st;
    OrbState.voicePulse = Math.max(OrbState.voicePulse, s / 100);

    if (DOM.threatMeterFill) {
      DOM.threatMeterFill.style.width = `${Math.max(8, s)}%`;
      DOM.threatMeterFill.classList.toggle('elevated', st === 'ELEVATED');
      DOM.threatMeterFill.classList.toggle('critical', st === 'CRITICAL');
    }

    if (DOM.threatBadge) {
      DOM.threatBadge.className = `threat-badge threat-${st.toLowerCase()}`;
    }

    if (DOM.threatBadgeText) {
      let label = s > 0 ? `Calm (${s}%)` : 'Calm Encounter';
      if (st === 'ELEVATED') label = `Elevated Caution (${s}%)`;
      if (st === 'CRITICAL') label = `Critical Threat (${s}%)`;
      DOM.threatBadgeText.textContent = label;
    }

    if (DOM.activeLegalCard) {
      DOM.activeLegalCard.classList.remove('status-safe', 'status-warning', 'status-critical');
      if (st === 'SAFE') DOM.activeLegalCard.classList.add('status-safe');
      if (st === 'ELEVATED') DOM.activeLegalCard.classList.add('status-warning');
      if (st === 'CRITICAL') DOM.activeLegalCard.classList.add('status-critical');
    }
  }

  function initTelemetryListeners() {
    // Listen for Copilot Threat Updates
    if (window.LegalCopilotEngine) {
      window.LegalCopilotEngine.on('threatUpdate', (data) => {
        updateThreatUI(data.threatScore, data.threatState);
        if (data.matchedLaws && data.matchedLaws.length > 0) {
          updateActiveLegalCardFromPrompt(data.matchedLaws[0]);
        }
      });

      window.LegalCopilotEngine.on('promptUpdate', (prompt) => {
        updateActiveLegalCardFromPrompt(prompt);
      });

      window.LegalCopilotEngine.on('watermark', (watermark) => {
        addOfficerBadgeChip(watermark.identifier || watermark.rawText || `${watermark.rankOrType} ${watermark.identifier}`);
      });
    }

    // Listen for Evidence Vault GPS & Hash Updates
    if (window.EvidenceVault) {
      window.EvidenceVault.on('hashUpdated', (data) => {
        if (DOM.chainHashTicker && data.cumulativeHash) {
          const h = data.cumulativeHash;
          const short = `${h.substring(0, 8)}...${h.substring(h.length - 4)}`;
          DOM.chainHashTicker.textContent = `SHA-256: ${short} • BLK #${data.chunkIndex || 1}`;
        }
      });

      window.EvidenceVault.on('gpsUpdated', (gps) => {
        if (DOM.gpsCoords && gps) {
          DOM.gpsCoords.textContent = `${gps.latitude.toFixed(4)}° N, ${Math.abs(gps.longitude).toFixed(4)}° W • ${gps.locationName || 'Accra, GH'}`;
        }
      });
    }

    // Rotating tactical tips banner
    let tipIdx = 0;
    DOM.watermarkTipText.innerHTML = `<strong>Verbal Watermarking Tip:</strong> ${TACTICAL_TIPS[0]}`;
    AppState.tipRotationTimerId = setInterval(() => {
      tipIdx = (tipIdx + 1) % TACTICAL_TIPS.length;
      if (DOM.watermarkTipText) {
        DOM.watermarkTipText.innerHTML = `<strong>Verbal Watermarking Tip:</strong> ${TACTICAL_TIPS[tipIdx]}`;
      }
    }, 14000);
  }

  // ========================================================================
  // 7. PINNED OFFICER WATERMARK EVIDENCE CHIPS
  // ========================================================================
  function renderPinnedChips() {
    if (!DOM.pinnedChipsContainer) return;

    if (AppState.pinnedBadges.length === 0) {
      DOM.pinnedChipsContainer.innerHTML = `
        <span class="empty-chips-placeholder" id="empty-chips-msg">No officer badges logged in this session yet.</span>
      `;
      if (DOM.pinnedCountLabel) DOM.pinnedCountLabel.textContent = '0 Logged';
      return;
    }

    if (DOM.pinnedCountLabel) {
      DOM.pinnedCountLabel.textContent = `${AppState.pinnedBadges.length} Logged`;
    }

    DOM.pinnedChipsContainer.innerHTML = '';
    AppState.pinnedBadges.forEach((badge, index) => {
      const chip = document.createElement('div');
      chip.className = 'officer-chip';
      chip.innerHTML = `
        ${SVG_ICONS.badge}
        <span>${escapeHtml(badge)}</span>
        <button type="button" class="chip-remove" data-index="${index}" title="Remove badge evidence">✕</button>
      `;

      const removeBtn = chip.querySelector('.chip-remove');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeOfficerBadgeChip(index);
      });

      DOM.pinnedChipsContainer.appendChild(chip);
    });
  }

  function addOfficerBadgeChip(badgeText) {
    if (!badgeText) return;
    const clean = badgeText.trim();
    if (!clean) return;

    // Check duplicate
    if (AppState.pinnedBadges.includes(clean)) return;

    AppState.pinnedBadges.push(clean);
    renderPinnedChips();

    // Propagate to Vault session
    if (window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
      window.EvidenceVault.appendWatermark({
        id: `WM-USER-${Date.now()}`,
        rankOrType: 'Pinned Officer Evidence',
        identifier: clean,
        rawText: clean,
        elapsedFormatted: DOM.sessionTimer?.textContent || '00:00'
      });
    }

    showToast(`Officer Evidence Stamped: ${clean}`, 'safe');
  }

  function removeOfficerBadgeChip(index) {
    if (index >= 0 && index < AppState.pinnedBadges.length) {
      const removed = AppState.pinnedBadges.splice(index, 1);
      renderPinnedChips();
      showToast(`Removed badge: ${removed[0]}`, 'safe');
    }
  }

  function initWatermarkPins() {
    DOM.formPinBadge?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = DOM.inputPinBadge?.value || '';
      if (val.trim()) {
        addOfficerBadgeChip(val);
        DOM.inputPinBadge.value = '';
      }
    });
    renderPinnedChips();
  }

  // ========================================================================
  // 8. ACTIVE LEGAL COUNSEL CARD & DE-ESCALATION ADVICE
  // ========================================================================
  function updateActiveLegalCardFromPrompt(prompt) {
    if (!prompt) return;

    if (typeof prompt === 'string') {
      if (DOM.legalCardScript) {
        DOM.legalCardScript.textContent = `“${prompt}”`;
      }
      return;
    }

    if ((prompt.statute || prompt.source) && DOM.legalCardStatute) {
      DOM.legalCardStatute.textContent = prompt.statute || prompt.source;
    }
    if (prompt.title && DOM.legalCardAuthority) {
      DOM.legalCardAuthority.textContent = prompt.title;
    }
    if (prompt.summary && DOM.legalCardRight) {
      DOM.legalCardRight.textContent = prompt.summary;
    }
    if (prompt.sayThis && DOM.legalCardScript) {
      DOM.legalCardScript.textContent = `“${prompt.sayThis}”`;
    } else if (prompt.actionPrompt && DOM.legalCardScript) {
      DOM.legalCardScript.textContent = `“${prompt.actionPrompt}”`;
    }
    if (prompt.boundary && DOM.legalCardBoundary) {
      DOM.legalCardBoundary.textContent = prompt.boundary;
    }
  }

  function initLegalCardWhisper() {
    const calmQuoteBox = document.getElementById('calm-quote-box');
    const voiceBadge = document.getElementById('neural-voice-badge');
    const voiceStatusText = document.getElementById('neural-voice-status-text');
    const whisperLabel = document.getElementById('btn-whisper-label');
    const personaPills = document.querySelectorAll('#voice-persona-pills .voice-pill');
    const quickSituationPills = document.querySelectorAll('#quick-situation-pills .situation-pill');

    const personaLabels = {
      ezinne: 'Ezinne • Natural West African',
      abeo: 'Abeo • Natural West African',
      sonia: 'Sonia • British Barrister'
    };

    // Sync initial active persona pill
    if (window.MediaEngine) {
      const currentPersona = window.MediaEngine.getVoicePersona();
      personaPills.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-voice-persona') === currentPersona);
      });

      window.MediaEngine.on('speechStart', (info) => {
        OrbState.voicePulse = 0.95;
        calmQuoteBox?.classList.add('is-speaking');
        voiceBadge?.classList.add('speaking');
        DOM.btnWhisperActiveScript?.classList.add('speaking');
        if (whisperLabel) whisperLabel.textContent = 'Stop Voice';
        if (voiceStatusText) {
          voiceStatusText.textContent = info.engine === 'neural'
            ? `Speaking (${personaLabels[info.persona] || 'Neural'})`
            : 'Speaking (Offline Voice)';
        }
      });

      window.MediaEngine.on('speechEnd', () => {
        calmQuoteBox?.classList.remove('is-speaking');
        voiceBadge?.classList.remove('speaking');
        DOM.btnWhisperActiveScript?.classList.remove('speaking');
        if (whisperLabel) whisperLabel.textContent = 'Speak Naturally';
        if (voiceStatusText) voiceStatusText.textContent = 'Natural Human Voice';
      });
    }

    // Voice Persona Selector Pills
    personaPills.forEach(btn => {
      btn.addEventListener('click', () => {
        const persona = btn.getAttribute('data-voice-persona') || 'ezinne';
        personaPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (window.MediaEngine) {
          window.MediaEngine.setVoicePersona(persona);
        }
        showToast(`Counsel Voice: ${personaLabels[persona] || persona}`, 'safe');

        // Immediately speak a brief confirmation or current script if user clicked a voice
        const scriptText = DOM.legalCardScript?.textContent?.replace(/^[“"\s]+|[”"\s]+$/g, '') || '';
        if (scriptText && window.MediaEngine) {
          window.MediaEngine.whisper(scriptText, true);
        }
      });
    });

    // Instant 1-Tap Situation Switcher Pills at top of Legal Card
    quickSituationPills.forEach(pill => {
      pill.addEventListener('click', () => {
        quickSituationPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const utterance = pill.getAttribute('data-quick-utterance');
        if (utterance) {
          handleSimulatedTranscript(utterance, 'Officer');
        }
      });
    });

    // Speak / Stop Button
    DOM.btnWhisperActiveScript?.addEventListener('click', () => {
      if (window.MediaEngine && window.MediaEngine.isSpeaking) {
        window.MediaEngine.stopSpeech();
        return;
      }
      const scriptText = DOM.legalCardScript?.textContent?.replace(/^[“"\s]+|[”"\s]+$/g, '') || '';
      if (scriptText) {
        OrbState.voicePulse = 0.95;
        if (window.MediaEngine) {
          window.MediaEngine.whisper(scriptText, true);
        } else if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(scriptText);
          u.rate = 1.0;
          window.speechSynthesis.speak(u);
        }
      }
    });
  }

  // ========================================================================
  // 9. LIVE TRANSCRIPT STREAM & INSTANT SCENARIO SIMULATOR
  // ========================================================================
  function appendTranscriptLine(speaker, text, speakerClass = 'speaker-officer') {
    if (!DOM.transcriptFeed) return;

    const line = document.createElement('div');
    line.className = `transcript-line ${speakerClass}`;
    
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);

    line.innerHTML = `<span class="transcript-timestamp">${timeStr} • ${speaker}</span> ${escapeHtml(text)}`;
    DOM.transcriptFeed.appendChild(line);

    // Auto-scroll
    DOM.transcriptFeed.scrollTop = DOM.transcriptFeed.scrollHeight;
  }

  function handleSimulatedTranscript(text, speaker = 'Officer') {
    if (!text) return;
    const clean = text.trim();
    OrbState.voicePulse = 1.0;

    // 1. Render in UI feed
    const speakerClass = speaker.toLowerCase() === 'officer' 
      ? 'speaker-officer' 
      : (speaker.toLowerCase() === 'citizen' ? 'speaker-citizen' : 'speaker-system');
    
    appendTranscriptLine(speaker, clean, speakerClass);

    // 2. Process through Legal Copilot
    if (window.LegalCopilotEngine) {
      const startTime = AppState.shieldActive ? (Date.now() - AppState.sessionSeconds * 1000) : Date.now();
      const gps = window.EvidenceVault ? window.EvidenceVault.getCurrentGps() : null;
      const analysis = window.LegalCopilotEngine.processTranscript(clean, speaker, startTime, gps);
      if (analysis && analysis.matchedLaws && analysis.matchedLaws.length > 0) {
        updateActiveLegalCardFromPrompt(analysis.matchedLaws[0]);
      }
    }

    // 3. Append to Active Evidence Vault Session
    if (window.EvidenceVault && window.EvidenceVault.isSessionActive()) {
      window.EvidenceVault.appendTranscript({
        id: `TX-SIM-${Date.now()}`,
        speaker: speaker,
        text: clean,
        timestamp: Date.now(),
        analysis: window.LegalCopilotEngine ? window.LegalCopilotEngine.getThreatStatus() : null
      });
    }
  }

  function initScenarioSimulator() {
    // 8 Pre-wired scenarios
    const scenarioTexts = {
      phone: {
        speaker: 'Officer',
        text: 'Unlock your phone let me check your WhatsApp and gallery right now.'
      },
      keys: {
        speaker: 'Officer',
        text: 'Give me your car keys right now, step out of the car.'
      },
      spotfine: {
        speaker: 'Officer',
        text: 'Pay 200 cedis spot fine cash here or I impound your car immediately.'
      },
      license: {
        speaker: 'Officer',
        text: 'Where is your physical driver\'s license? You cannot drive without it.'
      },
      smoking: {
        speaker: 'Officer',
        text: 'We suspect you of smoking weed. Empty your pockets and bag right now.'
      },
      dreadlocks: {
        speaker: 'Officer',
        text: 'Look at your dreadlocks and tattoos, step out for interrogation.'
      },
      watermark: {
        speaker: 'Citizen',
        text: 'Okay Sergeant Mensah, badge number 44821, I am cooperating peacefully.'
      },
      arrest: {
        speaker: 'Officer',
        text: 'You are under arrest! Give me that phone right now!'
      }
    };

    DOM.scenarioChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.getAttribute('data-scenario');
        const scenario = scenarioTexts[key];
        if (scenario) {
          handleSimulatedTranscript(scenario.text, scenario.speaker);
        }
      });
    });

    // Custom input form
    DOM.formCustomSim?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = DOM.inputCustomSim?.value || '';
      if (val.trim()) {
        handleSimulatedTranscript(val.trim(), 'Officer');
        DOM.inputCustomSim.value = '';
      }
    });

    // Wire speech recognition transcripts from MediaEngine
    if (window.MediaEngine) {
      window.MediaEngine.on('transcript', (data) => {
        if ((data.isFinal || !data.isInterim) && data.text) {
          handleSimulatedTranscript(data.text, data.speaker || 'Officer');
        }
      });
    }
  }

  // ========================================================================
  // 10. GHANA LAWS & RIGHTS COMPENDIUM (TAB 2)
  // ========================================================================
  function getLawsDatabase() {
    if (window.GHANA_LAWS_DATA && Array.isArray(window.GHANA_LAWS_DATA) && window.GHANA_LAWS_DATA.length > 0) {
      return window.GHANA_LAWS_DATA;
    }
    return FALLBACK_LAWS;
  }

  function renderLaws() {
    if (!DOM.statutoryCardsContainer) return;

    const laws = getLawsDatabase();
    const query = AppState.lawsSearchQuery.toLowerCase().trim();
    const cat = AppState.lawsCategory;

    const filtered = laws.filter(law => {
      // Category filter
      if (cat !== 'all') {
        const lawCat = (law.category || '').toLowerCase();
        if (cat === 'searches' && !lawCat.includes('search') && !lawCat.includes('digital') && !lawCat.includes('phone')) return false;
        if (cat === 'traffic' && !lawCat.includes('traffic') && !lawCat.includes('mttd') && !lawCat.includes('keys')) return false;
        if (cat === 'arrests' && !lawCat.includes('arrest') && !lawCat.includes('detention')) return false;
        if (cat === 'extortion' && !lawCat.includes('cash') && !lawCat.includes('extort') && !lawCat.includes('fine') && !lawCat.includes('bribe')) return false;
        if (cat === 'women' && !lawCat.includes('women') && !lawCat.includes('female') && !(law.id || '').includes('female') && !(law.title || '').toLowerCase().includes('female')) return false;
      }

      // Search query
      if (query) {
        const corpus = `${law.title} ${law.statute} ${law.caseLaw || ''} ${law.summary} ${(law.keywords || []).join(' ')}`.toLowerCase();
        if (!corpus.includes(query)) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      DOM.statutoryCardsContainer.innerHTML = `
        <div class="vault-empty-state">
          <div class="empty-vault-icon">${SVG_ICONS.shield}</div>
          <p>No statutory protections match "${escapeHtml(AppState.lawsSearchQuery)}".</p>
          <span>Try searching for "phone", "license", "cash", "arrest", or "search".</span>
        </div>
      `;
      return;
    }

    DOM.statutoryCardsContainer.innerHTML = '';
    filtered.forEach(law => {
      const card = document.createElement('div');
      card.className = 'statute-card';

      const citizenRightsList = (law.citizenRights || [])
        .map(r => `<li>${escapeHtml(r)}</li>`)
        .join('');

      const officerLimitsList = (law.officerLimits || [])
        .map(l => `<li>${escapeHtml(l)}</li>`)
        .join('');

      card.innerHTML = `
        <div class="statute-summary">
          <div class="statute-titles">
            <span class="statute-ref">${escapeHtml(law.statute || '1992 Constitution')}</span>
            <span class="statute-heading">${escapeHtml(law.title)}</span>
          </div>
          <span class="statute-chevron">▾</span>
        </div>

        <div class="statute-details">
          ${law.caseLaw ? `<p style="font-size:12px; color:var(--champagne-gold); font-weight:600; margin-bottom:8px;">Precedent: ${escapeHtml(law.caseLaw)}</p>` : ''}
          <p>${escapeHtml(law.summary)}</p>

          <div class="statute-key-rule">
            <strong>Protected Citizen Rights</strong>
            <ul style="margin-left:18px; margin-top:6px;">
              ${citizenRightsList}
            </ul>
          </div>

          <div style="background:rgba(239,68,68,0.08); border-left:3px solid var(--critical-crimson); padding:10px 14px; border-radius:0 8px 8px 0; margin:10px 0; color:#FCA5A5;">
            <strong>Officer Statutory Limit</strong>
            <ul style="margin-left:18px; margin-top:6px;">
              ${officerLimitsList}
            </ul>
          </div>

          ${law.sayThis ? `
            <div class="calm-quote-box" style="margin-top:14px; margin-bottom:0;">
              <div class="quote-pass-header">
                <span class="quote-eyebrow">What to Say Calmly</span>
                <button type="button" class="btn-whisper-speech btn-whisper-law-card">
                  ${SVG_ICONS.audio}
                  <span>Whisper to Earbud</span>
                </button>
              </div>
              <div class="calm-quote-text" style="font-size:20px;">“${escapeHtml(law.sayThis)}”</div>
            </div>
          ` : ''}
        </div>
      `;

      // Accordion toggle
      const summaryHeader = card.querySelector('.statute-summary');
      summaryHeader.addEventListener('click', () => {
        card.classList.toggle('expanded');
      });

      // Whisper button inside card
      const whisperBtn = card.querySelector('.btn-whisper-law-card');
      if (whisperBtn && law.sayThis) {
        whisperBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          OrbState.voicePulse = 0.85;
          if (window.MediaEngine) {
            window.MediaEngine.whisper(law.sayThis, true);
          } else if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(law.sayThis);
            window.speechSynthesis.speak(u);
          }
          showToast(`Whispering: "${law.title}"`, 'safe');
        });
      }

      DOM.statutoryCardsContainer.appendChild(card);
    });
  }

  function initLawsTab() {
    // Category pills
    DOM.lawsFilterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.lawsFilterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.lawsCategory = pill.getAttribute('data-category') || 'all';
        renderLaws();
      });
    });

    // Search input
    DOM.lawsSearchBox?.addEventListener('input', (e) => {
      AppState.lawsSearchQuery = e.target.value;
      if (DOM.btnClearLawsSearch) {
        DOM.btnClearLawsSearch.style.display = AppState.lawsSearchQuery ? 'block' : 'none';
      }
      renderLaws();
    });

    DOM.btnClearLawsSearch?.addEventListener('click', () => {
      if (DOM.lawsSearchBox) DOM.lawsSearchBox.value = '';
      AppState.lawsSearchQuery = '';
      DOM.btnClearLawsSearch.style.display = 'none';
      renderLaws();
    });

    renderLaws();
  }

  // ========================================================================
  // 11. ENCRYPTED EVIDENCE VAULT (TAB 3)
  // ========================================================================
  async function renderVault() {
    if (!DOM.vaultRecordsList) return;

    let sessions = [];
    if (window.EvidenceVault) {
      sessions = await window.EvidenceVault.getAllSessions();
    }

    // Update telemetry stats
    let totalChunks = 0;
    let totalBadges = 0;
    sessions.forEach(s => {
      totalChunks += (s.chunkCount || (s.chunks ? s.chunks.length : 0) || 0);
      totalBadges += (s.watermarks ? s.watermarks.length : 0);
    });

    const sizeMb = (totalChunks * 0.18).toFixed(1);
    if (DOM.vaultStatCount) DOM.vaultStatCount.textContent = sessions.length;
    if (DOM.vaultStatSize) DOM.vaultStatSize.textContent = `${sizeMb} MB`;
    if (DOM.vaultStatBadges) DOM.vaultStatBadges.textContent = totalBadges;

    if (sessions.length === 0) {
      if (DOM.vaultEmptyState) DOM.vaultEmptyState.style.display = 'flex';
      DOM.vaultRecordsList.innerHTML = '';
      if (DOM.vaultEmptyState) DOM.vaultRecordsList.appendChild(DOM.vaultEmptyState);
      return;
    }

    if (DOM.vaultEmptyState) DOM.vaultEmptyState.style.display = 'none';
    DOM.vaultRecordsList.innerHTML = '';

    // Render each session card (newest first)
    sessions.slice().reverse().forEach(session => {
      const card = document.createElement('article');
      card.className = 'evidence-session-card';

      const startDate = new Date(session.startTime).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      const durationSec = session.endTime 
        ? Math.round((session.endTime - session.startTime) / 1000) 
        : 0;
      const m = Math.floor(durationSec / 60).toString().padStart(2, '0');
      const s = (durationSec % 60).toString().padStart(2, '0');

      const peakThreat = session.threatScorePeak || 0;
      let threatPillClass = 'threat-safe';
      if (peakThreat >= 85) threatPillClass = 'threat-critical';
      else if (peakThreat >= 40) threatPillClass = 'threat-elevated';

      const gps = session.finalGps || session.initialGps || { latitude: 5.6037, longitude: -0.1870, locationName: 'Accra, GH' };
      const shortHash = session.cumulativeChainHash 
        ? `${session.cumulativeChainHash.substring(0, 20)}...` 
        : 'SHA-256 Sealed';

      const badgesText = (session.watermarks && session.watermarks.length > 0)
        ? session.watermarks.map(w => w.identifier || w.rawText).join(' • ')
        : 'None logged';

      card.innerHTML = `
        <div class="session-header">
          <span class="session-timestamp">${session.id} • ${startDate}</span>
          <span class="threat-badge ${threatPillClass}">Peak Intensity: ${peakThreat}%</span>
        </div>

        <div class="session-body">
          <div class="session-telemetry-row">
            <span>Duration: <strong>${m}:${s}</strong></span>
            <span>Mode: <strong>${(session.mode || 'audio').toUpperCase()}</strong></span>
            <span>GPS: <strong>${gps.latitude?.toFixed(4) || '5.6037'}° N, ${Math.abs(gps.longitude || 0.187).toFixed(4)}° W</strong></span>
          </div>

          <div style="font-size:12.5px; color:var(--text-secondary);">
            <strong>Officer Watermarks:</strong> ${escapeHtml(badgesText)}
          </div>

          <div class="session-hash-bar" title="Cryptographic SHA-256 Chain Hash">
            SHA-256 Chain: ${shortHash}
          </div>
        </div>

        <div class="session-actions-bar">
          <button type="button" class="btn-vault-action btn-dossier" data-action="dossier" data-id="${session.id}">
            Export Court Dossier
          </button>
          <a href="#" class="btn-vault-action btn-whatsapp" data-action="ppsb" data-id="${session.id}" target="_blank">
            Report to PPSB WhatsApp ↗
          </a>
          <button type="button" class="btn-vault-action btn-cloud" data-action="cloud">
            Cloud Vault Backup
          </button>
          <button type="button" class="btn-vault-action btn-delete" data-action="delete" data-id="${session.id}">
            Delete
          </button>
        </div>
      `;

      // Wire Dossier Export
      const dossierBtn = card.querySelector('[data-action="dossier"]');
      dossierBtn.addEventListener('click', async () => {
        try {
          if (window.EvidenceVault) {
            await window.EvidenceVault.exportCourtDossier(session.id);
            showToast('Court Dossier Exported Successfully', 'safe');
          }
        } catch (err) {
          showToast(`Export failed: ${err.message}`, 'critical');
        }
      });

      // Wire PPSB WhatsApp Link
      const ppsbLink = card.querySelector('[data-action="ppsb"]');
      if (window.EvidenceVault) {
        ppsbLink.href = window.EvidenceVault.generatePPSBWhatsAppLink(session);
      }

      // Wire Cloud Backup
      const cloudBtn = card.querySelector('[data-action="cloud"]');
      cloudBtn.addEventListener('click', () => {
        openProModal();
      });

      // Wire Delete
      const deleteBtn = card.querySelector('[data-action="delete"]');
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Delete evidence session ${session.id}? This action is irreversible.`)) {
          if (window.EvidenceVault) {
            await window.EvidenceVault.deleteSession(session.id);
            showToast('Session deleted from Vault', 'safe');
            renderVault();
          }
        }
      });

      DOM.vaultRecordsList.appendChild(card);
    });
  }

  function initVaultTab() {
    DOM.btnRefreshVault?.addEventListener('click', () => {
      renderVault();
      showToast('Evidence Vault Refreshed', 'safe');
    });
  }

  // ========================================================================
  // 12. EMERGENCY CONTACTS, LAWYER & PRO SCALE (TAB 4)
  // ========================================================================
  function loadContactsIntoForm() {
    let contacts = null;
    if (window.SOSDispatcher) {
      contacts = window.SOSDispatcher.getContacts();
    } else {
      try {
        contacts = JSON.parse(localStorage.getItem('citizen_shield_contacts') || 'null');
      } catch (e) {}
    }

    if (contacts) {
      if (DOM.contact1Name && contacts.primary?.name) DOM.contact1Name.value = contacts.primary.name;
      if (DOM.contact1Phone && contacts.primary?.phone) DOM.contact1Phone.value = contacts.primary.phone;
      if (DOM.contact2Name && contacts.secondary?.name) DOM.contact2Name.value = contacts.secondary.name;
      if (DOM.contact2Phone && contacts.secondary?.phone) DOM.contact2Phone.value = contacts.secondary.phone;
      if (DOM.lawyerName && contacts.lawyer?.name) DOM.lawyerName.value = contacts.lawyer.name;
      if (DOM.lawyerPhone && contacts.lawyer?.phone) DOM.lawyerPhone.value = contacts.lawyer.phone;

      if (DOM.contactsStatusBadge) {
        DOM.contactsStatusBadge.textContent = 'CONFIGURED (ACTIVE)';
        DOM.contactsStatusBadge.style.color = '#4ADE80';
      }
    }
  }

  function saveContactsFromForm() {
    const payload = {
      primary: {
        name: DOM.contact1Name?.value?.trim() || 'Primary Kin',
        phone: DOM.contact1Phone?.value?.trim() || '+233241234567',
        relation: 'Family Kin'
      },
      secondary: {
        name: DOM.contact2Name?.value?.trim() || 'Secondary Contact',
        phone: DOM.contact2Phone?.value?.trim() || '+233209876543',
        relation: 'Trusted Friend'
      },
      lawyer: {
        name: DOM.lawyerName?.value?.trim() || 'Legal Aid Commission',
        phone: DOM.lawyerPhone?.value?.trim() || '+233302669514',
        relation: 'Legal Counsel'
      },
      ppsb: {
        name: 'Police Professional Standards Bureau (PPSB)',
        phone: '+233244666999',
        relation: 'Police Oversight'
      }
    };

    if (window.SOSDispatcher) {
      window.SOSDispatcher.saveContacts(payload);
    } else {
      localStorage.setItem('citizen_shield_contacts', JSON.stringify(payload));
    }

    if (DOM.contactsStatusBadge) {
      DOM.contactsStatusBadge.textContent = 'CONFIGURED (ACTIVE)';
      DOM.contactsStatusBadge.style.color = '#4ADE80';
    }

    showToast('Emergency Contacts & Lawyer Saved', 'safe');
  }

  function initContactsTab() {
    DOM.formEmergencyContacts?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveContactsFromForm();
    });

    DOM.btnLoadDemoContacts?.addEventListener('click', () => {
      if (DOM.contact1Name) DOM.contact1Name.value = 'Kwame Adomako (Brother)';
      if (DOM.contact1Phone) DOM.contact1Phone.value = '+233 24 412 3456';
      if (DOM.contact2Name) DOM.contact2Name.value = 'Ama Serwaa (Spouse)';
      if (DOM.contact2Phone) DOM.contact2Phone.value = '+233 20 198 7654';
      if (DOM.lawyerName) DOM.lawyerName.value = 'Martin Kpebu Legal Chambers';
      if (DOM.lawyerPhone) DOM.lawyerPhone.value = '+233 30 266 9514';
      showToast('Loaded Demo Ghana Contacts', 'safe');
    });

    DOM.btnOpenProModal?.addEventListener('click', openProModal);
    loadContactsIntoForm();
  }

  // ========================================================================
  // 13. MODALS: ONBOARDING, CRITICAL 5-SECOND AUTO-SOS & PRO CLOUD
  // ========================================================================
  function initOnboardingModal() {
    const isDone = localStorage.getItem('cs_onboarded_v1');
    if (!isDone && DOM.modalOnboarding) {
      DOM.modalOnboarding.classList.add('active');
    }

    DOM.btnCloseOnboarding?.addEventListener('click', () => {
      DOM.modalOnboarding?.classList.remove('active');
    });

    DOM.formOnboardingContacts?.addEventListener('submit', (e) => {
      e.preventDefault();
      const n1 = DOM.onboardName1?.value || 'Kofi Adomako';
      const p1 = DOM.onboardPhone1?.value || '+233244123456';
      const n2 = DOM.onboardName2?.value || 'Ama Serwaa';
      const p2 = DOM.onboardPhone2?.value || '+233201987654';

      if (DOM.contact1Name) DOM.contact1Name.value = n1;
      if (DOM.contact1Phone) DOM.contact1Phone.value = p1;
      if (DOM.contact2Name) DOM.contact2Name.value = n2;
      if (DOM.contact2Phone) DOM.contact2Phone.value = p2;

      saveContactsFromForm();
      localStorage.setItem('cs_onboarded_v1', 'true');
      DOM.modalOnboarding?.classList.remove('active');
      showToast('CitizenShield Armed • Welcome to Active Protection', 'safe');
    });
  }

  function openSosCountdownModal(seconds = 5) {
    if (!DOM.modalSosCountdown) return;

    DOM.modalSosCountdown.classList.add('active');
    if (DOM.sosCountdownView) DOM.sosCountdownView.style.display = 'flex';
    if (DOM.sosDispatchedView) DOM.sosDispatchedView.classList.remove('active');
    if (DOM.sosCountdownTimer) DOM.sosCountdownTimer.textContent = seconds;
  }

  function closeSosModal() {
    if (DOM.modalSosCountdown) {
      DOM.modalSosCountdown.classList.remove('active');
    }
  }

  function initSosModalListeners() {
    if (window.SOSDispatcher) {
      // Countdown tick
      window.SOSDispatcher.on('countdownTick', (sec) => {
        openSosCountdownModal(sec);
      });

      // Dispatched confirmed
      window.SOSDispatcher.on('sosDispatched', (payload) => {
        if (!DOM.modalSosCountdown) return;
        DOM.modalSosCountdown.classList.add('active');
        if (DOM.sosCountdownView) DOM.sosCountdownView.style.display = 'none';
        if (DOM.sosDispatchedView) DOM.sosDispatchedView.classList.add('active');

        if (DOM.sosDispatchedDetails) {
          DOM.sosDispatchedDetails.textContent = `Alert dispatched to ${payload.recipients?.length || 2} contacts with GPS (${payload.gps?.latitude?.toFixed(4)}, ${payload.gps?.longitude?.toFixed(4)}) and latest officer watermark.`;
        }

        // WhatsApp direct link for primary contact
        if (DOM.sosWhatsappLink && payload.communicationLinks?.whatsApp?.[0]) {
          DOM.sosWhatsappLink.href = payload.communicationLinks.whatsApp[0].url;
        }
      });

      // Cancelled
      window.SOSDispatcher.on('sosCancelled', () => {
        closeSosModal();
        showToast('Emergency SOS Cancelled (False Alarm)', 'safe');
      });
    }

    DOM.btnCancelSos?.addEventListener('click', () => {
      if (window.SOSDispatcher) window.SOSDispatcher.cancelSOS();
      closeSosModal();
    });

    DOM.btnAbortSosX?.addEventListener('click', () => {
      if (window.SOSDispatcher) window.SOSDispatcher.cancelSOS();
      closeSosModal();
    });

    DOM.btnDispatchSosNow?.addEventListener('click', async () => {
      if (window.SOSDispatcher) {
        window.SOSDispatcher.cancelSOS();
        await window.SOSDispatcher.executeDispatch('Manual Instant Confirmation');
      }
    });

    DOM.btnDismissDispatchedSos?.addEventListener('click', closeSosModal);
  }

  function openProModal() {
    if (DOM.modalPro) DOM.modalPro.classList.add('active');
  }

  function closeProModal() {
    if (DOM.modalPro) DOM.modalPro.classList.remove('active');
  }

  function initProModal() {
    DOM.btnClosePro?.addEventListener('click', closeProModal);

    DOM.btnMomoUpgrade?.addEventListener('click', () => {
      AppState.proSubscribed = true;
      closeProModal();
      showToast('✓ CitizenShield Pro Active: Continuous 5s Cloudflare R2 backup enabled!', 'safe');
    });
  }

  // ========================================================================
  // 14. STEALTH OLED BLACKOUT SCREEN SYNCHRONIZATION
  // ========================================================================
  function toggleFallbackStealth() {
    if (!DOM.stealthOverlay) return;
    const isCurrentlyActive = DOM.stealthOverlay.classList.contains('active');
    if (isCurrentlyActive) {
      DOM.stealthOverlay.classList.remove('active');
    } else {
      DOM.stealthOverlay.classList.add('active');
      updateStealthClock();
    }
  }

  function updateStealthClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

    if (DOM.stealthClockText) DOM.stealthClockText.textContent = timeStr;
    if (DOM.stealthDateText) DOM.stealthDateText.textContent = dateStr.toUpperCase();
  }

  function initStealthOverlay() {
    // Synchronize with StealthEngine if loaded
    if (window.StealthEngine) {
      window.StealthEngine.on('stealthChange', (isStealth) => {
        if (DOM.stealthOverlay) {
          DOM.stealthOverlay.classList.toggle('active', isStealth);
          if (isStealth) updateStealthClock();
        }
        if (DOM.toggleStealthBlackout) {
          DOM.toggleStealthBlackout.checked = isStealth;
        }
      });
    }

    // Long press 1.5s unlock gesture on fallback overlay
    let pressTimer = null;
    let pressStartTime = 0;
    const holdDurationMs = 1500;

    const startPress = () => {
      pressStartTime = Date.now();
      if (DOM.stealthProgressCircle) {
        DOM.stealthProgressCircle.style.transition = 'stroke-dashoffset 1.5s linear';
        DOM.stealthProgressCircle.style.strokeDashoffset = '0';
      }

      pressTimer = setTimeout(() => {
        if (window.StealthEngine) {
          window.StealthEngine.exitStealth();
        } else {
          toggleFallbackStealth();
        }
        resetPress();
      }, holdDurationMs);
    };

    const resetPress = () => {
      clearTimeout(pressTimer);
      if (DOM.stealthProgressCircle) {
        DOM.stealthProgressCircle.style.transition = 'stroke-dashoffset 0.15s ease';
        DOM.stealthProgressCircle.style.strokeDashoffset = '188.5';
      }
    };

    if (DOM.stealthUnlockTrigger) {
      DOM.stealthUnlockTrigger.addEventListener('mousedown', startPress);
      DOM.stealthUnlockTrigger.addEventListener('mouseup', resetPress);
      DOM.stealthUnlockTrigger.addEventListener('mouseleave', resetPress);
      DOM.stealthUnlockTrigger.addEventListener('touchstart', startPress, { passive: true });
      DOM.stealthUnlockTrigger.addEventListener('touchend', resetPress);
    }
  }

  // ========================================================================
  // 15. 3D INTERACTIVE ACOUSTIC SHIELD SPHERE & PERSPECTIVE TILT PHYSICS
  // ========================================================================
  function init3DShieldOrb() {
    const canvas = document.getElementById('shield-3d-canvas');
    const stage = document.getElementById('orb-stage-trigger');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 240;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Generate 320 Fibonacci sphere vertices + 60 orbital ring vertices
    const N = 320;
    const points = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      points.push({
        x: Math.cos(theta) * radiusAtY,
        y: y,
        z: Math.sin(theta) * radiusAtY,
        theta: theta,
        phi: Math.acos(y),
        isRing: false
      });
    }

    // Add outer orbital ring vertices
    const ringCount = 64;
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      points.push({
        x: Math.cos(a) * 1.26,
        y: Math.sin(a) * 0.28,
        z: Math.sin(a) * 1.26,
        theta: a,
        phi: 0,
        isRing: true
      });
    }

    // Drag & Click interaction on the 3D Sphere
    if (stage) {
      const onStart = (x, y) => {
        OrbState.isDragging = true;
        OrbState.dragMoved = false;
        OrbState.lastX = x;
        OrbState.lastY = y;
      };
      const onMove = (x, y) => {
        if (!OrbState.isDragging) return;
        const dx = x - OrbState.lastX;
        const dy = y - OrbState.lastY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) OrbState.dragMoved = true;
        OrbState.velY = dx * 0.006;
        OrbState.velX = dy * 0.006;
        OrbState.rotY += OrbState.velY;
        OrbState.rotX += OrbState.velX;
        OrbState.lastX = x;
        OrbState.lastY = y;
      };
      const onEnd = async () => {
        if (!OrbState.isDragging) return;
        OrbState.isDragging = false;
        if (!OrbState.dragMoved) {
          if (AppState.shieldActive) {
            await deactivateShield();
          } else {
            await activateShield();
          }
        }
      };

      stage.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', onEnd);

      stage.addEventListener('touchstart', (e) => {
        if (e.touches[0]) onStart(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      stage.addEventListener('touchmove', (e) => {
        if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      stage.addEventListener('touchend', onEnd);
    }

    let t = 0;
    function renderFrame() {
      t += 0.025;
      ctx.clearRect(0, 0, size, size);

      // Decay voice pulse smoothly
      OrbState.voicePulse *= 0.95;
      if (OrbState.armed && OrbState.voicePulse < 0.18) {
        OrbState.voicePulse = 0.18 + Math.sin(t * 2.2) * 0.08;
      }

      if (!OrbState.isDragging) {
        const baseSpin = OrbState.armed ? 0.009 : 0.0038;
        OrbState.velY += (baseSpin - OrbState.velY) * 0.05;
        OrbState.velX += (0.0015 - OrbState.velX) * 0.05;
        OrbState.rotY += OrbState.velY;
        OrbState.rotX += OrbState.velX;
      }

      // Select RGB palette by state
      let r = 229, g = 184, b = 105; // Warm Champagne Gold standby
      if (OrbState.threatState === 'CRITICAL') {
        r = 239; g = 68; b = 68; // Critical Crimson
      } else if (OrbState.threatState === 'ELEVATED') {
        r = 245; g = 158; b = 11; // Caution Saffron
      } else if (OrbState.armed) {
        r = 16; g = 185; b = 129; // Sovereign Jade
      }

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = OrbState.armed ? 78 : 70;

      // Soft core volumetric aura
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseRadius * 1.35);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${OrbState.armed ? 0.26 : 0.14})`);
      grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.04)`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      const cosY = Math.cos(OrbState.rotY);
      const sinY = Math.sin(OrbState.rotY);
      const cosX = Math.cos(OrbState.rotX);
      const sinX = Math.sin(OrbState.rotX);

      const projected = [];
      const waveAmp = OrbState.voicePulse * 11;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const harmonic = p.isRing
          ? 1 + Math.sin(p.theta * 3 + t * 2) * (OrbState.voicePulse * 0.06)
          : 1 + Math.sin(p.phi * 6 + t * 3.2) * Math.cos(p.theta * 4 - t * 2) * (waveAmp / baseRadius);

        const px = p.x * baseRadius * harmonic;
        const py = p.y * baseRadius * harmonic;
        const pz = p.z * baseRadius * harmonic;

        // 3D rotation Y then X
        const x1 = px * cosY - pz * sinY;
        const z1 = pz * cosY + px * sinY;
        const y2 = py * cosX - z1 * sinX;
        const z2 = z1 * cosX + py * sinX;

        const fov = 260;
        const scale = fov / (fov + z2 + baseRadius);
        projected.push({
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          z: z2,
          scale: scale,
          isRing: p.isRing
        });
      }

      // Depth-sort back to front
      projected.sort((a, bPt) => bPt.z - a.z);

      // Keep pulsing smoothly while neural voice is actively speaking
      if (window.MediaEngine && window.MediaEngine.isSpeaking) {
        OrbState.voicePulse = Math.max(OrbState.voicePulse, 0.55 + Math.sin(t * 7) * 0.25);
      }

      // Draw subtle 3D geodesic constellation filaments between nearby front-hemisphere nodes
      ctx.lineWidth = 0.75;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.isRing || p1.z > 15) continue; // front hemisphere only for crisp clarity
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          if (p2.isRing || p2.z > 15) continue;
          const dx = p1.sx - p2.sx;
          const dy = p1.sy - p2.sy;
          const distSq = dx * dx + dy * dy;
          if (distSq < 580) {
            const lineAlpha = (1 - distSq / 580) * 0.22;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        const depthNorm = (pt.z + baseRadius) / (2 * baseRadius); // 0 front, 1 back
        const alpha = Math.max(0.12, Math.min(0.96, 1 - depthNorm * 0.78));
        const dotSize = pt.isRing ? (1.3 * pt.scale) : (1.95 * pt.scale);

        ctx.fillStyle = pt.isRing
          ? `rgba(229, 184, 105, ${alpha * 0.72})`
          : `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  }

  function init3DTiltCards() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rx = ((y / rect.height) - 0.5) * -3.5;
        const ry = ((x / rect.width) - 0.5) * 3.5;
        card.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  // ========================================================================
  // 16. HELPER UTILITIES
  // ========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ========================================================================
  // 17. INITIALIZATION LIFECYCLE
  // ========================================================================
  function initApp() {
    initNavigation();
    initShieldDeck();
    initTelemetryListeners();
    initWatermarkPins();
    initLegalCardWhisper();
    initScenarioSimulator();
    initLawsTab();
    initVaultTab();
    initContactsTab();
    initOnboardingModal();
    initSosModalListeners();
    initProModal();
    initStealthOverlay();
    init3DShieldOrb();
    init3DTiltCards();

    // Verify online / offline DB indicator
    if (window.GHANA_LAWS_DATA && window.GHANA_LAWS_DATA.length > 0) {
      if (DOM.headerDbStatus) DOM.headerDbStatus.textContent = `${window.GHANA_LAWS_DATA.length} Statutes Offline`;
    }

    // Register Service Worker for 100% offline PWA resilience
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('[CitizenShield] Service Worker note:', err.message);
      });
    }

    console.log('[CitizenShield Ghana] Spatial 3D Application Shell initialized.');
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
