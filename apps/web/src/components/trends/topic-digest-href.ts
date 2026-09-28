export function topicDigestHref(
	topicId: string,
	localeParam: string | undefined
): string {
	const prefix = localeParam ? `/${localeParam}` : "";
	return `${prefix}/trends/${encodeURIComponent(topicId)}`;
}
