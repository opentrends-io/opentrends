import { normalizeEventText } from "./event-text";

// Roundups gather many stories in one post: a daily "早报", a newsletter
// issue, a week in review. They are not one event, and their titles share
// words with half the day's news, so they are kept out of event merging.
// "日报" is left out on purpose: "人民日报：……" names a newspaper, not a digest.

const CHINESE_ROUNDUP_RE =
	/(?:早报|午报|晚报|周报|周刊|月报|简报|快讯合集|新闻速递|一周(?:回顾|要闻|热点))(?:\s*[|｜：:（(]|$)|^(?:派|爱范儿|36氪)?(?:早报|晚报)/;
const ENGLISH_ROUNDUP_RE =
	/^(?:the download:|daily crunch:|\[ainews\]|this week in [\w\s-]{1,30}:|last week in [\w\s-]{1,30}|week in review\b|the week in [\w\s-]{1,30}:|(?:morning|evening|daily|weekly) (?:brief|briefing|digest|roundup|recap)\b|(?:news|weekly|daily) roundup\b)/i;

export function isRoundupItem(item: {
	sourceId: string;
	title: string;
}): boolean {
	const title = normalizeEventText(item.title).trim();
	return CHINESE_ROUNDUP_RE.test(title) || ENGLISH_ROUNDUP_RE.test(title);
}
