import { describe, expect, test } from "bun:test";

import { isLogoLikeImage } from "../services/event-cover";

describe("isLogoLikeImage", () => {
	test("site logos and icons are not covers", () => {
		expect(
			isLogoLikeImage(
				"https://www.infoq.com/styles/static/images/logo/logo_bigger.jpg"
			)
		).toBe(true);
		expect(isLogoLikeImage("https://example.com/favicon.ico")).toBe(true);
		expect(
			isLogoLikeImage("https://example.com/apple-touch-icon-180.png")
		).toBe(true);
		expect(
			isLogoLikeImage("https://example.com/assets/default-share-image.png")
		).toBe(true);
	});

	test("article images are covers", () => {
		expect(
			isLogoLikeImage(
				"https://cdn.arstechnica.net/wp-content/uploads/2026/09/GettyImages-2291507729-1152x648.jpg"
			)
		).toBe(false);
		expect(
			isLogoLikeImage(
				"https://media.wired.com/photos/6870914c/master/pass/The%20Best%20Laptop%20Docking%20Stations.jpg"
			)
		).toBe(false);
		// "logo" inside an article slug is a story about a logo, not a site logo.
		expect(
			isLogoLikeImage(
				"https://www.engadget.com/img/gallery/google-new-logo-redesign/l-intro-1790.jpg"
			)
		).toBe(false);
	});
});
