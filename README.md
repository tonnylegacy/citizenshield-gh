# 🛡️ CitizenShield GH — Pocket Legal Copilot & Civic Rights Vault for Ghana

> **Know Your Rights. Protect Your Freedom.**  
> An offline-first Progressive Web App (PWA) & Real-Time Legal Defense Copilot engineered for Ghanaian citizens during police encounters, MTTD traffic stops, roadside searches, and unlawful detentions.

---

## ✨ Core Capabilities

### 1. 📖 Comprehensive Ghana Legal Compendium (Peace Mode Reader)
Accessible 100% offline anytime—even when not in an active encounter—covering **19+ verified statutory & case-law protections**:
- **1992 Constitution of Ghana**: Articles 12, 13, 14 (48-Hour Rule & *Martin Kpebu v. AG*), 15 (Human Dignity), 17 (Freedom from Appearance/Dreadlocks Profiling & *Tyron Marhguy*), 18(2) (Privacy of Correspondence & Electronic Devices), 19(10) (Right to Silence), and 21(1)(a) (Right to Record Public Officers).
- **Digital Privacy & Warrantless Phone Searches**: High Court landmark ruling in ***Edmund Addo v. Attorney-General & IGP (2017)*** + **Cybersecurity Act, 2020 (Act 1038)** + **Electronic Transactions Act, 2008 (Act 772 Sec. 98–99)**.
- **MTTD & Road Traffic Rules (Act 683 & L.I. 2180)**:
  - **24-Hour Driver's License Grace Period** (`Act 683, Sec. 120(6)`).
  - **Attorney-General’s 2024 Binding Directive** prohibiting vehicle impoundment for minor traffic offenses.
  - **MTTD Directives** banning officers from snatching ignition keys or peeling stickers.
  - **Spot Fines (`L.I. 2180, Reg. 157`)**: Zero roadside cash payments; demanding cash constitutes **Extortion (`Act 29, Sec. 239`)**.
  - **Fire Extinguisher & Warning Triangle Specs (`L.I. 2180, Reg. 69 & 83`)**.
- **Searches, Narcotics & Gender Protections (`Act 30 & Act 1019`)**:
  - **Strict Gender Search Rule (`Act 30, Sec. 8(3)`)**: Female citizens may **only** be searched by a female officer with strict regard to decency, never in public view.
  - **Narcotics Control Commission Act, 2020 (Act 1019)** search thresholds.
- **Accountability & Direct Reporting**:
  - Built-in one-tap reporting to the **Police Professional Standards Bureau (PPSB) WhatsApp Evidence Desk (`020 663 9121`)**, voice hotlines (`055 032 3323` / `027 500 0156`), and National Emergency (`191` / `18555`).

---

### 2. 🎙️ Real-Time Legal Copilot & Earbud Whisper Mode (Active Shield)
- **Zero-Cost On-Device Speech & Intent Engine**: Continuously listens during a police stop, matches spoken phrases in `<15ms` on-device, and surfaces high-contrast **Live Legal Counsel Cards** (*What the Law Says* + *What to Say Calmly*).
- **Earbud Whisper Coaching**: Softly speaks 1-sentence tactical legal reminders into your earbuds so you never have to stare at your phone screen.

---

### 3. 👮 Tactical "Verbal Watermarking" (Officer Badge & Name Auto-Capture)
- Prompts you to naturally read the officer's chest badge or vehicle plate aloud (e.g., *"Okay Sergeant Mensah, Service Number 44821..."*).
- Automatically extracts **Police Ranks, Names, Service Numbers, and Ghana Patrol Vehicle Plates (`GP ...`)** and pins them as **Timestamped + GPS-Tagged Evidence Markers** inside the recording chain.

---

### 4. 🌑 Stealth OLED Lock Screen & Strict Torch Suppression
- **Hardware Torch Suppression**: Secret Audio and Secret Video modes strictly enforce `torch: false` so your camera flashlight never accidentally turns on during a night stop.
- **Shake-to-Stealth Blackout Screen (`#000000`)**: Shake your phone (or tap Stealth) during an encounter to cloak the app behind a pitch-black fake lock screen that ignores single taps and requires a **1.5-second press-and-hold** on the clock to unlock.

---

### 5. 🔐 SHA-256 Evidence Vault & 5-Second Auto-SOS Escalation
- **Cryptographic Chain of Custody**: Slices recordings into 5-second chunks stored locally in `IndexedDB`, computing cumulative `SHA-256` hashes compliant with the **Ghana Evidence Act, 1975 (NRCD 323)**.
- **Auto-SOS Dispatch**: Onboarding configures **2 Mandatory Emergency Contacts + Lawyer**. If the AI Threat Meter detects a **CRITICAL** event (*"You are under arrest"*, *"Give me that phone"*), it triggers a 5-second haptic/whisper countdown and dispatches your **Live GPS Map Link + Rolling Transcript Summary + Captured Officer Badges**.

---

## 🚀 Quick Start

```bash
# Serve locally on port 8080
npx serve . -l 8080

# Run the automated 10-point End-to-End Headless Browser Verification Suite
node run_e2e_verification.js
```
