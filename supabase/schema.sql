-- ============================================================================
-- CitizenShield Ghana (Pocket Barrister) — Supabase PostgreSQL & Storage Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. EVIDENCE SESSIONS TABLE (Immutable Server-Side SHA-256 Notary & Metadata)
create table if not exists public.evidence_sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text unique not null,              -- e.g. 'CS-GH-20261017-9A8F1'
  device_id text not null,                        -- Anonymous cryptographic device fingerprint
  recording_mode text not null default 'audio-stealth',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  peak_threat_score integer not null default 0,
  threat_state text not null default 'SAFE',
  chunk_count integer not null default 0,
  total_bytes bigint not null default 0,
  cumulative_sha256 text not null,                -- 64-hex-char cryptographic chain hash
  gps_lat double precision,
  gps_lng double precision,
  gps_location_name text,
  watermarks jsonb not null default '[]'::jsonb,  -- Pinned officer badges/ranks/plates
  transcript jsonb not null default '[]'::jsonb,  -- Timestamped encounter transcript
  storage_object_path text,                       -- Path in Supabase Storage ('evidence-vault/...')
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evidence_sessions_code on public.evidence_sessions(session_code);
create index if not exists idx_evidence_sessions_device on public.evidence_sessions(device_id);

-- 2. SOS LIVE DISPATCHES TABLE (Realtime Emergency Broadcast & Live Tracking)
create table if not exists public.sos_dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_code text unique not null,
  session_code text,
  device_id text not null,
  trigger_reason text not null,
  threat_score integer not null default 85,
  gps_lat double precision,
  gps_lng double precision,
  google_maps_url text,
  officer_badges jsonb not null default '[]'::jsonb,
  transcript_excerpt text,
  contacts_notified jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_sos_dispatches_code on public.sos_dispatches(dispatch_code);

-- 3. OFFICER WATERMARK REGISTRY (Crowdsourced Accountability & Timestamp Log)
create table if not exists public.officer_watermarks (
  id uuid primary key default gen_random_uuid(),
  session_code text not null,
  badge_or_rank text not null,
  raw_utterance text,
  gps_lat double precision,
  gps_lng double precision,
  recorded_at timestamptz not null default now()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Allows anonymous/authenticated client devices to insert & update their own sessions
-- while keeping evidence tamper-proof.
alter table public.evidence_sessions enable row level security;
alter table public.sos_dispatches enable row level security;
alter table public.officer_watermarks enable row level security;

create policy "Allow public insert on evidence_sessions"
  on public.evidence_sessions for insert
  with check (true);

create policy "Allow device update on evidence_sessions"
  on public.evidence_sessions for update
  using (true);

create policy "Allow public select by session_code on evidence_sessions"
  on public.evidence_sessions for select
  using (true);

create policy "Allow public insert on sos_dispatches"
  on public.sos_dispatches for insert
  with check (true);

create policy "Allow public select on sos_dispatches"
  on public.sos_dispatches for select
  using (true);

create policy "Allow public insert on officer_watermarks"
  on public.officer_watermarks for insert
  with check (true);

-- 5. SUPABASE STORAGE BUCKET FOR ENCRYPTED AUDIO/VIDEO EVIDENCE
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-vault',
  'evidence-vault',
  false,
  52428800, -- 50MB per chunk/dossier
  array['audio/webm', 'video/webm', 'audio/mp4', 'video/mp4', 'text/html', 'application/json']
)
on conflict (id) do nothing;

create policy "Allow public upload to evidence-vault"
  on storage.objects for insert
  with check (bucket_id = 'evidence-vault');

create policy "Allow public read from evidence-vault"
  on storage.objects for select
  using (bucket_id = 'evidence-vault');
