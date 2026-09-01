PRAGMA foreign_keys = ON;

CREATE TABLE migration_guard_0002 (
  unsupported_count INTEGER NOT NULL CHECK (unsupported_count = 0)
);

INSERT INTO migration_guard_0002 (unsupported_count)
SELECT COUNT(*) FROM conversation_units
WHERE speaker_role NOT IN ('interviewer', 'participant');

INSERT INTO migration_guard_0002 (unsupported_count)
SELECT COUNT(*) FROM record_topics;

CREATE TABLE interview_messages (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES interview_records(id),
  edition_id TEXT NOT NULL REFERENCES published_editions(id),
  sequence INTEGER NOT NULL,
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('interviewer', 'participant')),
  body TEXT NOT NULL,
  UNIQUE(edition_id, sequence)
);

INSERT INTO interview_messages (id, record_id, edition_id, sequence, speaker_role, body)
SELECT id, record_id, edition_id, sequence, speaker_role, body
FROM conversation_units
ORDER BY edition_id, sequence;

DROP TABLE conversation_units;
DROP TABLE record_topics;
DROP TABLE topics;
DROP TABLE migration_guard_0002;
