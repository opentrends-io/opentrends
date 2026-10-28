// These representations change when translations land, independently of the
// source snapshot TTL. Keep their shared data cache, not an opaque HTTP copy.
const TRANSLATION_PAGE_PATH =
	/^\/api\/trends(?:\/[^/]+(?:\/sources\/[^/]+)?)?\/?$/;

export function isTranslationPagePath(pathname: string): boolean {
	return TRANSLATION_PAGE_PATH.test(pathname);
}

export const TRANSLATION_PAGE_CACHE_CONTROL = "no-store";
