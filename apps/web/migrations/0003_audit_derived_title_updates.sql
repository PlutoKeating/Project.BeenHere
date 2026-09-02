PRAGMA foreign_keys = ON;

CREATE TRIGGER audit_interview_record_title_updates
AFTER UPDATE OF title ON interview_records
WHEN OLD.title IS NOT NEW.title
BEGIN
  INSERT INTO audit_events (
    id, actor_account_id, actor_label, action, target_type, target_id, reason, created_at
  ) VALUES (
    'audit-' || lower(hex(randomblob(16))),
    NULL,
    'system:title-derivation-v1',
    'record.title_rebuilt',
    'interview_record',
    NEW.id,
    '按全部被采访者消息派生标题',
    CURRENT_TIMESTAMP
  );
END;
