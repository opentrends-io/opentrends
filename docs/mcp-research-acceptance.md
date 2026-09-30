# MCP research: acceptance envelope

This batch enables a retained-history search followed by paginated article reading.

| Required behavior | Contract / implementation | Verification |
| --- | --- | --- |
| Search retained articles in a bounded time range, including old feed generations | `search` with date parameters → `/api/trends/search`; original title and description matching | Real MCP → Hono → SQLite D1 fixture, date boundaries, no matches, cursor pages |
| Read articles returned by history search | Existing `get_article(topic, sourceId, itemId)` accepts retained items in configured sources | Old-generation fixture, topic isolation |
| Continue beyond 12,000 characters without mixing versions or losing Unicode | Additive body columns, version-bound cursor; 12,000-character pages, 200,000-character extraction cap | Page reconstruction, stale cursor, concurrency, refresh/delete during fetch |
| Preserve existing consumers | Existing excerpt stays capped at 12,000; no-date search and existing tool names/required arguments/result fields remain | Server regression suite, workspace type checks, lint, server build |
| Deliver the live feature | Additive migration before Worker upload; binding comparison; switch traffic and call production MCP | Search by week, read all available pages, check cache and invalid input |

The same implementation owner covers schema, server API and MCP in one bounded vertical slice. This is an explicit exception to splitting three-layer packages: the additive columns permit one atomic version-checked row update, and the real D1-backed MCP fixture verifies both interfaces together.

Blockers: data loss/corruption, secret/private-content exposure, unauthorized writes, broken existing core behavior, unbounded queries/fetches/retries, or failure of the behaviors above. There is no additional user approval gate within the authorized feature and release.

Known limits: this searches retained feed records, not a complete web archive. Publication time is preferred; fetch time is explicitly labeled when publication time is unavailable. Each query covers at most 31 days. Search is substring matching, not semantic search or a full-body index. Paywalls, extraction failures and the HTML/text size caps remain explicit. Search is a live keyset-paginated view; a source editing an article may change later search results. Article cursors reject changed versions and require restarting.

Closure: targeted regressions during implementation; freeze candidate, then one full server suite/type/lint/build pass; merge, final gates, apply additive migration, deploy and verify production MCP. Any website UI work is a follow-up.
