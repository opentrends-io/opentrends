import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { type Locale, localePathParam } from "@/lib/i18n";

import { digestDaysQueryOptions } from "./trends-query";

// The footer's line on a topic page: the last archived digest days, and a
// link to the whole archive. The day list comes from the query cache the
// route loader filled, on the server too.

const ARCHIVE_LINK_LIMIT = 7;

interface Strings {
	archive: string;
}

const EN: Strings = {
	archive: "Past digests",
};

const ZH: Strings = {
	archive: "往日摘要",
};

const ZH_HANT: Strings = {
	archive: "往日摘要",
};

const STRINGS: Partial<Record<Locale, Strings>> = {
	en: EN,
	zh: ZH,
	"zh-Hant": ZH_HANT,
};

function getStrings(locale: Locale): Strings {
	return STRINGS[locale] ?? EN;
}

export function TopicArchiveLinks({
	locale,
	topicId,
}: {
	locale: Locale;
	topicId: string;
}) {
	const strings = getStrings(locale);
	const days = useQuery(digestDaysQueryOptions(topicId, locale));
	const archiveDays = (days.data ?? []).slice(0, ARCHIVE_LINK_LIMIT);
	if (archiveDays.length === 0) {
		return null;
	}
	return (
		<p className="mt-3 text-[11px] text-[var(--text-muted)]">
			<Link
				className="transition-colors hover:text-[var(--text-primary)]"
				params={{ locale: localePathParam(locale), topic: topicId }}
				to="/{-$locale}/trends/$topic/archive"
			>
				{strings.archive}
			</Link>
			:{" "}
			{archiveDays.map((day, index) => (
				<span key={day}>
					<Link
						className="text-[var(--text-secondary)] tabular-nums transition-colors hover:text-[var(--text-primary)]"
						params={{ day, locale: localePathParam(locale), topic: topicId }}
						to="/{-$locale}/trends/$topic/$day"
					>
						{day}
					</Link>
					{index < archiveDays.length - 1 ? " · " : ""}
				</span>
			))}
		</p>
	);
}
