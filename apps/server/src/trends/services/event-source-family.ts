// Section feeds of one publisher carry the same articles, so they count as a
// single source: an event is only covered by "multiple sources" when two
// different publishers report it.
const SECTION_FEED_PUBLISHERS: Readonly<Record<string, string>> = {
	"engadget-robotics": "engadget",
	"ieee-biomedical": "ieee-spectrum",
	"ieee-robotics": "ieee-spectrum",
	"mit-tech-review-bio": "mit-tech-review",
	"techcrunch-robotics": "techcrunch",
	"the-verge-gadgets": "the-verge",
	"wired-science": "wired",
};
const FAMILY_SUFFIXES = ["-weekly", "-daily", "-ai"] as const;

export function sourceFamilyId(sourceId: string): string {
	const publisher = SECTION_FEED_PUBLISHERS[sourceId];
	if (publisher) {
		return publisher;
	}
	if (sourceId.startsWith("github-trending")) {
		return "github-trending";
	}
	if (sourceId.startsWith("hackernews")) {
		return "hackernews";
	}
	if (sourceId.startsWith("bilibili-")) {
		return "bilibili";
	}
	for (const suffix of FAMILY_SUFFIXES) {
		if (sourceId.endsWith(suffix)) {
			return sourceId.slice(0, -suffix.length);
		}
	}
	return sourceId;
}

export function independentSourceCount(
	items: ReadonlyArray<{ sourceId: string }>
): number {
	return new Set(items.map((item) => sourceFamilyId(item.sourceId))).size;
}
