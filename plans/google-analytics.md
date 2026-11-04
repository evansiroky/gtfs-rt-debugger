---
status: in-progress
depends: [server-core, web-shell]
specs:
  - specs/behaviors/analytics.md
  - specs/api/config.md
  - specs/behaviors/configuration.md
  - specs/architecture.md
issues: []
---

# Plan: Google Analytics

## Scope
In: an optional `GA_MEASUREMENT_ID` setting; `GET /api/v1/config`; the CSP additions while it is
set; the web app loading the Google tag and reporting page views by route template; passing the
setting through Terraform.

Out: a consent banner or Do-Not-Track handling (an operator decision per jurisdiction); custom
events; self-hosted or server-side collection; setting the actual measurement ID (a deployment
value, supplied by the operator).

## Implements
- `behaviors/analytics.md`: off by default; runtime ID discovery; page views only, with route
  templates and no query/fragment; CSP widened only while enabled.
- `api/config.md`: `GET /config` returning `analytics: { measurementId } | null`.
- `behaviors/configuration.md`: the `GA_MEASUREMENT_ID` setting and its validation.
- `architecture.md`: the CSP and third-party-origin carve-out.

## Approach
- `server/src/config.ts`: read `GA_MEASUREMENT_ID` (`/^G-[A-Z0-9]+$/`), expose `analyticsMeasurementId: string | null`.
- `server/src/http/security-headers.ts`: `contentSecurityPolicy(tileHost, analytics)` adds the Google
  tag and collection origins to `script-src`, `connect-src` and `img-src` only when `analytics` is true.
- `server/src/http/api.ts`: `GET /config` in the built-in routes, `rejectUnknownQuery([])`.
- `shared/src/api.ts`: `ConfigResponse`.
- `web/src/api/client.ts` + `web/src/analytics/`: fetch the config once on load; when it carries an ID,
  inject `gtag/js?id=…` and `gtag('config', id, { send_page_view: false, allow_google_signals: false,
  allow_ad_personalization_signals: false })`; a `PageViewTracker` inside the router sends `page_view` on
  mount and on each route-path change using the matched route's template.
- `infra`: `ga_measurement_id` variable (default `""`) → `GA_MEASUREMENT_ID` only when non-empty.
- Docs: `server/README.md`, `infra/README.md`.

## Validation
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `format:check` pass.
- [ ] With no ID: the CSP is byte-for-byte the previous policy, `GET /config` returns `analytics: null`,
      and the web app makes no request to a Google origin.
- [ ] With an ID: the CSP gains only the Google origins in the three directives; `GET /config` returns
      the ID; an invalid ID refuses startup without echoing the value.
- [ ] The web app sends `page_view` on load and on navigation, with `/trips/:tripId` rather than the trip
      ID, and no query string or fragment.
- [ ] A failing `/config` request leaves the app working and sends nothing.
- [ ] `terraform fmt -check` and `validate` pass (if terraform is available).

## Risks / unknowns
- **Consent** — enabling GA may need a consent mechanism in some jurisdictions; deliberately out of scope.
- **CSP origins** — the Google origin list follows Google's published CSP guidance for GA4 and may change.

## Notes
(Populated at closeout.)

## Follow-ups
(Populated at closeout.)
