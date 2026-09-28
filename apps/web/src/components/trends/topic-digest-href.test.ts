import { expect, test } from "bun:test";

import { topicDigestHref } from "./topic-digest-href";

test("digest topic tags link to the canonical topic page", () => {
	expect(topicDigestHref("featured", "zh")).toBe("/zh/trends/featured");
	expect(topicDigestHref("ai", undefined)).toBe("/trends/ai");
	expect(topicDigestHref("ai/robotics", "zh")).toBe("/zh/trends/ai%2Frobotics");
});
