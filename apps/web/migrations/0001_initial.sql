PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_credential TEXT,
  email_verified_at TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'director')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  deleted_at TEXT
);

CREATE TABLE account_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX account_sessions_account_idx ON account_sessions(account_id, expires_at);

CREATE TABLE account_actions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  kind TEXT NOT NULL CHECK (kind IN ('verify_email', 'reset_password', 'change_email', 'delete_account')),
  payload TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at TEXT
);
CREATE INDEX account_actions_account_idx ON account_actions(account_id, kind, expires_at);

CREATE TABLE auth_rate_limits (
  id TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);
CREATE INDEX auth_rate_limits_expiry_idx ON auth_rate_limits(expires_at);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  identity_mode TEXT NOT NULL CHECK (identity_mode IN ('real_name', 'pseudonym', 'anonymous')),
  bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_records (
  id TEXT PRIMARY KEY,
  record_number TEXT UNIQUE,
  person_id TEXT NOT NULL REFERENCES people(id),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  conducted_at TEXT NOT NULL,
  ended_at TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted', 'deleted')),
  current_edition_id TEXT,
  random_key REAL NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT REFERENCES accounts(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX interview_records_person_idx ON interview_records(person_id, conducted_at DESC);
CREATE INDEX interview_records_public_random_idx ON interview_records(visibility, random_key);
CREATE INDEX interview_records_number_idx ON interview_records(record_number);

CREATE TABLE record_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  allocated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE record_owners (
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  ownership_kind TEXT NOT NULL CHECK (ownership_kind IN ('uploader', 'claimed', 'assigned')),
  granted_by TEXT REFERENCES accounts(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (record_id, account_id)
);

CREATE INDEX record_owners_account_idx ON record_owners(account_id, created_at DESC);

CREATE TABLE source_records (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('douyin', 'social_media', 'in_person', 'direct', 'other')),
  platform_name TEXT,
  external_id TEXT,
  canonical_url TEXT,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, external_id)
);

CREATE TABLE record_drafts (
  record_id TEXT PRIMARY KEY REFERENCES interview_records(id),
  revision INTEGER NOT NULL DEFAULT 1,
  snapshot TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES accounts(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE published_editions (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  edition_number INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  published_by TEXT NOT NULL REFERENCES accounts(id),
  published_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES published_editions(id),
  content_hash TEXT NOT NULL,
  UNIQUE(record_id, edition_number)
);

CREATE TABLE conversation_units (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  edition_id TEXT NOT NULL REFERENCES published_editions(id),
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('question', 'answer', 'image', 'pause', 'note', 'section')),
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('interviewer', 'participant', 'recorder', 'system')),
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

CREATE TABLE record_topics (
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  PRIMARY KEY (record_id, topic_id)
);

CREATE TABLE claim_requests (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  claimant_account_id TEXT NOT NULL REFERENCES accounts(id),
  request_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by TEXT REFERENCES accounts(id),
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  UNIQUE(record_id, claimant_account_id, status)
);

CREATE TABLE correction_requests (
  id TEXT PRIMARY KEY,
  record_id TEXT REFERENCES interview_records(id),
  requester_contact TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public_request_limits (
  id TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);

CREATE INDEX public_request_limits_expiry_idx ON public_request_limits(expires_at);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_account_id TEXT REFERENCES accounts(id),
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_hash TEXT,
  after_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_target_idx ON audit_events(target_type, target_id, created_at DESC);
