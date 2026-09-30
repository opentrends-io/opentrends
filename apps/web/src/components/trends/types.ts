export type SourceStatus = "ok" | "stale" | "error";

export interface NewsItem {
	description?: string;
	fetchedAt: number;
	hotValue?: string | number;
	id: string;
	imageUrl?: string;
	original?: {
		description?: string;
		title: string;
	};
	publishedAt?: number;
	rank?: number;
	sourceId: string;
	title: string;
	url: string;
}

export type SourceKind = "ranking" | "feed";

export interface SourceCardData {
	errorMessage?: string;
	eventEligible?: boolean;
	expiresAt?: number;
	homeUrl?: string;
	itemCount?: number;
	items: NewsItem[];
	itemsTruncated?: boolean;
	// A ranking keeps the platform's own order (hot lists, trending); a
	// feed is newest first.
	kind?: SourceKind;
	sourceId: string;
	staleUntil?: number;
	status: SourceStatus;
	title: string;
	updatedAt?: number;
}

export interface TrendsSectionData {
	id: string;
	sources: SourceCardData[];
	title: string;
}

export interface TrendsPageData {
	description?: string;
	id: string;
	sections: TrendsSectionData[];
	title: string;
	updatedAt: number;
}

export interface EventFeedPublisher {
	firstAt: string;
	homeUrl?: string;
	id: string;
	latestAt: string;
	title: string;
}

/** stories: two or more publishers, by heat. briefs: one publisher, newest first. */
export type EventFeedView = "stories" | "briefs";

export interface EventFeedItem {
	eventId: string;
	firstSeenAt: string;
	heat?: number;
	imageUrl?: string;
	lastSeenAt: string;
	original?: {
		summary?: string;
		title: string;
	};
	primarySource?: {
		imageUrl?: string;
		sourceId: string;
		title: string;
		url: string;
	};
	publishers?: EventFeedPublisher[];
	score: number;
	selectionReason?:
		| "high_score"
		| "multiple_sources"
		| "official_source"
		| "selected"
		| "strong_source";
	sourceCount: number;
	sources: Array<{
		homeUrl?: string;
		sourceId: string;
		title: string;
	}>;
	summary?: string;
	title: string;
	topicId: string;
	topicIds?: string[];
}

export interface EventFeedData {
	events: EventFeedItem[];
	nextOffset?: number;
}

export interface EventDetailData {
	eventId: string;
	firstSeenAt: string;
	lastSeenAt: string;
	original?: {
		summary?: string;
		title: string;
	};
	processing: {
		embeddedItemCount: number;
		embeddingModel: string;
		enrichedItemCount: number;
		inputItemCount: number;
		itemLimit: number;
		lookbackHours: number;
		mergeRules: {
			similarityThreshold: number;
			timeWindowHours: number;
		};
		scoreInputs: {
			itemScore: number;
			sourceScore: number;
			uniqueSourceCount: number;
		};
		steps: Array<{
			detail: string;
			label: string;
			status: "done" | "pending" | "skipped";
		}>;
	};
	score: number;
	sourceItems: Array<{
		contentFetchedAt?: string;
		contentStatus: string;
		description?: string;
		embeddingModel?: string;
		hasEmbedding: boolean;
		itemId: string;
		imageUrl?: string;
		isPrimary: boolean;
		mergeConfidence: number;
		original?: {
			description?: string;
			title: string;
		};
		publishedAt?: string;
		sourceId: string;
		textHash?: string;
		title: string;
		url: string;
	}>;
	summary?: string;
	title: string;
	topicId: string;
}

export interface ArchivedDigestCitation {
	n: number;
	topic?: string;
	url: string;
}

export interface ArchivedDigestEntry {
	citations: ArchivedDigestCitation[];
	n: number;
	reason?: string;
	takeaway: string;
}

// One archived day of a topic's digest, from /api/trends/:topic/digest/:day.
export interface ArchivedDigestData {
	at: number;
	day: string;
	entries: ArchivedDigestEntry[];
	lang: string;
	markdown: string;
	topic: string;
}

// A source's own page, from /api/sources/:id.
export interface SourceDetailData {
	card: SourceCardData | null;
	homeUrl?: string;
	lang: string;
	name: string;
	note?: string;
	provider: "native" | "rsshub" | "rss";
	refresh: string;
	sourceId: string;
	topics: Array<{ id: string; title: string }>;
}

// A finished digest as the JSON endpoint returns it; read once on the
// server so the ten lines are in the first HTML.
export interface DigestJsonData {
	entries: ArchivedDigestEntry[];
	lang: string;
	markdown: string;
	topic: string;
	window: string;
}

export type EventPageLang = "en" | "zh";

export interface EventPageSource {
	publishedAt?: string;
	publisher: string;
	publisherName: string;
	sourceId: string;
	title: string;
	url: string;
}

export interface EventPageContent {
	description: string;
	divergence: string;
	faq: Array<{ answer: string; question: string }>;
	headline: string;
	summary: string;
	timeline: Array<{ date: string; sourceUrls: string[]; text: string }>;
	title: string;
}

// A published event page, from /api/event-pages/:slug.
export interface EventPageView {
	content: Record<EventPageLang, EventPageContent>;
	firstReportedAt: string;
	keyword: string;
	lastReportedAt: string;
	publishedAt: string;
	slug: string;
	sources: EventPageSource[];
	topicIds: string[];
	updatedAt: string;
}

// One entry of /api/event-pages.
export interface EventPageSummary {
	description: Record<EventPageLang, string>;
	keyword: string;
	publishedAt: string;
	slug: string;
	title: Record<EventPageLang, string>;
	topicIds: string[];
	updatedAt: string;
}
