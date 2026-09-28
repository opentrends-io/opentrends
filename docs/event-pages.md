# Event pages

An event page is a permanent page for one story that several publishers
covered, at `/events/{slug}` (English) and `/zh/events/{slug}` (Chinese). Pages
are hand-picked: each targets one search phrase that has been checked for
volume and difficulty. Events themselves expire after seven days and are
re-clustered, so a page keeps its own snapshot of the reports and of the text
generated from them (KV, no expiry).

Nothing is public until it is published, and publishing refuses a draft that
fails the checks: at least three independent publishers, a timeline of at
least two entries citing only the page's own reports, about 600 words of prose
in English (900 characters in Chinese), at least three FAQ entries, and the
target phrase in the English title.

## Admin API

All admin calls need `Authorization: Bearer $EVENT_PAGES_ADMIN_TOKEN` (a worker
secret; without it the admin routes answer 503). The token is kept in
KeyKeeper; run calls through `keykeeper run` so it never appears in a shell
history or a log.

| Call | What it does |
|---|---|
| `GET /api/event-pages/admin/candidates` | Current events that three or more publishers reported and no page covers yet |
| `POST /api/event-pages/admin/pages` `{eventIds, keyword, slug}` | Generates (or regenerates) the draft; answers with the draft and its check |
| `GET /api/event-pages/admin/pages/:slug` | The page document (draft and published revisions) and the draft's check |
| `POST /api/event-pages/admin/pages/:slug/refresh` | Regenerates the draft from wherever the page's reports are clustered now, keeping every report it had |
| `POST /api/event-pages/admin/pages/:slug/publish` | Publishes the draft if it passes the checks (422 with the errors otherwise) |
| `DELETE /api/event-pages/admin/pages/:slug/published` | Takes the page down (404) and keeps the text as a draft |
| `DELETE /api/event-pages/admin/pages/:slug` | Deletes the page and its drafts |

Slugs are two to ten lowercase words joined by hyphens, subject then action
(`sony-umg-sue-suno-v6`), never a publisher's headline. Generation takes about a
minute.

## Workflow

1. Export candidates, have the target phrases checked (volume, difficulty),
   and choose the pages to make. Start with ten to twenty; wait for their
   indexing rate before making more.
2. Generate a draft with the chosen phrase and slug; read it. Check names,
   numbers and who did what against the reports it cites.
3. Publish. The page appears in `/sitemap-events.xml`, on `/events` and in its
   own related links. Submit it in Search Console by hand.
4. When the story moves, refresh and publish again; the page's modified date
   follows.

## Public reads

`GET /api/event-pages` lists published pages; `GET /api/event-pages/:slug`
returns one published page. Both are cached for five minutes.
