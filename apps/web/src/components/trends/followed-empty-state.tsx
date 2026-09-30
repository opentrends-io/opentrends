import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { localePathParam, useLocale, useT } from "@/lib/i18n";

// Both views must offer the same way out when no sources are followed.
export function FollowedEmptyState() {
	const t = useT();
	const locale = useLocale();
	return (
		<section
			className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--surface-app)] px-6 py-20 text-center"
			role="status"
		>
			<Star aria-hidden className="size-6 text-[var(--text-muted)]" />
			<p className="max-w-sm text-[13px] text-[var(--text-secondary)]">
				{t("followed.empty")}
			</p>
			<Link
				className="text-[13px] text-[var(--accent-blue)] hover:underline"
				params={{ locale: localePathParam(locale), topic: "featured" }}
				to="/{-$locale}/trends/$topic"
			>
				{t("followed.browseFeatured")}
			</Link>
		</section>
	);
}
