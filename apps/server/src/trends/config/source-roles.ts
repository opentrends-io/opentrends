// What kind of place a source is, for readers weighing a story's coverage:
// the organisation's own channel, the press, an individual author, a
// community, a hot list or a journal. The refresh class gives a default;
// the lists below name the sources it cannot tell apart.
export type SourceRole =
	| "author"
	| "community"
	| "hot"
	| "journal"
	| "official"
	| "press";

export const SOURCE_ROLES: readonly SourceRole[] = [
	"official",
	"press",
	"author",
	"community",
	"journal",
	"hot",
];

// Companies, labs and projects publishing about their own work.
const OFFICIAL_SOURCE_IDS = new Set<string>([
	"adafruit",
	"anthropic-engineering",
	"anthropic-news",
	"anthropic-research",
	"ant-bailing-blog",
	"apple-ml-research",
	"apple-newsroom",
	"bair-blog",
	"berkeley-rdi",
	"boston-dynamics",
	"bytedance-seed",
	"claude-blog",
	"claude-code-releases",
	"cloudflare-blog",
	"cmu-ml-blog",
	"cursor-blog",
	"deeplearning-the-batch",
	"deepmind-blog",
	"deepseek-github",
	"descript-blog",
	"eleutherai-blog",
	"github-blog",
	"google-ai-blog",
	"google-developers-blog",
	"google-research-blog",
	"huggingface-blog",
	"inclusionai-huggingface",
	"kimi-updates",
	"lmsys-blog",
	"meituan-longcat",
	"meta-ai-blog",
	"meta-engineering",
	"midjourney-updates",
	"minimax-news",
	"mit-news-robotics",
	"mozilla-ai",
	"nvidia-ai-blog",
	"nvidia-blog",
	"nvidia-dev-robotics",
	"nvidia-news-robotics",
	"open-robotics-blog",
	"openai-academy",
	"openai-alignment",
	"openai-cookbook",
	"openai-news",
	"openai-research",
	"openrouter-announcements",
	"qwen-blog",
	"qwen-research",
	"runway-changelog",
	"runway-news",
	"servicenow-ai",
	"stackoverflow-blog",
	"suno-blog",
	"tencent-hunyuan",
	"tindie-blog",
	"transformer-circuits",
	"xai-news",
	"zhipu-research",
]);

// People writing under their own name.
const AUTHOR_SOURCE_IDS = new Set<string>([
	"daring-fireball",
	"dario-amodei",
	"dwarkesh-patel",
	"gary-marcus",
	"interconnects",
	"karpathy-blog",
	"latent-space",
	"lilian-weng",
	"one-useful-thing",
	"ruanyifeng-weekly",
	"sam-altman",
	"sebastian-raschka",
	"simon-willison",
	"tomer-tunguz",
]);

// Forums and member-written sites that arrive over a plain feed.
const COMMUNITY_SOURCE_IDS = new Set<string>([
	"devto",
	"indiehackers",
	"lobsters",
	"lobsters-ai",
	"planet-ros",
	"ros-discourse",
]);

// Aggregators and rankings that arrive over a plain feed: kept as a
// reference for what people are reading, like the hot lists.
const HOT_SOURCE_IDS = new Set<string>(["google-news"]);

// Journals that arrive over a plain feed rather than the slow class.
const JOURNAL_SOURCE_IDS = new Set<string>([
	"frontiers-human-neuro",
	"frontiers-neuroscience",
	"nature",
]);

function roleFromRefresh(refresh: string): SourceRole {
	switch (refresh) {
		case "community":
			return "community";
		case "hot":
			return "hot";
		case "slow":
			return "journal";
		default:
			return "press";
	}
}

export function sourceRole(sourceId: string, refresh: string): SourceRole {
	if (OFFICIAL_SOURCE_IDS.has(sourceId)) {
		return "official";
	}
	if (AUTHOR_SOURCE_IDS.has(sourceId)) {
		return "author";
	}
	if (HOT_SOURCE_IDS.has(sourceId)) {
		return "hot";
	}
	if (COMMUNITY_SOURCE_IDS.has(sourceId)) {
		return "community";
	}
	if (JOURNAL_SOURCE_IDS.has(sourceId)) {
		return "journal";
	}
	return roleFromRefresh(refresh);
}
