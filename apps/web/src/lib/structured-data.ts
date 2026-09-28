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

const PUBLISHER = {
	"@type": "Organization",
	name: "OpenTrends",
	url: "https://opentrends.io",
} as const;

// An event page: written by OpenTrends from the reports it cites.
export function newsArticle(params: {
	citations: readonly string[];
	dateModified: string;
	datePublished: string;
	description: string;
	headline: string;
	inLanguage: string;
	url: string;
}): JsonLdScript {
	return jsonLd({
		"@context": "https://schema.org",
		"@type": "NewsArticle",
		author: PUBLISHER,
		citation: params.citations,
		dateModified: params.dateModified,
		datePublished: params.datePublished,
		description: params.description,
		headline: params.headline,
		inLanguage: params.inLanguage,
		mainEntityOfPage: params.url,
		publisher: PUBLISHER,
	});
}

export function faqPage(
	entries: ReadonlyArray<{ answer: string; question: string }>
): JsonLdScript | null {
	if (entries.length === 0) {
		return null;
	}
	return jsonLd({
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: entries.map((entry) => ({
			"@type": "Question",
			acceptedAnswer: { "@type": "Answer", text: entry.answer },
			name: entry.question,
		})),
	});
}
