import { sourceRole } from "../../server/src/trends/config/source-roles";
import { sourcePresets } from "../../server/src/trends/config/sources";
import { topicPresets } from "../../server/src/trends/config/topics";
import {
	type LandingSource,
	wallSources,
} from "../src/components/landing/landing-model";

// Build-time public catalog: a cold API or health check must not erase sources.
export function buildLandingCatalog() {
	const sources: LandingSource[] = Object.entries(sourcePresets).map(
		([sourceId, preset]) => ({
			sourceId,
			name: preset.name,
			homeUrl: preset.homeUrl,
			role: sourceRole(sourceId, preset.refresh),
			topics: Object.entries(topicPresets)
				.filter(([, topic]) =>
					topic.sections.some((section) =>
						(section.sourceIds as readonly string[]).includes(sourceId)
					)
				)
				.map(([topicId]) => topicId),
		})
	);
	return { sources, wall: wallSources(sources) };
}
