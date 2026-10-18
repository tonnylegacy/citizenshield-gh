-- ====================================================================
-- CitizenShield Ghana — Cloudflare D1 SQLite Database Schema
-- Edge Notary, Zero-Knowledge Vault & Duress Coercion Alerts
-- ====================================================================

-- 1. Citizen Accounts (OIDC Google/Apple & Mobile PIN Identity)
CREATE TABLE IF NOT EXISTS citizen_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'phone')),
  identifier TEXT UNIQUE NOT NULL, -- Email (for Google/Apple) or E.164 phone (+233...)
  display_name TEXT,
  real_pin_hash TEXT NOT NULL,
  duress_pin_hash TEXT,
  pbkdf2_salt TEXT NOT NULL,
  webauthn_credential_id TEXT,
  encrypted_contacts_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_identifier ON citizen_accounts(identifier);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON citizen_accounts(provider);

-- 2. Evidence Sessions (Cryptographic SHA-256 Hash Chains & Media References)
CREATE TABLE IF NOT EXISTS evidence_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  device_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  mode TEXT NOT NULL,
  peak_threat_score INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  transcript_count INTEGER DEFAULT 0,
  watermark_count INTEGER DEFAULT 0,
  final_chain_hash TEXT NOT NULL,
  gps_lat REAL,
  gps_lng REAL,
  media_r2_key TEXT,
  encrypted_payload TEXT,
  notarized_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES citizen_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_account ON evidence_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON evidence_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_notarized ON evidence_sessions(notarized_at);

-- 3. Live SOS Telemetry & Dispatches
CREATE TABLE IF NOT EXISTS sos_dispatches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT,
  session_id TEXT,
  device_id TEXT NOT NULL,
  threat_score INTEGER NOT NULL,
  gps_lat REAL,
  gps_lng REAL,
  statute_cited TEXT,
  dispatched_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES citizen_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES evidence_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sos_account ON sos_dispatches(account_id);
CREATE INDEX IF NOT EXISTS idx_sos_session ON sos_dispatches(session_id);
CREATE INDEX IF NOT EXISTS idx_sos_dispatched ON sos_dispatches(dispatched_at);

-- 4. Officer Badge & Verbal Watermarks
CREATE TABLE IF NOT EXISTS officer_watermarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT,
  session_id TEXT,
  officer_text TEXT NOT NULL,
  gps_lat REAL,
  gps_lng REAL,
  logged_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES citizen_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES evidence_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_watermarks_session ON officer_watermarks(session_id);

-- 5. Silent Duress Decoy Alerts (Triggered during police coercion or under duress)
CREATE TABLE IF NOT EXISTS duress_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT,
  identifier TEXT,
  device_id TEXT,
  gps_lat REAL,
  gps_lng REAL,
  triggered_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES citizen_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_duress_identifier ON duress_alerts(identifier);
CREATE INDEX IF NOT EXISTS idx_duress_triggered ON duress_alerts(triggered_at);
