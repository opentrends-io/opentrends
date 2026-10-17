// Sources with a hand-prepared mark in `public/logos/<sourceId>.svg`
// (transparent background, brand colours, square-ish). Any source not
// listed here falls back to its site favicon. The list is maintained by
// hand as marks are added.
export const LOGO_IDS: ReadonlySet<string> = new Set<string>([]);

export function logoSrc(sourceId: string): string | null {
	return LOGO_IDS.has(sourceId) ? `/logos/${sourceId}.svg` : null;
}
