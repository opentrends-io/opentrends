ALTER TABLE translation_control ADD COLUMN scheduler_seen_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE translation_lane (
 lang TEXT PRIMARY KEY CHECK(lang IN ('zh','en')),
 lease_owner TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 wake_until INTEGER NOT NULL DEFAULT 0,
 consumer_seen_at INTEGER NOT NULL DEFAULT 0,
 progress_at INTEGER NOT NULL DEFAULT 0
);
INSERT INTO translation_lane(lang) VALUES ('zh'),('en');
