import { createHash } from "node:crypto";
import { translationText } from "@opentrends/api/translation-contract";

export const TRANSLATION_POLICY = 1;
export interface TranslationSubject {
	description?: string | null;
	itemId: string;
	lang: "zh" | "en";
	sourceId: string;
	subjectType: "source" | "event";
	title: string;
}

export function translationHash(item: {
	title: string;
	description?: string | null;
}): string {
	return createHash("sha256").update(translationText(item)).digest("hex");
}

export function translationJobId(subject: TranslationSubject): string {
	return createHash("sha256")
		.update(
			JSON.stringify([
				subject.subjectType,
				subject.sourceId,
				subject.itemId,
				subject.lang,
				translationHash(subject),
				TRANSLATION_POLICY,
			])
		)
		.digest("hex");
}
