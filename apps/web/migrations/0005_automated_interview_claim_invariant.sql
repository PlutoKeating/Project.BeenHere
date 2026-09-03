CREATE TRIGGER record_drafts_automated_claim_insert
BEFORE INSERT ON record_drafts
WHEN json_extract(NEW.snapshot, '$.ingestionMethod') = 'automated_interview'
  AND NOT EXISTS (
    SELECT 1 FROM record_owners
    WHERE record_id = NEW.record_id AND ownership_kind = 'claimed'
  )
BEGIN
  SELECT RAISE(ABORT, 'automated interview requires a claimed owner');
END;

CREATE TRIGGER record_drafts_automated_claim_update
BEFORE UPDATE OF snapshot ON record_drafts
WHEN json_extract(NEW.snapshot, '$.ingestionMethod') = 'automated_interview'
  AND NOT EXISTS (
    SELECT 1 FROM record_owners
    WHERE record_id = NEW.record_id AND ownership_kind = 'claimed'
  )
BEGIN
  SELECT RAISE(ABORT, 'automated interview requires a claimed owner');
END;

CREATE TRIGGER record_owners_keep_automated_claim_update
BEFORE UPDATE OF ownership_kind ON record_owners
WHEN OLD.ownership_kind = 'claimed'
  AND NEW.ownership_kind != 'claimed'
  AND EXISTS (
    SELECT 1 FROM record_drafts
    WHERE record_id = OLD.record_id
      AND json_extract(snapshot, '$.ingestionMethod') = 'automated_interview'
  )
BEGIN
  SELECT RAISE(ABORT, 'automated interview must keep its claimed owner');
END;

CREATE TRIGGER record_owners_keep_automated_claim_delete
BEFORE DELETE ON record_owners
WHEN OLD.ownership_kind = 'claimed'
  AND EXISTS (
    SELECT 1 FROM record_drafts
    WHERE record_id = OLD.record_id
      AND json_extract(snapshot, '$.ingestionMethod') = 'automated_interview'
  )
BEGIN
  SELECT RAISE(ABORT, 'automated interview must keep its claimed owner');
END;
