import { useEffect, useState } from "react";

// Once someone has opened a reading view, the landing page offers them a
// link back to the feed. The server never looks at this cookie: every
// visitor and every crawler gets the same page, and only the browser adds
// the link after hydration.
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

// False during server rendering and hydration, so the HTML matches.
export function useIsReturningReader(): boolean {
	const [returning, setReturning] = useState(false);
	useEffect(() => {
		setReturning(hasReaderCookie(document.cookie));
	}, []);
	return returning;
}

// Best effort: a browser without the Cookie Store API simply never gets
// the shortcut link.
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
			// Cookies blocked: nothing depends on it.
		});
}
