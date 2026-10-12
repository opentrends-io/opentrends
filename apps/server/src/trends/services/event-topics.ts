// Which topics an event belongs to. A vertical source (The Verge · AI,
// TechCrunch Robotics) speaks for its topic. A general outlet filed under
// one topic (Engadget and Wired under hardware, Singularity Hub under
// biotech) writes about everything, so its topic applies only when the story
// is about it; otherwise what the story is about decides. Featured and
// Chinese follow the source: they are editions, not subjects.

const GENERAL_OUTLETS = new Set([
	"ars-technica",
	"big-think",
	"engadget",
	"gizmodo",
	"quanta-magazine",
	"singularity-hub",
	"toms-hardware",
	"wired",
	"wired-science",
]);

const SOURCE_BOUND_TOPICS = new Set(["featured", "cn"]);

interface TopicProfile {
	/** Case-sensitive terms (acronyms). */
	exact?: RegExp;
	terms: RegExp;
}

const TOPIC_PROFILES: Readonly<Record<string, TopicProfile>> = {
	ai: {
		exact: /\b(?:AI|A\.I\.|LLMs?|AGI)\b/,
		terms:
			/\b(?:artificial intelligence|GPT-?\d[\w.]*|ChatGPT|OpenAI|Anthropic|Claude|Gemini|DeepMind|Copilot|machine learning|neural net\w*|chatbots?|AI agents?|agentic|Grok|xAI|Llama|Mistral|superintelligen\w*|language models?)\b|人工智能|大模型|智能体|机器学习|语言模型/i,
	},
	biotech: {
		exact: /\b(?:FDA|DNA|RNA|mRNA|CRISPR|GLP-1|NASA)\b/,
		terms:
			/\b(?:crispr|drugs?|clinical(?: trials?)?|(?:drug|phase [\w-]+) trials?|genes?|genetic\w*|genom\w*|proteins?|cells?|cancers?|tumou?rs?|vaccines?|diseases?|patients?|brains?|neuro\w*|medical|medicine|biolog\w*|virus\w*|bacteri\w*|obesity|weight[- ]loss|diabetes|alzheimer\w*|antibod\w*|species|fossils?|physics|physicists?|quantum|astronom\w*|planets?|climate)\b|药|基因|蛋白|细胞|癌|疫苗|疾病|患者|医疗|医学|大脑|神经|生物|物理/i,
	},
	embodied: {
		terms:
			/\b(?:robots?|robotic\w*|humanoids?|drones?|self-driving|autonomous (?:vehicles?|driving|cars?)|robotaxis?|exoskeletons?)\b|机器人|机器狗|人形|具身|无人机|自动驾驶/i,
	},
	hardware: {
		exact: /\b(?:CPUs?|GPUs?|SSDs?|RAM|TSMC|AMD|RTX|PS5|EVs?|TVs?|PCs?)\b/,
		terms:
			/\b(?:chips?|processors?|semiconductors?|laptops?|smartphones?|phones?|iPhone|iPad|MacBook|Mac mini|Pixel|Galaxy|tablets?|consoles?|PlayStation|Xbox|Nintendo|headphones?|earbuds|monitors?|cameras?|wearables?|smartwatch\w*|routers?|batter(?:y|ies)|e-?readers?|Kindle|keyboards?|gadgets?|Snapdragon|Intel|Qualcomm|Nvidia|Ryzen|docking stations?|speakers?|electric vehicles?|vacuums?|appliances?|smart home|coolers?|cooling|motherboards?)\b|芯片|处理器|显卡|手机|笔记本|电脑|平板|耳机|手表|电视|相机|硬件|半导体|电池|路由器/i,
	},
	programming: {
		exact: /\b(?:APIs?|SDKs?|IDEs?|npm)\b/,
		terms:
			/\b(?:developers?|programming|programmers?|coding|source code|software engineer\w*|open[- ]source|GitHub|frameworks?|JavaScript|TypeScript|Python|Rust|Kotlin|compilers?|databases?|Kubernetes|DevOps|VS Code|Vite|React|Svelte\w*|Linux|release candidate)\b|编程|开发者|代码|开源|框架|程序员/i,
	},
};

export interface TopicItem {
	description: string | null;
	sourceId: string;
	title: string;
}

function termsIn(profile: TopicProfile, text: string): Set<string> {
	const found = new Set<string>();
	for (const pattern of [profile.exact, profile.terms]) {
		if (!pattern) {
			continue;
		}
		const global = new RegExp(pattern.source, `${pattern.flags}g`);
		for (const match of text.matchAll(global)) {
			found.add(match[0].toLowerCase());
		}
	}
	return found;
}

// A story is about a topic when its title names it, or its description
// names it twice over: one stray word in a description ("today's climate",
// "anti-vaccine", a company called Forced Physics) is not a subject.
function isAbout(topicId: string, items: readonly TopicItem[]): boolean {
	const profile = TOPIC_PROFILES[topicId];
	if (!profile) {
		return true;
	}
	const titles = items.map((item) => item.title).join("\n");
	if (termsIn(profile, titles).size > 0) {
		return true;
	}
	const descriptions = items.map((item) => item.description ?? "").join("\n");
	return termsIn(profile, descriptions).size >= 2;
}

// Topics the reports' sources give the event: all of a vertical source's,
// a general outlet's only when the story is about them (the others are kept
// aside as a last resort).
function sourceTopics(
	items: readonly TopicItem[],
	topicsBySource: ReadonlyMap<string, readonly string[]>
): { outletOnly: Set<string>; topics: Set<string> } {
	const topics = new Set<string>();
	const outletOnly = new Set<string>();
	for (const item of items) {
		const general = GENERAL_OUTLETS.has(item.sourceId);
		for (const topicId of topicsBySource.get(item.sourceId) ?? []) {
			const followsSource = SOURCE_BOUND_TOPICS.has(topicId) || !general;
			if (followsSource || isAbout(topicId, items)) {
				topics.add(topicId);
			} else {
				outletOnly.add(topicId);
			}
		}
	}
	return { outletOnly, topics };
}

function hasSubject(topics: ReadonlySet<string>): boolean {
	return [...topics].some((topicId) => !SOURCE_BOUND_TOPICS.has(topicId));
}

export function eventTopicIds(
	items: readonly TopicItem[],
	topicsBySource: ReadonlyMap<string, readonly string[]>,
	topicOrder: readonly string[]
): string[] {
	const { outletOnly, topics } = sourceTopics(items, topicsBySource);
	if (!hasSubject(topics) && outletOnly.size > 0) {
		const aboutTopics = Object.keys(TOPIC_PROFILES).filter((topicId) =>
			isAbout(topicId, items)
		);
		// About nothing we can name: the outlet's own topic, as before.
		for (const topicId of aboutTopics.length > 0 ? aboutTopics : outletOnly) {
			topics.add(topicId);
		}
	}
	return topicOrder.filter((topicId) => topics.has(topicId));
}
