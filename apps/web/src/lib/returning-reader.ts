import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

// The landing page is for first visits. Once someone has opened a reading
// view, this cookie sends them from `/` straight to the feed, the way the
// root worked before the landing page existed. It is a plain flag with no
// identity in it, readable on both sides so client navigations agree with
// the server.
export const READER_COOKIE = "ot_reader";
const READER_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

export function hasReaderCookie(cookieHeader: string | undefined): boolean {
	if (!cookieHeader) {
		return false;
	}
	return cookieHeader
		.split(";")
		.some((part) => part.trim().split("=")[0] === READER_COOKIE);
}

export const isReturningReader = createIsomorphicFn()
	.server(() => hasReaderCookie(getRequestHeader("cookie")))
	.client(() => hasReaderCookie(document.cookie));

// Best effort: a browser without the Cookie Store API keeps seeing the
// landing page, which is only one click from the feed.
export function markReturningReader(): void {
	if (typeof cookieStore === "undefined") {
		return;
	}
	cookieStore
		.set({
			expires: Date.now() + READER_MAX_AGE_MS,
			name: READER_COOKIE,
			path: "/",
			sameSite: "lax",
			value: "1",
		})
		.catch(() => {
			// Cookies blocked: the landing page stays, nothing else depends on it.
		});
}
