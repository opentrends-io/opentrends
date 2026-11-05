// Guides, how-tos and explainers are useful reading but not something that
// happened: a single publisher's "How to prepare for One UI 9" or "The 6 best
// docking stations (2026)" does not belong in a list of events.
const EVERGREEN_EN_RE =
	/\b(?:how to|here[’']s how|how (?:do|does|did) [\w\s'’-]{2,60} (?:work|happen)|explained|explainer|a guide to|buying guide|gift guide|the \d+ best|best \d+|the best [\w\s'’-]{2,50} (?:for|of|in|to buy) (?:20\d\d|you)|should you (?:buy|upgrade|wait)|don[’']t throw (?:away|out)|tips (?:for|to)|things to know|everything (?:you need to know|we know)|is it worth|what to expect)\b|\(20\d\d\)\s*$/i;
const EVERGREEN_ZH_RE =
	/如何|怎么(?:办|做|选|用)|指南|教程|攻略|值得买|最佳\s*\d+\s*款|盘点|须知|你需要知道/;

export function isEvergreenText(title: string): boolean {
	return EVERGREEN_EN_RE.test(title) || EVERGREEN_ZH_RE.test(title);
}
