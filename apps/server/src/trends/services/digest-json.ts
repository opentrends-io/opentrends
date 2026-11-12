import type { Citation } from "./get-trends-summary";

// The digest as data, for agents and scripts: one entry per line of the
// Markdown list, with the citations resolved to links. Mirrors the parsing
// the share image does on the client.
export interface DigestJsonCitation {
	n: number;
	topic?: string;
	url: string;
}

export interface DigestJsonEntry {
	citations: DigestJsonCitation[];
	n: number;
	reason?: string;
	takeaway: string;
}

const ENTRY_RE = /^\s*(\d+)[.)]\s+(.*)$/;
const CITATION_RE = /\[(\d+)\]/g;
const HAS_CITATION_RE = /\[\d+\]/;
const BOLD_LEAD_RE = /^\*\*(.+?)\*\*\s*(?:[—–-]+\s*)?(.*)$/;
const BOLD_MARK_RE = /\*\*/g;
const TRAILING_PERIOD_RE = /[\s.。]+$/;

export function parseDigestEntries(
	markdown: string,
	citations: readonly Citation[]
): DigestJsonEntry[] {
	const byNumber = new Map(citations.map((citation) => [citation.n, citation]));
	const entries: DigestJsonEntry[] = [];
	for (const line of markdown.split("\n")) {
		const match = ENTRY_RE.exec(line);
		if (!match?.[2]) {
			continue;
		}
		const cited = new Map<number, DigestJsonCitation>();
		for (const hit of match[2].matchAll(CITATION_RE)) {
			const n = Number.parseInt(hit[1] ?? "", 10);
			const citation = byNumber.get(n);
			if (citation && !cited.has(n)) {
				cited.set(n, citation);
			}
		}
		const body = match[2].replace(CITATION_RE, "").trim();
		const lead = BOLD_LEAD_RE.exec(body);
		const takeaway = lead?.[1]?.trim() ?? body.replace(BOLD_MARK_RE, "");
		const reason = lead?.[2]?.replace(TRAILING_PERIOD_RE, "").trim();
		entries.push({
			citations: [...cited.values()],
			n: Number.parseInt(match[1] ?? "", 10),
			reason: reason || undefined,
			takeaway,
		});
	}
	return entries;
}

// A digest is published only if its lines can be traced: every entry must
// cite at least one item that was actually in the prompt. A line the model
// left without a usable citation (an aside in brackets, a number outside
// the list) is dropped and the rest renumbered; numbers outside the list are
// removed from the lines that stay. Too many such lines and the digest is
// rejected so the caller can retry or keep the last good one.
const MAX_DROPPED_ENTRIES = 2;
const MIN_KEPT_ENTRIES = 3;

export interface CitationCheck {
	dropped: number;
	text: string;
}

export function enforceDigestCitations(
	markdown: string,
	citations: readonly Citation[]
): CitationCheck | null {
	if (citations.length === 0) {
		return { dropped: 0, text: markdown };
	}
	const known = new Set(citations.map((citation) => citation.n));
	const lines: string[] = [];
	let kept = 0;
	let dropped = 0;
	for (const line of markdown.split("\n")) {
		const match = ENTRY_RE.exec(line);
		if (!match?.[2]) {
			lines.push(line);
			continue;
		}
		const body = match[2].replace(CITATION_RE, (tag, number: string) =>
			known.has(Number.parseInt(number, 10)) ? tag : ""
		);
		if (!HAS_CITATION_RE.test(body)) {
			dropped += 1;
			continue;
		}
		kept += 1;
		lines.push(`${kept}. ${body.trimEnd()}`);
	}
	if (kept < MIN_KEPT_ENTRIES || dropped > MAX_DROPPED_ENTRIES) {
		return null;
	}
	return { dropped, text: lines.join("\n") };
}
