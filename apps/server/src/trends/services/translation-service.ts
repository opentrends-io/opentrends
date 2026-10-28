// Durable per-language ownership bounds queue fan-out independently of the
// per-subject lease and global paid-call limits. Cron recovers lost deliveries.
const LANE_LEASE_MS = 180_000;
export async function reserveTranslationWake(
	database: D1Database,
	lang: "zh" | "en",
	now = Date.now()
): Promise<boolean> {
	const result = await database
		.prepare(
			"UPDATE translation_lane SET wake_until=? WHERE lang=? AND wake_until<=? AND lease_until<=?"
		)
		.bind(now + LANE_LEASE_MS, lang, now, now)
		.run();
	return (result.meta.changes ?? 0) === 1;
}
export async function releaseTranslationWake(
	database: D1Database,
	lang: "zh" | "en"
): Promise<void> {
	await database
		.prepare(
			"UPDATE translation_lane SET wake_until=0 WHERE lang=? AND lease_until=0"
		)
		.bind(lang)
		.run();
}
export async function claimTranslationLane(
	database: D1Database,
	lang: "zh" | "en",
	now = Date.now()
): Promise<string | null> {
	const owner = crypto.randomUUID();
	const result = await database
		.prepare(
			"UPDATE translation_lane SET lease_owner=?,lease_until=?,consumer_seen_at=? WHERE lang=? AND lease_until<=?"
		)
		.bind(owner, now + LANE_LEASE_MS, now, lang, now)
		.run();
	return (result.meta.changes ?? 0) === 1 ? owner : null;
}
export async function touchTranslationLane(
	database: D1Database,
	lang: "zh" | "en",
	owner: string,
	progressed = false,
	now = Date.now()
): Promise<boolean> {
	const result = await database
		.prepare(
			"UPDATE translation_lane SET consumer_seen_at=?,lease_until=?,progress_at=CASE WHEN ? THEN ? ELSE progress_at END WHERE lang=? AND lease_owner=? AND lease_until>?"
		)
		.bind(now, now + LANE_LEASE_MS, progressed ? 1 : 0, now, lang, owner, now)
		.run();
	return (result.meta.changes ?? 0) === 1;
}
export async function releaseTranslationLane(
	database: D1Database,
	lang: "zh" | "en",
	owner: string
): Promise<void> {
	await database
		.prepare(
			"UPDATE translation_lane SET lease_until=0,wake_until=0 WHERE lang=? AND lease_owner=?"
		)
		.bind(lang, owner)
		.run();
}
