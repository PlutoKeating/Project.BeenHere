PRAGMA foreign_keys = ON;

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  identity_mode TEXT NOT NULL CHECK (identity_mode IN ('real_name', 'pseudonym', 'anonymous')),
  bio TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'restricted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interviews (
  id TEXT PRIMARY KEY,
  archive_number TEXT UNIQUE,
  person_id TEXT NOT NULL REFERENCES people(id),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  conducted_at TEXT NOT NULL,
  ended_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  language TEXT NOT NULL DEFAULT 'zh-CN',
  editorial_state TEXT NOT NULL DEFAULT 'captured',
  visibility TEXT NOT NULL DEFAULT 'embargoed' CHECK (visibility IN ('public', 'unlisted', 'embargoed', 'withdrawn')),
  current_edition_id TEXT,
  random_key REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX interviews_person_idx ON interviews(person_id, conducted_at DESC);
CREATE INDEX interviews_public_random_idx ON interviews(visibility, random_key);
CREATE INDEX interviews_archive_number_idx ON interviews(archive_number);

CREATE TABLE archive_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  allocated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE source_records (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  platform TEXT NOT NULL CHECK (platform IN ('douyin', 'direct', 'other')),
  external_id TEXT,
  canonical_url TEXT,
  source_published_at TEXT,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  caption_snapshot TEXT,
  metadata_snapshot TEXT NOT NULL DEFAULT '{}',
  evidence_manifest_hash TEXT,
  UNIQUE(platform, external_id)
);

CREATE TABLE editorial_drafts (
  interview_id TEXT PRIMARY KEY REFERENCES interviews(id),
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'editorial_review' CHECK (status IN ('editorial_review', 'participant_review', 'approved')),
  snapshot TEXT NOT NULL,
  review_hash TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consent_grants (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  scope TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  policy_version TEXT NOT NULL
);

CREATE TABLE published_editions (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  edition_number INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  published_by TEXT NOT NULL,
  consent_grant_id TEXT NOT NULL REFERENCES consent_grants(id),
  published_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES published_editions(id),
  content_hash TEXT NOT NULL,
  UNIQUE(interview_id, edition_number)
);

CREATE TABLE message_units (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  edition_id TEXT NOT NULL REFERENCES published_editions(id),
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('question', 'answer', 'image', 'pause', 'note', 'section')),
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('interviewer', 'participant', 'editor', 'system')),
  body TEXT NOT NULL,
  occurred_at TEXT,
  duration_seconds INTEGER,
  parent_unit_id TEXT,
  UNIQUE(edition_id, sequence)
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE interview_topics (
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  PRIMARY KEY (interview_id, topic_id)
);

CREATE TABLE correction_requests (
  id TEXT PRIMARY KEY,
  interview_id TEXT REFERENCES interviews(id),
  requester_contact TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  resolution TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_hash TEXT,
  after_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_target_idx ON audit_events(target_type, target_id, created_at DESC);

CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
