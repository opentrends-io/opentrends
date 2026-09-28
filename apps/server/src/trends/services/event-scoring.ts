import { getSourcePreset, isEventEligibleSource } from "../config/sources";
import { isLowValuePromotionText } from "./event-promotions";
import { independentSourceCount, sourceFamilyId } from "./event-source-family";

const HOT_NUMBER_RE = /(\d+(?:\.\d+)?)/;
const VERSION_TITLE_RE = /^v?\d+(?:\.\d+){1,3}(?:\b|$)/i;
const TECHNICAL_RESEARCH_TITLE_RE =
	/\b(?:arxiv|benchmark|benchmarks|dataset|datasets|paper|papers|quantization|calibration|uncertainty|reinforcement learning|rlhf|finetun(?:e|ing)|fine-tun(?:e|ing)|training|inference|token|tokens|embedding|embeddings|transformer|attention|diffusion|distillation|sft|lora|rag|eval|evaluation|reasoning model|vllm|cuda|kernel|agentic workflow|3d detection|object detection|segmentation|sampler|latency|throughput)\b/i;
export const CONSUMER_TECH_NEWS_RE =
	/\b(?:launch(?:es|ed)?|release(?:s|d)?|roll(?:s|ed)? out|announce(?:s|d)?|unveil(?:s|ed)?|introduce(?:s|d)?|ship(?:s|ped)?|preview(?:s|ed)?|upgrade(?:s|d)?|funding|raises?|acquir(?:es|ed|ing)|merger|ipo|lawsuit|sues?|regulat(?:e|es|ed|ion|ory)|ban(?:s|ned)?|deal|partnership|partners?|customer|users?|consumer|app|apps|phone|browser|device|robot|startup|company|market|pricing|subscription|api|assistant|chatbot|search|voice|video|image generator|agent|agents)\b/i;

const EXPERT_EVENT_FAMILIES = new Set([
	"anthropic-engineering",
	"anthropic-research",
	"apple-ml-research",
	"arxiv-cs-ai",
	"arxiv-cs-cl",
	"arxiv-cs-cv",
	"arxiv-cs-lg",
	"arxiv-cs-ne",
	"arxiv-eess-sy",
	"arxiv-q-bio-nc",
	"arxiv-robotics",
	"bair-blog",
	"berkeley-rdi",
	"cmu-ml-blog",
	"claude-blog",
	"claude-code-releases",
	"cloudflare-blog",
	"cursor-blog",
	"deepmind-blog",
	"eleutherai-blog",
	"google-developers-blog",
	"google-research-blog",
	"huggingface-blog",
	"huggingface-papers",
	"karpathy-blog",
	"latent-space",
	"lilian-weng",
	"lmsys-blog",
	"meta-engineering",
	"mozilla",
	"nvidia-ai-blog",
	"openai-alignment",
	"openai-research",
	"qwen-research",
	"reddit-localllama",
	"reddit-machinelearning",
	"reddit-reinforcementlearning",
	"sebastian-raschka",
	"simon-willison",
	"the-gradient",
	"transformer-circuits",
]);
const CONSUMER_TECH_NEWS_FAMILIES = new Set([
	"apnews-technology",
	"ars-technica",
	"axios",
	"bbc-news",
	"bloomberg",
	"business-insider",
	"engadget",
	"mit-tech-review",
	"nytimes",
	"reuters",
	"techcrunch",
	"the-decoder",
	"the-register",
	"the-verge",
	"venturebeat",
	"wired",
	"wsj",
]);
const SINGLE_SOURCE_NEWS_EVENT_FAMILIES = new Set([
	...CONSUMER_TECH_NEWS_FAMILIES,
	"anthropic-news",
	"apple-newsroom",
	"google-ai-blog",
	"meta-ai-blog",
	"openai-news",
	"runway-news",
	"xai-news",
]);
const T1_FIRST_PARTY_FAMILIES = new Set([
	"anthropic-engineering",
	"anthropic-news",
	"anthropic-research",
	"apple-ml-research",
	"apple-newsroom",
	"claude-blog",
	"claude-code-releases",
	"cloudflare-blog",
	"deepmind-blog",
	"github-blog",
	"google-ai-blog",
	"google-developers-blog",
	"google-research-blog",
	"huggingface-blog",
	"meta-ai-blog",
	"meta-engineering",
	"nvidia-ai-blog",
	"openai-alignment",
	"openai-news",
	"openai-research",
	"qwen-research",
	"runway-news",
	"xai-news",
]);

export type EventSourceTier = "t1" | "t15" | "t2" | "unknown";

export interface EventCandidate {
	contentHash: string;
	contentText: string | null;
	description: string | null;
	embedding: number[] | null;
	fetchedAt: Date;
	hotValue: string | number | null;
	itemId: string;
	publishedAt: Date | null;
	rank: number;
	sourceId: string;
	textHash: string | null;
	title: string;
	url: string;
}

export interface EventCluster {
	eventId: string;
	firstSeenAt: Date;
	items: Array<EventCandidate & { confidence: number }>;
	lastSeenAt: Date;
	primary: EventCandidate;
}

function itemAudienceText(item: EventCandidate): string {
	return `${item.title}\n${item.description ?? ""}`;
}

function isLowValuePromotionItem(item: EventCandidate): boolean {
	return isLowValuePromotionText(itemAudienceText(item), item.sourceId);
}

function isLowValuePromotionCluster(cluster: EventCluster): boolean {
	if (isLowValuePromotionItem(cluster.primary)) {
		return true;
	}
	const promoItemCount = cluster.items.filter(isLowValuePromotionItem).length;
	return promoItemCount > 0 && promoItemCount >= cluster.items.length / 2;
}

function isExpertEventSource(sourceId: string): boolean {
	return EXPERT_EVENT_FAMILIES.has(sourceFamilyId(sourceId));
}

function isConsumerTechNewsSource(sourceId: string): boolean {
	return (
		isEventEligibleSource(sourceId) ||
		CONSUMER_TECH_NEWS_FAMILIES.has(sourceFamilyId(sourceId))
	);
}

export function sourceSignalTier(
	sourceId: string | null | undefined
): EventSourceTier {
	if (!sourceId) {
		return "unknown";
	}
	const familyId = sourceFamilyId(sourceId);
	if (T1_FIRST_PARTY_FAMILIES.has(familyId)) {
		return "t1";
	}
	if (isExpertEventSource(sourceId)) {
		return "t15";
	}
	if (isEventEligibleSource(sourceId) || isConsumerTechNewsSource(sourceId)) {
		return "t2";
	}
	return "unknown";
}

function hasConsumerTechNewsSource(cluster: EventCluster): boolean {
	return cluster.items.some((item) => isConsumerTechNewsSource(item.sourceId));
}

function hasConsumerTechNewsSignal(cluster: EventCluster): boolean {
	return cluster.items.some(
		(item) =>
			isConsumerTechNewsSource(item.sourceId) ||
			CONSUMER_TECH_NEWS_RE.test(itemAudienceText(item))
	);
}

function hasTitleNewsSignal(item: EventCandidate): boolean {
	return (
		isConsumerTechNewsSource(item.sourceId) ||
		CONSUMER_TECH_NEWS_RE.test(item.title)
	);
}

function isTechnicalResearchItem(item: EventCandidate): boolean {
	return (
		isExpertEventSource(item.sourceId) ||
		TECHNICAL_RESEARCH_TITLE_RE.test(itemAudienceText(item))
	);
}

function isExpertOnlyCluster(cluster: EventCluster): boolean {
	return cluster.items.every(isTechnicalResearchItem);
}

function isSingleSourceEventSource(sourceId: string): boolean {
	return (
		isEventEligibleSource(sourceId) ||
		SINGLE_SOURCE_NEWS_EVENT_FAMILIES.has(sourceFamilyId(sourceId))
	);
}

export function itemTime(item: EventCandidate): Date {
	return item.publishedAt ?? item.fetchedAt;
}

export function choosePrimary(
	a: EventCandidate,
	b: EventCandidate
): EventCandidate {
	const aTime = itemTime(a).getTime();
	const bTime = itemTime(b).getTime();
	const aRankScore = itemRankScore(a);
	const bRankScore = itemRankScore(b);
	if (aRankScore !== bRankScore) {
		return aRankScore > bRankScore ? a : b;
	}
	const aHotScore = itemHotScore(a);
	const bHotScore = itemHotScore(b);
	if (aHotScore !== bHotScore) {
		return aHotScore > bHotScore ? a : b;
	}
	if (aTime !== bTime) {
		return aTime > bTime ? a : b;
	}
	return a.title.length >= b.title.length ? a : b;
}

export function sourceQualityScore(sourceId: string): number {
	const preset = getSourcePreset(sourceId);
	if (!preset) {
		return 0;
	}
	let refreshScore = 4;
	if (preset.refresh === "hot") {
		refreshScore = 12;
	} else if (preset.refresh === "community") {
		refreshScore = 10;
	} else if (preset.refresh === "daily") {
		refreshScore = 8;
	} else if (preset.refresh === "rss") {
		refreshScore = 6;
	}
	let providerScore = 4;
	if (preset.provider === "native") {
		providerScore = 6;
	} else if (preset.provider === "rsshub") {
		providerScore = 5;
	}
	let audienceScore = 0;
	if (isConsumerTechNewsSource(sourceId)) {
		audienceScore = 10;
	} else if (isExpertEventSource(sourceId)) {
		audienceScore = -8;
	}
	return Math.max(0, refreshScore + providerScore + audienceScore);
}

export function itemRankScore(item: Pick<EventCandidate, "rank">): number {
	if (item.rank <= 0) {
		return 0;
	}
	if (item.rank <= 3) {
		return 40 - item.rank * 3;
	}
	if (item.rank <= 10) {
		return 26 - item.rank;
	}
	if (item.rank <= 30) {
		return Math.max(0, 12 - Math.floor((item.rank - 10) / 2));
	}
	return 0;
}

function parseHotNumber(value: string | number | null): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.abs(value);
	}
	if (typeof value !== "string") {
		return 0;
	}
	const normalized = value.replaceAll(",", "").trim().toLowerCase();
	const match = normalized.match(HOT_NUMBER_RE);
	if (!match) {
		return normalized.includes("important") || normalized.includes("✰")
			? 100
			: 0;
	}
	let unit = 1;
	if (normalized.includes("亿") || normalized.includes("b")) {
		unit = 100_000_000;
	} else if (normalized.includes("万") || normalized.includes("m")) {
		unit = 10_000;
	} else if (normalized.includes("k")) {
		unit = 1000;
	}
	return Number.parseFloat(match[1] ?? "0") * unit;
}

export function itemHotScore(item: Pick<EventCandidate, "hotValue">): number {
	const hot = parseHotNumber(item.hotValue);
	return hot > 0 ? Math.min(42, Math.round(Math.log10(hot + 1) * 8)) : 0;
}

function bestItemSignalScore(cluster: EventCluster): number {
	return Math.max(
		...cluster.items.map(
			(item) =>
				itemRankScore(item) +
				itemHotScore(item) +
				sourceQualityScore(item.sourceId)
		)
	);
}

function clusterPropagationScore(cluster: EventCluster): number {
	const uniqueSources = independentSourceCount(cluster.items);
	if (uniqueSources <= 1) {
		return 0;
	}
	const sourceScore = 52 + (uniqueSources - 2) * 24;
	const itemScore = Math.min(cluster.items.length - uniqueSources, 6) * 5;
	return sourceScore + itemScore;
}

export function scoreCluster(cluster: EventCluster): number {
	const uniqueSources = independentSourceCount(cluster.items);
	const freshnessHours = Math.max(
		0,
		(Date.now() - cluster.lastSeenAt.getTime()) / 3_600_000
	);
	const freshnessScore = Math.max(0, 24 - freshnessHours / 2);
	const qualityScore =
		cluster.items.reduce(
			(total, item) =>
				total +
				itemRankScore(item) +
				itemHotScore(item) +
				sourceQualityScore(item.sourceId),
			0
		) / Math.max(1, cluster.items.length);
	const audiencePenalty =
		isExpertOnlyCluster(cluster) && !hasConsumerTechNewsSignal(cluster)
			? 36
			: 0;
	const audienceBoost = hasConsumerTechNewsSignal(cluster) ? 16 : 0;
	return Math.round(
		clusterPropagationScore(cluster) +
			Math.min(90, bestItemSignalScore(cluster)) +
			Math.min(45, qualityScore) +
			Math.min(24, freshnessScore) +
			(uniqueSources >= 2 ? 18 : 0) +
			audienceBoost -
			audiencePenalty
	);
}

export function isFeedWorthyCluster(cluster: EventCluster): boolean {
	const uniqueSources = independentSourceCount(cluster.items);
	const score = scoreCluster(cluster);
	const bestRank = Math.min(...cluster.items.map((item) => item.rank));
	const hasNewsSignal = hasConsumerTechNewsSignal(cluster);
	const expertOnly = isExpertOnlyCluster(cluster);
	if (isLowValuePromotionCluster(cluster)) {
		return false;
	}
	if (expertOnly && !hasNewsSignal) {
		return false;
	}
	if (uniqueSources >= 2) {
		if (expertOnly && !hasConsumerTechNewsSource(cluster)) {
			return false;
		}
		return score >= (expertOnly ? 145 : 118);
	}
	if (!isSingleSourceEventSource(cluster.primary.sourceId)) {
		return false;
	}
	if (isExpertEventSource(cluster.primary.sourceId)) {
		return false;
	}
	if (!hasNewsSignal) {
		return false;
	}
	if (
		isExpertEventSource(cluster.primary.sourceId) &&
		(!hasTitleNewsSignal(cluster.primary) ||
			TECHNICAL_RESEARCH_TITLE_RE.test(cluster.primary.title))
	) {
		return false;
	}
	return (
		score >= (isExpertEventSource(cluster.primary.sourceId) ? 112 : 86) &&
		bestRank <= 15 &&
		cluster.primary.title.trim().length >= 18 &&
		!VERSION_TITLE_RE.test(cluster.primary.title.trim())
	);
}

export function summarizeCluster(cluster: EventCluster): string | null {
	const descriptions = [cluster.primary, ...cluster.items]
		.map((item) => item.description?.trim())
		.filter((value): value is string => Boolean(value));
	return descriptions[0]?.slice(0, 280) ?? null;
}
