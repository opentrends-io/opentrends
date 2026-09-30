// Feeds without an article image often send the site's logo or icon, which
// makes a poor cover: a stretched wordmark says nothing about the story.
const LOGO_PATH_RE =
	/(?:^|\/)(?:logos?|icons?|favicons?)(?:\/|$)|(?:^|[/_-])(?:logo|favicon|apple-touch-icon|default[-_](?:share|og|social)?[-_]?image|placeholder)(?:[._-][\w-]*)?\.(?:png|jpe?g|gif|webp|svg|ico)$/i;

export function isLogoLikeImage(imageUrl: string): boolean {
	let path: string;
	try {
		path = decodeURIComponent(new URL(imageUrl).pathname);
	} catch {
		return false;
	}
	return LOGO_PATH_RE.test(path);
}
