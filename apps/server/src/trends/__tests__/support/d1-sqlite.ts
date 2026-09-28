import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { runWithD1Database } from "@opentrends/db";

type SqlValue = string | number | bigint | boolean | null | Uint8Array;

const migrationsDirectory = new URL(
	"../../../../../../packages/db/src/d1-migrations/",
	import.meta.url
);

// A D1Database backed by an in-memory bun:sqlite database, so tests run the
// same drizzle D1 driver (prepare/bind/raw/batch) that production uses.
export class SqliteD1 {
	readonly database = new Database(":memory:");
	/** Every statement run through batch(), in order. */
	readonly batchedSql: string[] = [];

	constructor() {
		const files = readdirSync(migrationsDirectory)
			.filter((file) => file.endsWith(".sql"))
			.sort();
		for (const file of files) {
			const migration = readFileSync(
				new URL(file, migrationsDirectory),
				"utf8"
			);
			this.database.exec(migration.replaceAll("--> statement-breakpoint", ""));
		}
	}

	run<T>(callback: () => T): T {
		return runWithD1Database(this.binding(), callback);
	}

	binding(): D1Database {
		const statement = (sql: string, params: SqlValue[] = []) => {
			const query = () => this.database.query(sql);
			const execute = () => {
				if (query().columnNames.length > 0) {
					return { meta: {}, results: query().all(...params), success: true };
				}
				const result = query().run(...params);
				return {
					meta: { changes: result.changes },
					results: [],
					success: true,
				};
			};
			return {
				all: () => Promise.resolve(execute()),
				bind: (...values: SqlValue[]) => statement(sql, values),
				execute,
				first: (column?: string) => {
					const row = query().get(...params) as Record<string, unknown> | null;
					return Promise.resolve(column ? (row?.[column] ?? null) : row);
				},
				raw: () => Promise.resolve(query().values(...params)),
				run: () => Promise.resolve(execute()),
				sql,
			};
		};
		type Statement = ReturnType<typeof statement>;
		return {
			batch: (statements: Statement[]) => {
				for (const entry of statements) {
					this.batchedSql.push(entry.sql);
				}
				return Promise.resolve(
					this.database.transaction(() =>
						statements.map((entry) => entry.execute())
					)()
				);
			},
			exec: (sql: string) => {
				this.database.exec(sql);
				return Promise.resolve({ count: 1, duration: 0 });
			},
			prepare: (sql: string) => statement(sql),
		} as unknown as D1Database;
	}

	all<T>(sql: string, ...params: SqlValue[]): T[] {
		return this.database.query(sql).all(...params) as T[];
	}

	close(): void {
		this.database.close();
	}
}
