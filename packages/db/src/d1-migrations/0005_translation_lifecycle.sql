CREATE TABLE translation_job (
 id TEXT PRIMARY KEY NOT NULL,
 subject_type TEXT NOT NULL CHECK(subject_type IN ('source','event')),
 source_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 lang TEXT NOT NULL CHECK(lang IN ('zh','en')),
 policy INTEGER NOT NULL DEFAULT 1,
 text_hash TEXT NOT NULL,
 original_title TEXT NOT NULL,
 original_description TEXT,
 state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','retry_wait','ready','failed','obsolete')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 lease_owner TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0,
 error_code TEXT,
 result_title TEXT,
 result_description TEXT,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(subject_type,source_id,item_id,lang,text_hash,policy)
);
CREATE INDEX translation_job_due ON translation_job(state,next_attempt_at,lease_until);
CREATE INDEX translation_job_lookup ON translation_job(source_id,lang,item_id);

CREATE TABLE translation_attempt (
 id TEXT PRIMARY KEY NOT NULL,
 day TEXT NOT NULL,
 minute INTEGER NOT NULL,
 model TEXT NOT NULL,
 reserved_micros INTEGER NOT NULL CHECK(reserved_micros > 0),
 actual_micros INTEGER,
 input_tokens INTEGER,
 output_tokens INTEGER,
 lease_until INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'active',
 created_at INTEGER NOT NULL
);
CREATE INDEX translation_attempt_day ON translation_attempt(day);
CREATE INDEX translation_attempt_minute ON translation_attempt(minute);
CREATE INDEX translation_attempt_active ON translation_attempt(state,lease_until);

CREATE TABLE translation_control (
 id INTEGER PRIMARY KEY CHECK(id=1),
 blocked_until INTEGER NOT NULL DEFAULT 0,
 reason TEXT,
  reconcile_cursor INTEGER NOT NULL DEFAULT 0,
  event_cursor TEXT NOT NULL DEFAULT ''
);
INSERT INTO translation_control(id) VALUES(1);
