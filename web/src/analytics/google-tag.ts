import { matchPath } from 'react-router';

/** A Google Analytics 4 measurement ID; checked again here because it is put into a script URL. */
export const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

/**
 * The app's route templates (`app.tsx`). A page view reports the template a path matches, never
 * the identifier in it ([analytics](../../../specs/behaviors/analytics.md#details)); a path that
 * matches none (the not-found page) is reported as it is.
 */
const ROUTE_TEMPLATES = ['/', '/trips/:tripId'] as const;

export function routeTemplate(pathname: string): string {
  const match = ROUTE_TEMPLATES.find((path) => matchPath({ path, end: true }, pathname));
  return match ?? pathname;
}

/** What the app does with a loaded tag: report one page view. */
export interface GoogleTag {
  pageView(pathname: string, title: string): void;
}

type DataLayerWindow = Window & { dataLayer?: unknown[] };

const loadedTags = new Map<string, GoogleTag>();

/**
 * Loads the Google tag for `measurementId` once per page and returns the handle for reporting.
 * Automatic page views, Google signals and ad personalization are off; the app reports page views
 * itself so the reported location is the route template.
 */
export function loadGoogleTag(
  measurementId: string,
  win: DataLayerWindow = window,
  doc: Document = document,
): GoogleTag | null {
  if (!MEASUREMENT_ID_PATTERN.test(measurementId)) return null;
  const existing = loadedTags.get(measurementId);
  if (existing) return existing;

  const dataLayer = (win.dataLayer ??= []);
  // gtag.js reads the `arguments` object itself from the data layer, not an array of them.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = doc.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  doc.head.appendChild(script);

  const tag: GoogleTag = {
    pageView(pathname, title) {
      gtag('event', 'page_view', {
        page_location: `${win.location.origin}${routeTemplate(pathname)}`,
        page_title: title,
      });
    },
  };
  loadedTags.set(measurementId, tag);
  return tag;
}

/** Forgets loaded tags; for tests only. */
export function resetGoogleTagsForTests(): void {
  loadedTags.clear();
}
