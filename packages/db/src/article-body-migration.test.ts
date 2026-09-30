import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("article body migration preserves stored excerpts and indexes history ranges", () => {
	const database = new Database(":memory:");
	try {
		database.exec(
			readFileSync(
				new URL("./d1-migrations/0000_romantic_puck.sql", import.meta.url),
				"utf8"
			).replaceAll("--> statement-breakpoint", "")
		);
		database.exec(
			"INSERT INTO source_item (source_id,item_id,generation,url,title,rank,fetched_at,last_seen_at,content_hash,content_text) VALUES ('test','article',1,'https://example.com','Title',1,1,1,'hash','Existing excerpt')"
		);
		database.exec(
			readFileSync(
				new URL("./d1-migrations/0004_article_body.sql", import.meta.url),
				"utf8"
			)
		);
		expect(
			database.query("SELECT content_text, article_text FROM source_item").get()
		).toEqual({ content_text: "Existing excerpt", article_text: null });
		const plan = database
			.query(
				"EXPLAIN QUERY PLAN SELECT item_id FROM source_item WHERE source_id IN (SELECT value FROM json_each(?)) AND coalesce(published_at,fetched_at) >= ? AND coalesce(published_at,fetched_at) < ?"
			)
			.all('["test"]', 0, 100);
		expect(JSON.stringify(plan)).toContain("source_item_source_time_idx");
	} finally {
		database.close();
	}
});
