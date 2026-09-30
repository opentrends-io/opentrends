interface FeedStatusInput {
	allSourcesHidden: boolean;
	failed: boolean;
	followedCount: number;
	isFollowed: boolean;
	pending: boolean;
	visibleCount: number;
}

export function feedStatus(input: FeedStatusInput) {
	if (input.isFollowed && input.followedCount === 0) {
		return "unfollowed";
	}
	if (input.visibleCount > 0) {
		return "content";
	}
	if (input.pending) {
		return "loading";
	}
	if (input.failed) {
		return "error";
	}
	return input.allSourcesHidden ? "hidden" : "empty";
}
