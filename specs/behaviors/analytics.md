# Behavior: Analytics

## Rule

The deployment may enable Google Analytics 4 by configuring a measurement ID
([configuration](configuration.md#tunables-and-defaults)). When it is not configured — the
default — the app loads no analytics code, the browser makes no analytics request, and the
Content-Security-Policy allows no analytics origin. When it is configured, the web app reports
page views and nothing else.

## Applies To

Every route of the web app ([dashboard](../screens/dashboard.md),
[trip-detail](../screens/trip-detail.md), and the not-found page).

## Details

**Where the ID comes from.** The web app learns the measurement ID at runtime from
[`GET /config`](../api/config.md) on page load, so one image serves every deployment. If the
request fails, or answers with no ID, analytics stay off for that page load; the failure is not
shown to the user and does not affect any other request.

**What is sent.** Standard Google Analytics 4 collection through the Google tag, with
automatic page views turned off and the following reported by the app instead:

- one `page_view` when analytics starts, and one on every client-side navigation to a different
  route path;
- the page location as origin plus _route template_, with no query string and no fragment:
  `/` for the dashboard, `/trips/:tripId` for the trip screen (never the trip ID itself), and
  the literal path for the not-found page;
- the page title the app already sets.

Nothing else is sent: no custom events, no user or session identifiers of the app's own, and
nothing read from an API response (feed data, agency names, trip, route, vehicle or stop
IDs). Google's own standard collection (client ID cookie, user agent, approximate location, and
the like) is outside the app's control and is what the operator accepts by enabling the setting.
Google signals and ad personalization are turned off.

**Content-Security-Policy.** Only while a measurement ID is configured, the policy additionally
allows the Google tag script origin in `script-src`, and the Google Analytics collection origins
in `connect-src` and `img-src`. No other directive changes, and no inline script is ever
allowed. `Referrer-Policy` stays `no-referrer`.

**Not affected.** Analytics never delays or blocks rendering, never counts as client activity
([session](../api/session.md)), and does not change when the server goes dormant. Blocking the
analytics origins (an ad blocker, a network filter) silently disables it with no visible effect.

## Principles

**Inherited**

- [The server fetches](../principles.md#the-server-fetches-the-browser-never-talks-to-feed-hosts)
  — the analytics origins are the only third-party origins besides map tiles, and only when the
  operator opts in; no feed URL or credential is ever included in what is sent.
- [Forget by default](../principles.md#forget-by-default) — this server still stores nothing;
  data kept by Google Analytics is held by Google under the operator's account, not by this app.

**Local**

- **Measure visits, never feed content.** This is a debugger of one agency's feeds. When a
  reporting decision is in tension, send less: a page view with a route template beats a page
  view with an identifier lifted from feed data, and a missing measurement beats a leaked one.
