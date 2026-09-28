import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { defaultTopicForLocale } from "@/lib/default-topic";
import { isLocale, resolveLocale } from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/")({
	loader: ({ params }) => {
		if (params.locale && !isLocale(params.locale)) {
			throw notFound();
		}
		// Permanent: the target depends only on the URL's locale, so search
		// engines can fold the root into the default topic page.
		throw redirect({
			statusCode: 301,
			to: "/{-$locale}/trends/$topic",
			params: {
				...params,
				topic: defaultTopicForLocale(resolveLocale(params.locale)),
			},
		});
	},
});
