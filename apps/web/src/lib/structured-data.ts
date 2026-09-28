// JSON-LD blocks for route heads. The text comes partly from generated
// digests, so every "<" is escaped: a line containing "</script>" must not
// be able to end the tag it is written into.

export interface JsonLdScript {
	children: string;
	type: "application/ld+json";
}

export interface Crumb {
	name: string;
	url: string;
}

interface DigestLine {
	citations: readonly { url: string }[];
	takeaway: string;
}

const LESS_THAN_RE = /</g;

function jsonLd(data: Record<string, unknown>): JsonLdScript {
	return {
		children: JSON.stringify(data).replace(LESS_THAN_RE, "\\u003c"),
		type: "application/ld+json",
	};
}

export function breadcrumbList(crumbs: readonly Crumb[]): JsonLdScript {
	return jsonLd({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: crumbs.map((crumb, index) => ({
			"@type": "ListItem",
			item: crumb.url,
			name: crumb.name,
			position: index + 1,
		})),
	});
}

// A digest's lines as an ItemList, each linked to its first source.
export function digestItemList(params: {
	entries: readonly DigestLine[];
	name: string;
	url: string;
}): JsonLdScript | null {
	if (params.entries.length === 0) {
		return null;
	}
	return jsonLd({
		"@context": "https://schema.org",
		"@type": "ItemList",
		itemListElement: params.entries.map((entry, index) => ({
			"@type": "ListItem",
			name: entry.takeaway,
			position: index + 1,
			...(entry.citations[0] ? { url: entry.citations[0].url } : {}),
		})),
		name: params.name,
		numberOfItems: params.entries.length,
		url: params.url,
	});
}
