export default {
	fetch(request: Request): Response {
		const destination = new URL(request.url);
		if (destination.hostname !== "www.opentrends.io") {
			return new Response("Not found", { status: 404 });
		}
		destination.protocol = "https:";
		destination.host = "opentrends.io";
		destination.port = "";
		return Response.redirect(destination.href, 308);
	},
};
