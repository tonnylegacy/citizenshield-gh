/**
 * CitizenShield Ghana - Real-Time Legal Rights Copilot Engine
 * File: js/engine/legal-copilot.js
 * 
 * Provides real-time speech transcript analysis against Ghanaian constitutional
 * and statutory laws, calculates dynamic rolling threat scores, extracts verbal
 * officer watermarks (ranks, badge numbers, GP vehicle plates), and rotates
 * context-aware tactical prompts for the citizen.
 */

(function (window) {
  'use strict';

  // Default Ghanaian Law Knowledge Base (used as fallback or baseline if window.GHANA_LAWS_DATA is loading)
  const DEFAULT_GHANA_LAWS = [
    {
      id: 'CONST-14-1',
      source: '1992 Constitution of Ghana, Article 14(1)',
      title: 'Right to Personal Liberty',
      category: 'detention',
      keywords: ['arrest', 'detain', 'station', 'lock up', 'custody', 'follow me', 'come to station'],
      summary: 'Every person has the right to personal liberty. No person shall be deprived of their liberty except in accordance with procedures permitted by law upon reasonable suspicion.',
      actionPrompt: 'Ask calmly: "Officer, am I under arrest or am I free to go under Article 14 of the Constitution?"',
      threatWeight: 35
    },
    {
      id: 'CONST-14-2',
      source: '1992 Constitution of Ghana, Article 14(2)',
      title: 'Mandatory Reason for Arrest & Right to Counsel',
      keywords: ['under arrest', 'handcuff', 'handcuffs', 'charge you', 'commit an offence'],
      summary: 'A person arrested or detained SHALL be informed IMMEDIATELY, in a language they understand, of the reasons for arrest and of their constitutional right to a lawyer of their choice.',
      actionPrompt: 'State clearly: "Under Article 14(2) of the 1992 Constitution, please inform me immediately of the specific lawful reason for this arrest and permit me to contact my lawyer."',
      threatWeight: 45
    },
    {
      id: 'CONST-15',
      source: '1992 Constitution of Ghana, Article 15',
      title: 'Respect for Human Dignity & Prohibition of Torture',
      keywords: ['slap', 'beat', 'weapon', 'gun', 'shoot', 'kill', 'deal with you', 'force', 'slap you', 'beat you', 'cock'],
      summary: 'The dignity of all persons shall be inviolable. No person shall be subjected to torture or other cruel, inhuman or degrading treatment or punishment.',
      actionPrompt: 'Keep hands visible. State firmly: "Officer, Article 15 guarantees my physical dignity. I am cooperating peacefully and not resisting."',
      threatWeight: 50
    },
    {
      id: 'CONST-18-2',
      source: '1992 Constitution of Ghana, Article 18(2)',
      title: 'Protection of Digital Privacy & Property',
      keywords: ['give me the phone', 'unlock your phone', 'seize your phone', 'whatsapp', 'open your phone', 'show me your phone', 'passcode', 'password', 'gallery'],
      summary: 'No person shall be subjected to interference with the privacy of their home, property, correspondence, or communication without a valid court warrant.',
      actionPrompt: 'State calmly: "Officer, under Article 18(2) of the Constitution and Section 89 of the Cybersecurity Act, private digital correspondence cannot be searched without a judicial warrant."',
      threatWeight: 40
    },
    {
      id: 'ACT1038-SEC89',
      source: 'Cybersecurity Act, 2020 (Act 1038), Section 89',
      title: 'Unlawful Device Access and Search',
      keywords: ['give me your phone', 'seize phone', 'take your phone', 'check your whatsapp', 'phone search'],
      summary: 'Law enforcement access to digital devices, mobile phones, or stored electronic data requires an order from a court of competent jurisdiction.',
      actionPrompt: 'Say aloud: "I do not consent to an arbitrary phone search without a Section 89 court order."',
      threatWeight: 40
    },
    {
      id: 'ACT30-SEC22',
      source: 'Criminal and Other Offences (Procedure) Act, 1960 (Act 30), Section 22',
      title: 'Search of Person or Vehicle',
      keywords: ['search your bag', 'open your boot', 'open your trunk', 'search your car', 'empty your pocket'],
      summary: 'A police officer may only search a person upon lawful arrest or with reasonable suspicion of contraband/felony weapon possession under a valid statutory provision.',
      actionPrompt: 'Say: "Officer, am I suspected of a specific offence, or on what statutory basis are you requesting a warrantless search?"',
      threatWeight: 25
    },
    {
      id: 'CI76-REG82',
      source: 'Ghana Police Service Regulations, 2012 (C.I. 76), Regulation 82',
      title: 'Officer Identification & Name Tag Mandate',
      keywords: ['badge', 'service number', 'name tag', 'who are you', 'rank', 'identity', 'show me your id'],
      summary: 'Every police officer on duty is mandated to display their official name tag and service number and to conduct themselves with professional decorum.',
      actionPrompt: 'Read aloud: "Officer, I am noting your name tag and service number for lawful record."',
      threatWeight: 15
    },
    {
      id: 'ACT350-BRIBERY',
      source: 'Police Service Act, 1970 (Act 350) & Criminal Offences Act (Act 29)',
      title: 'Prohibition of Extortion and Corruption',
      keywords: ['bribe', 'give us something', 'buy us water', 'drop something', 'settle here', 'settle the matter', 'small thing', 'weekend money'],
      summary: 'Soliciting or accepting any unofficial payment, token, or financial settlement under colour of police office constitutes criminal extortion.',
      actionPrompt: 'State respectfully: "Officer, I request an official citation receipt or to resolve this directly at the divisional charge office."',
      threatWeight: 35
    }
  ];

  // Ghanaian Police Ranks & Divisions Dictionary
  const GHANA_POLICE_RANKS = [
    { label: 'Inspector General of Police', abbr: 'IGP' },
    { label: 'Commissioner of Police', abbr: 'COP' },
    { label: 'Deputy Commissioner of Police', abbr: 'DCOP' },
    { label: 'Assistant Commissioner of Police', abbr: 'ACP' },
    { label: 'Chief Superintendent', abbr: 'C/Supt' },
    { label: 'Superintendent', abbr: 'Supt' },
    { label: 'Deputy Superintendent of Police', abbr: 'DSP' },
    { label: 'Assistant Superintendent of Police', abbr: 'ASP' },
    { label: 'Chief Inspector', abbr: 'Chief Inspector' },
    { label: 'Inspector', abbr: 'Inspector' },
    { label: 'Sergeant', abbr: 'Sergeant' },
    { label: 'Corporal', abbr: 'Corporal' },
    { label: 'Lance Corporal', abbr: 'Lance Corporal' },
    { label: 'Constable', abbr: 'Constable' },
    { label: 'Officer', abbr: 'Officer' },
    { label: 'Commander', abbr: 'Commander' },
    { label: 'CID Officer', abbr: 'CID' },
    { label: 'MTTD Officer', abbr: 'MTTD' }
  ];

  // High-Threat Critical Keywords (Instantly trigger score >= 88)
  const CRITICAL_THREAT_PATTERNS = [
    /\bunder arrest\b/i,
    /\benter the car\b/i,
    /\benter our car\b/i,
    /\benter the patrol car\b/i,
    /\bget inside the car\b/i,
    /\bfollow (?:me|us) to the station\b/i,
    /\bcome to the station\b/i,
    /\bgive me (?:the|your) phone\b/i,
    /\bseize (?:the|your) phone\b/i,
    /\bhand over (?:your|the) phone\b/i,
    /\bhandcuff\b/i,
    /\bput handcuffs\b/i,
    /\block (?:you|him) up\b/i,
    /\bthrow (?:you|him) in (?:cells|cell)\b/i,
    /\bslap\b/i,
    /\bbeat\b/i,
    /\bweapon\b/i,
    /\bshoot\b/i,
    /\bcock (?:the gun|the weapon|your weapon)\b/i,
    /\bdraw your gun\b/i,
    /\bkill you\b/i,
    /\bdeal with you\b/i
  ];

  // Elevated Threat Keywords (Score +15 to +30)
  const ELEVATED_THREAT_PATTERNS = [
    /\bsearch (?:your|the) bag\b/i,
    /\bsearch (?:your|the) car\b/i,
    /\bopen (?:your|the) (?:trunk|boot)\b/i,
    /\bopen (?:your|the) phone\b/i,
    /\bunlock (?:your|the) phone\b/i,
    /\bwhatsapp\b/i,
    /\bcheck (?:your|the) messages\b/i,
    /\bshow me (?:your|the) wallet\b/i,
    /\bstop recording\b/i,
    /\bturn off (?:the|your) (?:camera|phone)\b/i,
    /\bwhy are you recording\b/i,
    /\bdelete that\b/i,
    /\bdelete (?:the|that) video\b/i,
    /\bdrop something\b/i,
    /\bbuy us (?:water|lunch)\b/i,
    /\bgive us something\b/i,
    /\bsettle (?:it|here)\b/i,
    /\byou are stubborn\b/i,
    /\bstep out of the (?:car|vehicle)\b/i,
    /\bseize (?:your|the) keys\b/i,
    /\bimpound (?:your|the) car\b/i
  ];

  class LegalCopilotEngineClass {
    constructor() {
      this.threatScore = 0;
      this.threatState = 'SAFE'; // 'SAFE' | 'ELEVATED' | 'CRITICAL'
      this.detectedWatermarks = [];
      this.matchedViolations = [];
      this.transcriptHistory = [];
      this.lastCriticalTimestamp = 0;
      this.activePrompt = 'Tactical Tip: Keep your phone mounted or positioned calmly. State your words clearly.';
      
      // Default Tactical Prompts Rotation
      this.defaultTacticalPrompts = [
        'Tactical Tip: Read the officer\'s chest name tag and service number aloud so CitizenShield timestamps it into evidence.',
        'Tactical Tip: Speak clearly: "Officer, am I being detained or am I free to go under Article 14 of the Constitution?"',
        'Tactical Tip: State calmly: "Officer, under Ghanaian law, I do not consent to a search of my phone without a warrant."',
        'Tactical Tip: Say aloud the patrol car registration plate number e.g. "GP 4421-20".',
        'Tactical Tip: Keep your hands visible on the steering wheel or at chest height. Do not make sudden movements.',
        'Tactical Tip: If commanded to follow them, state: "Please provide the name of the police station and your badge number first."'
      ];
      this.promptRotationIndex = 0;

      // Event Listeners
      this.listeners = {
        threatUpdate: [],
        watermark: [],
        promptUpdate: [],
        transcriptAnalyzed: []
      };
    }

    /**
     * Subscribe to engine events
     * @param {'threatUpdate'|'watermark'|'promptUpdate'|'transcriptAnalyzed'} event 
     * @param {Function} callback 
     */
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    /**
     * Unsubscribe from engine events
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }

    /**
     * Emit event to all registered listeners
     */
    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[LegalCopilotEngine] Listener error on event '${event}':`, err);
          }
        });
      }
    }

    /**
     * Resolves the current Ghanaian laws data source
     * @returns {Array} Laws array
     */
    getLawsDatabase() {
      if (window.GHANA_LAWS_DATA && Array.isArray(window.GHANA_LAWS_DATA) && window.GHANA_LAWS_DATA.length > 0) {
        return window.GHANA_LAWS_DATA;
      }
      return DEFAULT_GHANA_LAWS;
    }

    /**
     * Extracts officer verbal watermarks (Rank, Name, Badge/Service Number, Vehicle Plate)
     * @param {string} text Spoken text segment
     * @param {number} timestamp Timestamp ms
     * @param {Object} gps GPS object { latitude, longitude, accuracy }
     * @returns {Array<Object>} Extracted new watermark items
     */
    extractOfficerWatermarks(text, timestamp = Date.now(), gps = null) {
      if (!text || typeof text !== 'string') return [];
      const newWatermarks = [];
      const cleanText = text.trim();

      // 1. Ghanaian Vehicle Plates Detection (e.g. GP 4421-22, GR 1829-21, AS 992-20)
      // GP = Ghana Police Service, GT = Tema/Accra, GR = Greater Accra, AS = Ashanti, etc.
      const plateRegex = /\b(GP|GT|GR|GW|GN|GE|AS|WR|CR|NR|ER|VR|BA|UE|UW|OT|WN|AH|BE|NE|SR)[\s-]?([0-9]{1,5})[\s-]?([0-9]{2})?\b/gi;
      let plateMatch;
      while ((plateMatch = plateRegex.exec(cleanText)) !== null) {
        const region = plateMatch[1].toUpperCase();
        const num = plateMatch[2];
        const year = plateMatch[3] ? `-${plateMatch[3]}` : '';
        const plateIdentifier = `${region} ${num}${year}`;
        
        // Deduplicate
        if (!this.detectedWatermarks.some(w => w.type === 'vehicle_plate' && w.identifier === plateIdentifier)) {
          const watermarkObj = {
            id: `WM-PLATE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            rawText: plateMatch[0],
            rankOrType: region === 'GP' ? 'Ghana Police Vehicle Plate' : 'Vehicle Plate',
            type: 'vehicle_plate',
            identifier: plateIdentifier,
            timestamp: timestamp,
            elapsedFormatted: this.formatElapsed(timestamp),
            gps: gps ? { ...gps } : null
          };
          this.detectedWatermarks.push(watermarkObj);
          newWatermarks.push(watermarkObj);
          this.emit('watermark', watermarkObj);
        }
      }

      // 2. Ghanaian Police Rank + Name Detection
      // e.g. "Sergeant Mensah", "Lance Corporal Boateng", "Inspector Osei", "Constable Appiah"
      const ranksPattern = '(?:Chief\\s+Inspector|Assistant\\s+Superintendent(?:\\s+of\\s+Police)?|Deputy\\s+Superintendent(?:\\s+of\\s+Police)?|Lance\\s+Corporal|Superintendent|Commander|Inspector|Sergeant|Corporal|Constable|Officer|C\\/Insp|L\\/Cpl|Supt|DSP|ASP|Insp|Sgt|Cpl|CID|MTTD)';
      const rankAndNameRegex = new RegExp(`\\b(${ranksPattern})\\s+([A-Z][a-z]{2,}(?:\\s+[A-Z][a-z]{2,})?)\\b`, 'gi');
      
      let rankMatch;
      while ((rankMatch = rankAndNameRegex.exec(cleanText)) !== null) {
        const rank = rankMatch[1].trim();
        const name = rankMatch[2].trim();
        const officerIdentifier = `${rank} ${name}`;

        if (!this.detectedWatermarks.some(w => w.type === 'officer_name' && w.identifier.toLowerCase() === officerIdentifier.toLowerCase())) {
          const watermarkObj = {
            id: `WM-OFFICER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            rawText: rankMatch[0],
            rankOrType: rank,
            type: 'officer_name',
            identifier: officerIdentifier,
            timestamp: timestamp,
            elapsedFormatted: this.formatElapsed(timestamp),
            gps: gps ? { ...gps } : null
          };
          this.detectedWatermarks.push(watermarkObj);
          newWatermarks.push(watermarkObj);
          this.emit('watermark', watermarkObj);
        }
      }

      // 3. Service / Badge Number Detection
      // e.g. "badge 44821", "service number 10928", "#44821", "number 58210"
      const badgeRegex = /(?:badge|service\s+(?:number|no|id)|officer\s+(?:number|no|id)|police\s+id|id|number|no\.?|#)\s*(?:is\s*)?([0-9]{3,6})/gi;
      let badgeMatch;
      while ((badgeMatch = badgeRegex.exec(cleanText)) !== null) {
        const badgeNumber = badgeMatch[1];
        const badgeIdentifier = `Service #${badgeNumber}`;

        if (!this.detectedWatermarks.some(w => w.type === 'badge_number' && w.identifier === badgeIdentifier)) {
          const watermarkObj = {
            id: `WM-BADGE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            rawText: badgeMatch[0],
            rankOrType: 'Police Service Number / Badge',
            type: 'badge_number',
            identifier: badgeIdentifier,
            timestamp: timestamp,
            elapsedFormatted: this.formatElapsed(timestamp),
            gps: gps ? { ...gps } : null
          };
          this.detectedWatermarks.push(watermarkObj);
          newWatermarks.push(watermarkObj);
          this.emit('watermark', watermarkObj);
        }
      }

      return newWatermarks;
    }

    /**
     * Formats elapsed time string for display
     */
    formatElapsed(timestamp) {
      if (!this.sessionStartTime) return '00:00';
      const diffSec = Math.max(0, Math.floor((timestamp - this.sessionStartTime) / 1000));
      const m = Math.floor(diffSec / 60).toString().padStart(2, '0');
      const s = (diffSec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    /**
     * Process real-time transcript segment
     * @param {string} text Spoken text string
     * @param {'Citizen'|'Officer'|'Unknown'} speaker 
     * @param {number} sessionStartTime 
     * @param {Object} gps GPS object
     * @returns {Object} Analysis result
     */
    processTranscript(text, speaker = 'Officer', sessionStartTime = null, gps = null) {
      if (!text || typeof text !== 'string') return null;
      if (sessionStartTime && !this.sessionStartTime) {
        this.sessionStartTime = sessionStartTime;
      }

      const timestamp = Date.now();
      const cleanText = text.trim();

      // 1. Extract verbal watermarks
      const watermarksFound = this.extractOfficerWatermarks(cleanText, timestamp, gps);

      // 2. Scan for high-threat triggers
      let isCriticalTrigger = false;
      let triggerReasons = [];

      for (const pattern of CRITICAL_THREAT_PATTERNS) {
        if (pattern.test(cleanText)) {
          isCriticalTrigger = true;
          triggerReasons.push(`High-threat verbal trigger matched: "${pattern.source}"`);
        }
      }

      // 3. Scan for elevated-threat triggers
      let isElevatedTrigger = false;
      for (const pattern of ELEVATED_THREAT_PATTERNS) {
        if (pattern.test(cleanText)) {
          isElevatedTrigger = true;
          triggerReasons.push(`Elevated encounter trigger matched: "${pattern.source}"`);
        }
      }

      // 4. Scan against Ghanaian Legal Rules
      const laws = this.getLawsDatabase();
      const matchedLaws = [];

      for (const law of laws) {
        let matchCount = 0;
        if (Array.isArray(law.keywords)) {
          for (const kw of law.keywords) {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(cleanText)) {
              matchCount++;
            }
          }
        }
        if (matchCount > 0) {
          const lawSource = law.statute || law.source || '1992 CONSTITUTION OF GHANA';
          const lawSayThis = law.sayThis || law.actionPrompt || 'Assert your constitutional safeguards under Ghanaian law.';
          const lawPrompt = law.actionPrompt || law.sayThis || law.earbudWhisper || lawSayThis;
          const lawWeight = law.threatWeight || law.threatScore || 20;
          const lawBoundary = (Array.isArray(law.officerLimits) ? law.officerLimits.join(' ') : law.officerLimits) || 'Officers must operate within strictly defined statutory boundaries.';
          const lawSummary = law.summary || (Array.isArray(law.citizenRights) ? law.citizenRights.join(' ') : '') || 'Statutory citizen protection under Ghanaian law.';

          matchedLaws.push({
            id: law.id,
            source: lawSource,
            statute: lawSource,
            title: law.title,
            summary: lawSummary,
            sayThis: lawSayThis,
            actionPrompt: lawPrompt,
            boundary: lawBoundary,
            caseLaw: law.caseLaw || '',
            threatWeight: lawWeight,
            matchCount: matchCount
          });

          // Check if already in matchedViolations list
          if (!this.matchedViolations.some(v => v.id === law.id)) {
            this.matchedViolations.push({
              id: law.id,
              source: lawSource,
              statute: lawSource,
              title: law.title,
              summary: lawSummary,
              sayThis: lawSayThis,
              actionPrompt: lawPrompt,
              boundary: lawBoundary,
              firstDetectedAt: timestamp,
              snippet: cleanText
            });
          }
        }
      }

      // 5. Calculate rolling threatScore
      if (isCriticalTrigger) {
        // High-threat triggers immediately push threatScore >= 88 (CRITICAL)
        this.threatScore = Math.max(this.threatScore, 88);
        this.lastCriticalTimestamp = timestamp;
      } else if (isElevatedTrigger) {
        // Elevated triggers push threat into 45 - 75 range
        const elevatedBoost = 25 + (matchedLaws.length * 10);
        this.threatScore = Math.min(84, Math.max(this.threatScore + 15, elevatedBoost));
      } else if (matchedLaws.length > 0) {
        const lawPoints = matchedLaws.reduce((sum, l) => sum + (l.threatWeight || 15), 0);
        this.threatScore = Math.min(84, Math.max(this.threatScore, lawPoints));
      } else {
        // Natural gradual decay if calm, but do not drop below 20 if watermarks or violations exist
        if (Date.now() - this.lastCriticalTimestamp > 45000) {
          this.threatScore = Math.max(0, this.threatScore - 2);
        }
      }

      // Clamp threat score between 0 and 100
      this.threatScore = Math.min(100, Math.max(0, Math.round(this.threatScore)));

      // 6. Determine Threat State: "SAFE" < 40, "ELEVATED" 40-84, "CRITICAL" >= 85
      const previousState = this.threatState;
      if (this.threatScore >= 85) {
        this.threatState = 'CRITICAL';
      } else if (this.threatScore >= 40) {
        this.threatState = 'ELEVATED';
      } else {
        this.threatState = 'SAFE';
      }

      // 7. Update Tactical Prompts based on context
      this.updateTacticalPrompt(cleanText, matchedLaws);

      // 8. Record transcript entry
      const analysisEntry = {
        id: `TX-${timestamp}-${Math.random().toString(36).substring(2, 6)}`,
        speaker: speaker,
        text: cleanText,
        timestamp: timestamp,
        elapsedFormatted: this.formatElapsed(timestamp),
        threatScore: this.threatScore,
        threatState: this.threatState,
        matchedLaws: matchedLaws,
        triggerReasons: triggerReasons,
        watermarksFound: watermarksFound,
        gps: gps ? { ...gps } : null
      };

      this.transcriptHistory.push(analysisEntry);

      // Emit updates
      this.emit('threatUpdate', {
        threatScore: this.threatScore,
        threatState: this.threatState,
        previousState: previousState,
        reasons: triggerReasons,
        matchedLaws: matchedLaws,
        latestText: cleanText
      });

      this.emit('transcriptAnalyzed', analysisEntry);

      return analysisEntry;
    }

    /**
     * Dynamically updates and rotates tactical guidance prompts
     */
    updateTacticalPrompt(text, matchedLaws) {
      let promptToSet = null;

      if (matchedLaws && matchedLaws.length > 0 && matchedLaws[0].actionPrompt) {
        promptToSet = matchedLaws[0].actionPrompt;
      } else if (this.threatState === 'CRITICAL') {
        promptToSet = '⚠️ CRITICAL: Keep both hands visible. Speak calmly: "Officer, I am complying peacefully and asserting my Article 14 rights."';
      } else if (this.threatState === 'ELEVATED') {
        promptToSet = 'Tactical Tip: Clearly state: "Officer, am I free to proceed, or what is the lawful reason for this detention?"';
      } else {
        // Rotate standard tactical tips
        this.promptRotationIndex = (this.promptRotationIndex + 1) % this.defaultTacticalPrompts.length;
        promptToSet = this.defaultTacticalPrompts[this.promptRotationIndex];
      }

      if (promptToSet && promptToSet !== this.activePrompt) {
        this.activePrompt = promptToSet;
        this.emit('promptUpdate', this.activePrompt);
      }
    }

    /**
     * Force rotation of tactical tip (e.g. on timer)
     */
    rotatePrompt() {
      if (this.threatState === 'SAFE') {
        this.promptRotationIndex = (this.promptRotationIndex + 1) % this.defaultTacticalPrompts.length;
        this.activePrompt = this.defaultTacticalPrompts[this.promptRotationIndex];
        this.emit('promptUpdate', this.activePrompt);
      }
      return this.activePrompt;
    }

    /**
     * Get current threat state and score
     */
    getThreatStatus() {
      return {
        threatScore: this.threatScore,
        threatState: this.threatState
      };
    }

    /**
     * Get all detected officer watermarks
     */
    getWatermarks() {
      return [...this.detectedWatermarks];
    }

    /**
     * Get all matched constitutional & statutory violations
     */
    getViolations() {
      return [...this.matchedViolations];
    }

    /**
     * Get full transcript analysis log
     */
    getTranscriptHistory() {
      return [...this.transcriptHistory];
    }

    /**
     * Reset the copilot engine for a fresh encounter session
     */
    reset() {
      this.threatScore = 0;
      this.threatState = 'SAFE';
      this.detectedWatermarks = [];
      this.matchedViolations = [];
      this.transcriptHistory = [];
      this.sessionStartTime = null;
      this.lastCriticalTimestamp = 0;
      this.activePrompt = this.defaultTacticalPrompts[0];
      this.promptRotationIndex = 0;

      this.emit('threatUpdate', {
        threatScore: 0,
        threatState: 'SAFE',
        previousState: 'RESET',
        reasons: [],
        matchedLaws: [],
        latestText: ''
      });
      this.emit('promptUpdate', this.activePrompt);
    }
  }

  // Export as singleton and class definition
  const instance = new LegalCopilotEngineClass();
  window.LegalCopilotEngineClass = LegalCopilotEngineClass;
  window.LegalCopilotEngine = instance;

})(typeof window !== 'undefined' ? window : this);
