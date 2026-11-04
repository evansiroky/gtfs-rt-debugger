# API: Config

The deployment settings the web app needs at runtime. Today that is only the analytics
measurement ID ([analytics](../behaviors/analytics.md)).

## Endpoint

`GET /api/v1/config` — no authentication, no query parameters
([conventions](conventions.md): an unknown query parameter is `400 bad_request`).

## Request

No parameters.

## Response

`200` with:

```
analytics: { measurementId: string } | null   // null when analytics is not configured
```

`measurementId` is a Google Analytics 4 measurement ID (`G-` followed by letters and digits) taken
verbatim from the deployment's configuration. It is public by nature (it appears in every page's
network traffic), unlike a feed URL. The response contains no other setting; in particular
nothing about feeds ([The server fetches](../principles.md#the-server-fetches-the-browser-never-talks-to-feed-hosts)).

## Notes

- Always available: it works while the server is dormant, never wakes it, and does not count as
  activity ([session](session.md)).
- Subject to the same rate limit and `Cache-Control: no-store` as every endpoint.

## Principles

**Inherited**

- [The server fetches](../principles.md#the-server-fetches-the-browser-never-talks-to-feed-hosts)
  — the only configuration that reaches the browser is a value that is already public.
