import { decodeEntities } from "../adapters/shared";

// Invisible format characters (zero-width spaces and joiners, bidi marks,
// invisible operators, BOM). Some feeds pad titles with them, which changes
// both the embedding and the keywords of an otherwise ordinary title.
const FORMAT_CHARACTERS_RE = /\p{Cf}+/gu;
const WHITESPACE_RE = /\s+/g;

// The text an event is matched on: entities decoded ("Google&#8217;s" is
// "Google's"), invisible characters removed and whitespace collapsed.
export function normalizeEventText(value: string | null | undefined): string {
	if (!value) {
		return "";
	}
	return decodeEntities(value)
		.replace(FORMAT_CHARACTERS_RE, "")
		.replace(WHITESPACE_RE, " ")
		.trim();
}
