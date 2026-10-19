// A missing page must never be indexed, whatever its head says: the route
// that could not find its data still renders its title and canonical. The
// header covers every 404, including paths no route matches.
const NOT_FOUND_STATUSES = new Set([404, 410]);

export function withNotFoundRobots(response: Response): Response {
	if (
		!NOT_FOUND_STATUSES.has(response.status) ||
		response.headers.has("x-robots-tag")
	) {
		return response;
	}
	const headers = new Headers(response.headers);
	headers.set("x-robots-tag", "noindex");
	return new Response(response.body, {
		headers,
		status: response.status,
		statusText: response.statusText,
	});
}
