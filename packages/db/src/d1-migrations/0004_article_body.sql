ALTER TABLE `source_item` ADD `article_text` text;
ALTER TABLE `source_item` ADD `article_version` text;
ALTER TABLE `source_item` ADD `article_content_hash` text;
ALTER TABLE `source_item` ADD `article_truncated` integer;
CREATE INDEX `source_item_source_time_idx` ON `source_item` (`source_id`, coalesce(`published_at`, `fetched_at`), `item_id`);
