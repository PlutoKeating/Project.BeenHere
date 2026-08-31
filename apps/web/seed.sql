PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO archive_sequences (id) VALUES (1), (2), (3);

INSERT OR IGNORE INTO people (id, slug, display_name, identity_mode, bio) VALUES
  ('person-lin', 'xiaolin', '小林', 'pseudonym', '一个会在下班路上认真看晚霞的人。'),
  ('person-yu', 'xiaoyu', '小雨', 'pseudonym', '住在南方，正在学习允许普通的一天只是普通。'),
  ('person-anon', 'archive-003', '未署名者', 'anonymous', '他选择只留下声音，不留下名字。');

INSERT OR IGNORE INTO interviews (id, archive_number, person_id, title, excerpt, conducted_at, ended_at, editorial_state, visibility, current_edition_id, random_key) VALUES
  ('interview-001', 'BH-000001', 'person-lin', '今天在地铁上', '那天没有发生大事。小林只是记住了车窗里一瞬间的夕阳。', '2026-08-12T14:02:00+08:00', '2026-08-12T15:02:00+08:00', 'published', 'public', 'edition-001-1', 0.17321),
  ('interview-002', 'BH-000002', 'person-yu', '最近没有特别的事情', '平静不是空白。她讲起晚饭、雨声，还有没有完成的书。', '2026-08-18T20:11:00+08:00', '2026-08-18T21:04:00+08:00', 'published', 'public', 'edition-002-1', 0.53814),
  ('interview-003', 'BH-000003', 'person-anon', '一盏没有关掉的灯', '有人在深夜回家时，总会为还没回来的人留一盏灯。', '2026-08-24T23:18:00+08:00', '2026-08-25T00:01:00+08:00', 'published', 'public', 'edition-003-1', 0.84267);

INSERT OR IGNORE INTO consent_grants (id, person_id, interview_id, scope, evidence_reference, granted_at, policy_version) VALUES
  ('consent-001', 'person-lin', 'interview-001', '{"text":true,"images":false,"douyinLink":true}', 'seed-demonstration', '2026-08-13T10:00:00+08:00', '1.0'),
  ('consent-002', 'person-yu', 'interview-002', '{"text":true,"images":false,"douyinLink":false}', 'seed-demonstration', '2026-08-19T10:00:00+08:00', '1.0'),
  ('consent-003', 'person-anon', 'interview-003', '{"text":true,"images":false,"douyinLink":false}', 'seed-demonstration', '2026-08-25T10:00:00+08:00', '1.0');

INSERT OR IGNORE INTO published_editions (id, interview_id, edition_number, snapshot, change_summary, approved_by, published_by, consent_grant_id, published_at, content_hash) VALUES
  ('edition-001-1', 'interview-001', 1, '{"story":["小林说，那天没有发生什么值得专门讲的事。下班地铁经过高架时，夕阳突然落进车厢。","所有人都低着头。只有车窗里的橙色停留了几秒，然后被楼群挡住。","他没有拍照。后来想起时，反而觉得这样很好。"],"editorialNote":"由公开采访整理，保留原意，删去重复语气词。"}', '首次入馆', 'archive-reviewer', 'archive-editor', 'consent-001', '2026-08-14T09:00:00+08:00', 'sha256-demo-001'),
  ('edition-002-1', 'interview-002', 1, '{"story":["她说最近没有发生特别的事情。雨下了几天，晾在阳台的衣服总是不干。","晚上煮了一锅番茄汤，读了十几页没有读完的书。","说完以后，她停了一会儿：也许平静本身就是事情。"],"editorialNote":"由公开采访整理，受访者使用化名。"}', '首次入馆', 'archive-reviewer', 'archive-editor', 'consent-002', '2026-08-20T09:00:00+08:00', 'sha256-demo-002'),
  ('edition-003-1', 'interview-003', 1, '{"story":["他小时候回家很晚，远远看见家里厨房的灯还亮着。","现在他独自住，也保留了这个习惯。离开房间前，会留一盏小灯。","不是等谁。只是觉得房子不该完全黑下来。"],"editorialNote":"受访者选择匿名；可识别地点已经移除。"}', '首次入馆', 'archive-reviewer', 'archive-editor', 'consent-003', '2026-08-26T09:00:00+08:00', 'sha256-demo-003');

INSERT OR IGNORE INTO message_units (id, interview_id, edition_id, sequence, kind, speaker_role, body, occurred_at, duration_seconds, parent_unit_id) VALUES
  ('unit-001-01', 'interview-001', 'edition-001-1', 1, 'question', 'interviewer', '今天发生了什么？', '2026-08-12T14:02:00+08:00', NULL, NULL),
  ('unit-001-02', 'interview-001', 'edition-001-1', 2, 'answer', 'participant', '今天在地铁上。没什么特别的，就是夕阳照进来了。', '2026-08-12T14:07:00+08:00', NULL, 'unit-001-01'),
  ('unit-001-03', 'interview-001', 'edition-001-1', 3, 'question', 'interviewer', '你拍下来了吗？', '2026-08-12T14:13:00+08:00', NULL, 'unit-001-02'),
  ('unit-001-04', 'interview-001', 'edition-001-1', 4, 'pause', 'system', '这里安静了三分钟。', '2026-08-12T14:16:00+08:00', 180, 'unit-001-03'),
  ('unit-001-05', 'interview-001', 'edition-001-1', 5, 'answer', 'participant', '没有。现在想起来，没拍也挺好的。', '2026-08-12T14:19:00+08:00', NULL, 'unit-001-03'),
  ('unit-002-01', 'interview-002', 'edition-002-1', 1, 'question', 'interviewer', '最近有什么想留下的？', '2026-08-18T20:11:00+08:00', NULL, NULL),
  ('unit-002-02', 'interview-002', 'edition-002-1', 2, 'answer', 'participant', '好像没有特别的事情。一直下雨，衣服总是不干。', '2026-08-18T20:16:00+08:00', NULL, 'unit-002-01'),
  ('unit-002-03', 'interview-002', 'edition-002-1', 3, 'answer', 'participant', '但昨晚的番茄汤很好喝。', '2026-08-18T20:18:00+08:00', NULL, 'unit-002-01'),
  ('unit-003-01', 'interview-003', 'edition-003-1', 1, 'question', 'interviewer', '你一直保留着什么习惯？', '2026-08-24T23:18:00+08:00', NULL, NULL),
  ('unit-003-02', 'interview-003', 'edition-003-1', 2, 'answer', 'participant', '离开房间前留一盏灯。小时候回家晚，总能看见厨房灯亮着。', '2026-08-24T23:24:00+08:00', NULL, 'unit-003-01');

INSERT OR IGNORE INTO topics (id, slug, name, description) VALUES
  ('topic-daily', 'daily-life', '普通的一天', '那些没有成为新闻，却真实发生过的日常。'),
  ('topic-home', 'home', '家与归途', '关于房间、灯光、回去与被等待。'),
  ('topic-memory', 'memory', '记忆', '没有照片保存，却仍然留在心里的瞬间。');

INSERT OR IGNORE INTO interview_topics (interview_id, topic_id) VALUES
  ('interview-001', 'topic-daily'), ('interview-001', 'topic-memory'),
  ('interview-002', 'topic-daily'),
  ('interview-003', 'topic-home'), ('interview-003', 'topic-memory');
